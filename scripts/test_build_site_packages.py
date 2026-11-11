"""Offline geometry self-checks: python3 scripts/test_build_site_packages.py"""
import json
import sys
from tempfile import TemporaryDirectory
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_site_packages import (  # noqa: E402
    LANDCOVER_TAGS, clip_polyline, clip_ring, join_outer_rings, parse_osm_context,
    parse_osm_landcover, polygon_area, unproject,
)

EXTENT = (0.0, 0.0, 10.0, 10.0)

# Fully inside: unchanged.
assert clip_polyline([(1, 1), (5, 5), (9, 1)], EXTENT) == [[(1, 1), (5, 5), (9, 1)]]
# Crossing the east edge: cut at x = 10.
assert clip_polyline([(5, 5), (15, 5)], EXTENT) == [[(5.0, 5.0), (10.0, 5.0)]]
# Leaves and re-enters: two runs.
runs = clip_polyline([(2, 5), (12, 5), (12, 8), (2, 8)], EXTENT)
assert runs == [[(2.0, 5.0), (10.0, 5.0)], [(10.0, 8.0), (2.0, 8.0)]], runs
# Entirely outside: nothing.
assert clip_polyline([(20, 20), (30, 30)], EXTENT) == []
print("clip_polyline: ok")

inside = [(1, 1), (9, 1), (9, 9), (1, 9)]
assert clip_ring(inside, EXTENT) == inside
assert clip_ring([(5, 1), (15, 1), (15, 9), (5, 9)], EXTENT) == [
    (5, 1), (10, 1), (10, 9), (5, 9),
]
assert clip_ring([(20, 20), (30, 20), (30, 30)], EXTENT) == []
assert clip_ring([(-5, -5), (15, -5), (15, 15), (-5, 15)], EXTENT)
assert polygon_area(clip_ring([(-5, -5), (15, -5), (15, 15), (-5, 15)], EXTENT)) == 100
assert clip_ring([(10, 1), (15, 1), (15, 9), (10, 9)], EXTENT) == []
print("clip_ring: ok")

# The second member runs backwards; input order/direction must not matter.
for ways in ([['1', '2', '3'], ['1', '4', '3']],
             [['1', '4', '3'], ['1', '2', '3']]):
    rings = join_outer_rings(ways)
    assert len(rings) == 1 and rings[0][0] == rings[0][-1]
    assert set(rings[0]) == {'1', '2', '3', '4'}
assert join_outer_rings([['1', '2'], ['3', '4']]) == []
assert len(join_outer_rings([['1', '2', '3', '1'], ['4', '5', '6', '4']])) == 2
print("join_outer_rings: ok")

# Full parser fixture: all tags, reversed members, ignored holes, missing nodes,
# unclosed/outside/tiny ways, and a relation whose outer is absent from the cache.
origin = (59.9, 10.7)
points = [(1, 1), (9, 1), (9, 9), (1, 9), (2, 2), (3, 2), (3, 3),
          (20, 20), (30, 20), (30, 30)]
nodes = []
for index, (x, y) in enumerate(points, 1):
    lat, lon = unproject(x, y, *origin)
    nodes.append(f'<node id="{index}" lat="{lat}" lon="{lon}"/>')


def way_xml(identifier, refs, tags=''):
    return f'<way id="{identifier}">' + ''.join(f'<nd ref="{ref}"/>' for ref in refs) + tags + '</way>'


tagged = []
expected = {}
for kind, tags in LANDCOVER_TAGS.items():
    for key, value in tags:
        identifier = str(100 + len(tagged))
        tagged.append(way_xml(identifier, [1, 4, 3, 2, 1], f'<tag k="{key}" v="{value}"/>'))
        expected[f'way/{identifier}'] = kind
park = '<tag k="leisure" v="park"/>'
extras = [way_xml('a', [1, 2, 3]), way_xml('b', [1, 4, 3]),
          way_xml('hole', [5, 6, 7, 5]),
          way_xml('open', [1, 2, 3], park), way_xml('missing', [1, 2, 99, 1], park),
          way_xml('tiny', [5, 6, 7, 5], park), way_xml('outside', [8, 9, 10, 8], park),
          way_xml('untagged', [1, 2, 3, 4, 1])]
relation = ('<relation id="20"><member type="way" ref="a" role="outer"/>'
            '<member type="way" ref="b" role="outer"/>'
            '<member type="way" ref="hole" role="inner"/>'
            '<tag k="type" v="multipolygon"/>' + park + '</relation>')
incomplete = relation.replace('id="20"', 'id="21"').replace('ref="b"', 'ref="absent"')
with TemporaryDirectory() as directory:
    path = Path(directory) / 'fixture.osm'
    path.write_text('<osm>' + ''.join(nodes + tagged + extras) + relation + incomplete + '</osm>')
    areas = parse_osm_landcover(path, origin, EXTENT)
expected['relation/20'] = 'park'
assert {area['id']: area['kind'] for area in areas} == expected
assert [area['id'] for area in areas] == sorted(expected)
for area in areas:
    ring = area['ring']
    assert ring[0] != ring[-1] and len(ring) >= 3
    assert abs(polygon_area(ring) - 64) < 1e-6
    assert sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1])) > 0
print("parse_osm_landcover: ok")

# The shipped packages must match the cached extracts. A multipolygon whose outer ring runs
# outside the bbox extract needs its missing member ways, or the whole polygon is dropped.
RAW = Path(__file__).parent.parent / "data" / "raw"
PUBLIC = Path(__file__).parent.parent / "public" / "sites"
EXPECTED = {
    "compact-infill": {"roads": 137, "trees": 128, "areas": {"grass": 8, "park": 1, "water": 1}},
    "sloped-edge": {"roads": 33, "trees": 122, "areas": {"grass": 1, "wood": 2, "park": 1}},
}
for site_id, expected in EXPECTED.items():
    manifest = json.loads((PUBLIC / site_id / "manifest.json").read_text())
    terrain = json.loads((PUBLIC / site_id / "terrain.json").read_text())
    origin = (manifest["crs"]["originLatitude"], manifest["crs"]["originLongitude"])
    extent = (terrain["minX"], terrain["minY"], terrain["maxX"], terrain["maxY"])
    extra = RAW / f"{site_id}-ways.xml"
    roads, trees = parse_osm_context(RAW / f"{site_id}.osm", origin, extent)
    areas = parse_osm_landcover(
        RAW / f"{site_id}.osm", origin, extent, extra if extra.exists() else None
    )
    assert len(roads) == expected["roads"], (site_id, "roads", len(roads))
    assert len(trees) == expected["trees"], (site_id, "trees", len(trees))
    kinds = {}
    for area in areas:
        kinds[area["kind"]] = kinds.get(area["kind"], 0) + 1
    assert kinds == expected["areas"], (site_id, "areas", kinds)
print("shipped packages match the cached extracts: ok")
