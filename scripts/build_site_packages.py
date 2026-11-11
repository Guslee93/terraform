#!/usr/bin/env python3
"""Build the two static Terraform site packages from openly licensed sources.

Sources:
  - Building footprints: OpenStreetMap, ODbL 1.0 (© OpenStreetMap contributors)
  - Terrain elevations: Kartverket DTM1 via ws.geonorge.no, CC BY 4.0 (© Kartverket)

The output is a simplified, offline package for an illustrative architectural study.
It is not a cadastral parcel, survey, or planning dataset.

Usage:
  python3 scripts/build_site_packages.py
  python3 scripts/build_site_packages.py --offline   # reuse cached raw responses
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import ssl
import urllib.parse
import urllib.request
import datetime
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    import certifi

    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PUBLIC = ROOT / "public" / "sites"

USER_AGENT = "TerraformPortfolio/0.1 (architectural study; local demo)"
ELEVATION_ENDPOINT = "https://ws.geonorge.no/hoydedata/v1/punkt"

SITES = {
    "compact-infill": {
        "title": "Compact Infill",
        "subtitle": "Dense Oslo block · strong shadow study",
        "morphology": "Urban infill",
        "description": (
            "A tight urban study area surrounded by mature apartment blocks. The simplified "
            "context is derived from OpenStreetMap footprints and the terrain from Kartverket DTM1."
        ),
        "bbox": (59.9220, 10.7560, 59.9250, 10.7600),  # south, west, north, east
        "boundary": (190.0, 240.0),
        "center": (0.0, 0.0),
        "max_height": 18.0,
        "setback": 4.0,
        "target_z": 8.0,
    },
    "sloped-edge": {
        "title": "Sloped Edge",
        "subtitle": "Topography · stepped massing",
        "morphology": "Landscape edge",
        "description": (
            "A study area at Oslo's edge where the ground falls away. Context footprints come "
            "from OpenStreetMap and the relief from Kartverket DTM1."
        ),
        "bbox": (59.8965, 10.7715, 59.9000, 10.7760),
        "boundary": (230.0, 310.0),
        "center": (0.0, 0.0),
        "max_height": 15.0,
        "setback": 3.0,
        "target_z": 10.0,
    },
}

GRID_SIZE = 13
# A mapped tree row carries a tree every 8 m, the same spacing the import path uses.
TREE_ROW_SPACING_M = 8.0
# The study area is small; the context around it is not. A halo of open ground and blocks makes
# the site read as part of a city rather than a model on a table.
CONTEXT_HALO_M = 200.0
# Terrain sample spacing. The grid grows with the extent so the relief resolution stays put.
TERRAIN_SPACING_M = 16.0
# The package parser rejects a footprint with more points than this.
MAX_FOOTPRINT_VERTICES = 200
# The smallest building worth drawing. Below this an outline is a shed or a mapped mistake.
MIN_BUILDING_AREA_M2 = 12.0
# A ceiling on context buildings, so a dense extract cannot grow the package without bound.
# The largest are kept: a dropped small building is less visible than a dropped large one.
MAX_CONTEXT_BUILDINGS = 900


def expanded_bbox(site: dict) -> tuple[float, float, float, float]:
    """The data bbox: the study bbox plus the context halo, in degrees (south, west, north, east)."""
    south, west, north, east = site["bbox"]
    lat_m, lon_m = metres_per_degree((south + north) / 2)
    return (
        south - CONTEXT_HALO_M / lat_m,
        west - CONTEXT_HALO_M / lon_m,
        north + CONTEXT_HALO_M / lat_m,
        east + CONTEXT_HALO_M / lon_m,
    )


def metres_per_degree(latitude: float) -> tuple[float, float]:
    phi = math.radians(latitude)
    lat = 111132.92 - 559.82 * math.cos(2 * phi) + 1.175 * math.cos(4 * phi)
    lon = 111412.84 * math.cos(phi) - 93.5 * math.cos(3 * phi) + 0.118 * math.cos(5 * phi)
    return lat, lon


def project(lat: float, lon: float, origin_lat: float, origin_lon: float) -> tuple[float, float]:
    lat_m, lon_m = metres_per_degree(origin_lat)
    return ((lon - origin_lon) * lon_m, (lat - origin_lat) * lat_m)


def unproject(x: float, y: float, origin_lat: float, origin_lon: float) -> tuple[float, float]:
    lat_m, lon_m = metres_per_degree(origin_lat)
    return (origin_lat + y / lat_m, origin_lon + x / lon_m)


def polygon_area(points: list[tuple[float, float]]) -> float:
    total = 0.0
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def perpendicular_distance(point, start, end) -> float:
    px, py = point
    ax, ay = start
    bx, by = end
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    return abs(dy * px - dx * py + bx * ay - by * ax) / math.hypot(dx, dy)


def simplify(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    if len(points) <= 4:
        return points
    start, end = points[0], points[-1]
    index, distance = 0, 0.0
    for i in range(1, len(points) - 1):
        candidate = perpendicular_distance(points[i], start, end)
        if candidate > distance:
            index, distance = i, candidate
    if distance <= tolerance:
        return [start, end]
    left = simplify(points[: index + 1], tolerance)
    right = simplify(points[index:], tolerance)
    return left[:-1] + right


def _orientation(a, b, c) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def is_simple_ring(points: list[tuple[float, float]]) -> bool:
    """Reject duplicate vertices and properly crossing non-adjacent edges."""
    count = len(points)
    if count < 3:
        return False
    for index, point in enumerate(points):
        if points[(index + 1) % count] == point:
            return False
    for i in range(count):
        a, b = points[i], points[(i + 1) % count]
        for j in range(i + 1, count):
            if j == i or (j + 1) % count == i or (i + 1) % count == j:
                continue
            c, d = points[j], points[(j + 1) % count]
            o1, o2 = _orientation(a, b, c), _orientation(a, b, d)
            o3, o4 = _orientation(c, d, a), _orientation(c, d, b)
            if ((o1 > 0 > o2) or (o1 < 0 < o2)) and ((o3 > 0 > o4) or (o3 < 0 < o4)):
                return False
    return True


def repair_ring(
    points: list[tuple[float, float]], min_area: float = 25.0
) -> list[tuple[float, float]] | None:
    """A simple ring of at least `min_area`, or None when the outline cannot be made one."""
    original = points[:]
    candidates = [original]
    for tolerance in (1.2, 0.6, 0.3):
        simplified = simplify(original + [original[0]], tolerance)[:-1]
        if len(simplified) >= 3:
            candidates.append(simplified)
    for candidate in candidates:
        if len(candidate) >= 3 and polygon_area(candidate) >= min_area and is_simple_ring(candidate):
            return candidate
    return None


def cap_vertices(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Simplify an outline until it fits the package's vertex limit.

    The package parser rejects a footprint with more than MAX_FOOTPRINT_VERTICES points, so a
    complex outline is coarsened rather than dropped.
    """
    out = points
    tolerance = 0.6
    while len(out) > MAX_FOOTPRINT_VERTICES and tolerance <= 40:
        out = simplify(points + [points[0]], tolerance)[:-1]
        tolerance *= 2
    return out if len(out) >= 3 else points


def parse_osm(path: Path, origin: tuple[float, float]) -> list[dict]:
    root = ET.parse(path).getroot()
    nodes = {
        node.get("id"): (float(node.get("lat")), float(node.get("lon")))
        for node in root.findall("node")
    }
    buildings: list[dict] = []
    for way in root.findall("way"):
        tags = {tag.get("k"): tag.get("v") for tag in way.findall("tag")}
        if "building" not in tags:
            continue
        coordinates = []
        for ref in way.findall("nd"):
            node = nodes.get(ref.get("ref"))
            if node:
                coordinates.append(project(node[0], node[1], origin[0], origin[1]))
        if len(coordinates) < 3:
            continue
        if coordinates[0] == coordinates[-1]:
            coordinates = coordinates[:-1]
        repaired = repair_ring(coordinates, min_area=MIN_BUILDING_AREA_M2)
        if repaired is None:
            reason = (
                f"area below {MIN_BUILDING_AREA_M2:.0f} m²"
                if is_simple_ring(coordinates)
                else "outline crosses itself"
            )
            print(f"  skipped building way {way.get('id')} ({reason})")
            continue
        coordinates = cap_vertices(repaired)
        buildings.append({"id": way.get("id"), "tags": tags, "footprint": coordinates})
    return buildings


# Illustrative carriageway widths (m) by OSM highway class; the data has no measured widths.
ROAD_WIDTHS = {
    "motorway": 14.0, "trunk": 12.0, "primary": 12.0, "secondary": 10.0, "tertiary": 8.0,
    "residential": 6.0, "unclassified": 6.0, "living_street": 5.0, "service": 4.0,
    "pedestrian": 5.0, "footway": 2.5, "path": 2.0, "cycleway": 2.5, "steps": 2.0,
    "track": 3.0,
}


def clip_segment(a, b, extent):
    """Liang–Barsky clip of segment a→b to extent (min_x, min_y, max_x, max_y); None if outside."""
    min_x, min_y, max_x, max_y = extent
    dx, dy = b[0] - a[0], b[1] - a[1]
    t0, t1 = 0.0, 1.0
    for p, q in ((-dx, a[0] - min_x), (dx, max_x - a[0]), (-dy, a[1] - min_y), (dy, max_y - a[1])):
        if p == 0:
            if q < 0:
                return None
            continue
        t = q / p
        if p < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
        if t0 > t1:
            return None
    return (a[0] + dx * t0, a[1] + dy * t0), (a[0] + dx * t1, a[1] + dy * t1)


def clip_polyline(points, extent):
    """Split a polyline into the runs that lie inside the extent."""
    runs, current = [], []
    for a, b in zip(points, points[1:]):
        clipped = clip_segment(a, b, extent)
        if clipped is None:
            if len(current) >= 2:
                runs.append(current)
            current = []
            continue
        start, end = clipped
        if current and math.dist(current[-1], start) < 1e-6:
            current.append(end)
        else:
            if len(current) >= 2:
                runs.append(current)
            current = [start, end]
        if end != b:  # left the extent mid-segment
            runs.append(current)
            current = []
    if len(current) >= 2:
        runs.append(current)
    return runs


def resample_row(points: list[tuple[float, float]], spacing: float) -> list[tuple[float, float]]:
    """Points every `spacing` metres along a polyline, so a mapped tree row reads as trees."""
    out: list[tuple[float, float]] = []
    for index in range(1, len(points)):
        ax, ay = points[index - 1]
        bx, by = points[index]
        length = math.hypot(bx - ax, by - ay)
        if length <= 0:
            continue
        steps = max(1, int(round(length / spacing)))
        for step in range(steps):
            t = step / steps
            out.append((ax + (bx - ax) * t, ay + (by - ay) * t))
    if points:
        out.append(points[-1])
    return out


def parse_osm_context(path: Path, origin: tuple[float, float], extent) -> tuple[list[dict], list[list[float]]]:
    """Road centrelines (clipped to the extent) and tree points from the cached OSM extract."""
    root = ET.parse(path).getroot()
    nodes = {}
    trees = []
    min_x, min_y, max_x, max_y = extent
    for node in root.findall("node"):
        point = project(float(node.get("lat")), float(node.get("lon")), origin[0], origin[1])
        nodes[node.get("id")] = point
        tags = {tag.get("k"): tag.get("v") for tag in node.findall("tag")}
        if tags.get("natural") == "tree" and min_x <= point[0] <= max_x and min_y <= point[1] <= max_y:
            trees.append([round(point[0], 2), round(point[1], 2)])
    roads = []
    for way in root.findall("way"):
        tags = {tag.get("k"): tag.get("v") for tag in way.findall("tag")}
        width = ROAD_WIDTHS.get(tags.get("highway", ""))
        # Tunnels are underground and area-tagged ways are plazas, not centrelines.
        # A building passage is a covered public street, so it is kept.
        if (
            width is None
            or tags.get("tunnel") not in (None, "no", "building_passage")
            or tags.get("area") == "yes"
        ):
            continue
        # A node missing from the extract must not create an invented straight edge across
        # the gap: the way is split there instead of joining the node before to the node after.
        segments: list[list[tuple[float, float]]] = [[]]
        for ref in way.findall("nd"):
            key = ref.get("ref")
            if key not in nodes:
                segments.append([])
                continue
            segments[-1].append(nodes[key])
        index = 0
        for segment in segments:
            if len(segment) < 2:
                continue
            for run in clip_polyline(segment, extent):
                roads.append(
                    {
                        "id": f"{way.get('id')}-{index}",
                        "highway": tags["highway"],
                        "width": width,
                        "centreline": [[round(x, 2), round(y, 2)] for x, y in run],
                    }
                )
                index += 1
    # A mapped tree row is a line of trees, not a line: place a tree every TREE_ROW_SPACING_M
    # along it, the way the import path reads `natural=tree_row`.
    for way in root.findall("way"):
        tags = {tag.get("k"): tag.get("v") for tag in way.findall("tag")}
        if tags.get("natural") != "tree_row":
            continue
        segments: list[list[tuple[float, float]]] = [[]]
        for ref in way.findall("nd"):
            key = ref.get("ref")
            if key not in nodes:
                segments.append([])
                continue
            segments[-1].append(nodes[key])
        for segment in segments:
            if len(segment) < 2:
                continue
            for run in clip_polyline(segment, extent):
                for x, y in resample_row(run, TREE_ROW_SPACING_M):
                    trees.append([round(x, 2), round(y, 2)])
    roads.sort(key=lambda road: road["id"])
    # One tree, one point: a tree that is both a node and part of a row is not two trees.
    unique: list[list[float]] = []
    seen: set[tuple[float, float]] = set()
    for tree in sorted(trees):
        key = (tree[0], tree[1])
        if key in seen:
            continue
        seen.add(key)
        unique.append(tree)
    return roads, unique


LANDCOVER_TAGS = {
    "water": (("natural", "water"), ("waterway", "riverbank"), ("landuse", "reservoir"), ("landuse", "basin")),
    "wetland": (("natural", "wetland"), ("landuse", "wetland")),
    "bare": (("natural", "bare_rock"), ("natural", "sand"), ("natural", "scree"), ("natural", "shingle")),
    "wood": (("natural", "wood"), ("landuse", "forest")),
    "scrub": (("natural", "scrub"), ("natural", "heath"), ("landuse", "scrub")),
    "cemetery": (("landuse", "cemetery"), ("landuse", "grave_yard")),
    "pitch": (("leisure", "pitch"), ("leisure", "playground"), ("leisure", "sports_centre"), ("leisure", "stadium")),
    "field": (("landuse", "allotments"), ("landuse", "orchard"), ("landuse", "vineyard"), ("landuse", "farmland"), ("landuse", "farmyard")),
    "park": (
        ("leisure", "park"), ("leisure", "garden"), ("landuse", "recreation_ground"),
        ("landuse", "village_green"),
    ),
    "grass": (("landuse", "grass"), ("landuse", "meadow"), ("natural", "grassland"), ("landuse", "flowerbed")),
}

# When one feature carries several land-cover tags the first match wins. The order is named
# explicitly so the outcome is a stated rule and not an accident of dictionary order.
LANDCOVER_PRIORITY: tuple[str, ...] = (
    "water", "wetland", "bare", "wood", "scrub", "cemetery", "pitch", "field", "park", "grass",
)

# Waterways mapped as lines rather than as banks. Widths are illustrative, like the road widths.
WATERWAY_WIDTHS = {"river": 10.0, "canal": 6.0, "stream": 4.0}


def landcover_kind(tags: dict[str, str]) -> str | None:
    """The land cover kind for a tag set, or None when it carries no land cover tag."""
    for kind in LANDCOVER_PRIORITY:
        if any(tags.get(key) == value for key, value in LANDCOVER_TAGS[kind]):
            return kind
    return None


def clip_ring(points, extent):
    """Sutherland–Hodgman clip to (min_x, min_y, max_x, max_y); return an open ring."""
    ring = list(points)
    if ring and ring[0] == ring[-1]:
        ring.pop()
    for axis, boundary, direction in (
        (0, extent[0], 1), (0, extent[2], -1),
        (1, extent[1], 1), (1, extent[3], -1),
    ):
        if not ring:
            break
        clipped = []
        previous = ring[-1]
        previous_inside = direction * (previous[axis] - boundary) >= 0
        for current in ring:
            current_inside = direction * (current[axis] - boundary) >= 0
            if current_inside != previous_inside:
                fraction = (boundary - previous[axis]) / (current[axis] - previous[axis])
                other = 1 - axis
                point = [0.0, 0.0]
                point[axis] = boundary
                point[other] = previous[other] + fraction * (current[other] - previous[other])
                clipped.append(tuple(point))
            if current_inside:
                clipped.append(current)
            previous, previous_inside = current, current_inside
        ring = []
        for point in clipped:
            if not ring or point != ring[-1]:
                ring.append(point)
        if len(ring) > 1 and ring[0] == ring[-1]:
            ring.pop()
    return ring if len(ring) >= 3 else []


def join_outer_rings(ways: list[list[str]]) -> list[list[str]]:
    """Join member node refs at either end, reversing ways as needed; discard open chains."""
    remaining = [list(way) for way in ways if len(way) >= 2]
    rings = []
    while remaining:
        chain = remaining.pop(0)
        while chain[0] != chain[-1]:
            for index, way in enumerate(remaining):
                if chain[-1] == way[0]:
                    chain.extend(way[1:])
                elif chain[-1] == way[-1]:
                    chain.extend(way[-2::-1])
                elif chain[0] == way[-1]:
                    chain = way[:-1] + chain
                elif chain[0] == way[0]:
                    chain = way[:0:-1] + chain
                else:
                    continue
                remaining.pop(index)
                break
            else:
                break
        if len(chain) >= 4 and chain[0] == chain[-1]:
            rings.append(chain)
    return rings


def line_to_ribbon(points: list[tuple[float, float]], width: float) -> list[tuple[float, float]]:
    """Turn a polyline into a closed ribbon polygon of the given width."""
    if len(points) < 2:
        return []
    half = width / 2
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index, (x, y) in enumerate(points):
        before = points[index - 1] if index > 0 else points[0]
        after = points[index + 1] if index + 1 < len(points) else points[-1]
        dx, dy = after[0] - before[0], after[1] - before[1]
        length = math.hypot(dx, dy)
        if length < 1e-9:
            dx, dy, length = 1.0, 0.0, 1.0
        nx, ny = -dy / length * half, dx / length * half
        left.append((x + nx, y + ny))
        right.append((x - nx, y - ny))
    return left + right[::-1]


def load_osm_documents(path: Path, extra_path: Path | None = None) -> list[ET.Element]:
    """The roots of an OSM document and, optionally, a supplement of ways it does not contain."""
    roots = [ET.parse(path).getroot()]
    if extra_path is not None and extra_path.exists():
        roots.append(ET.parse(extra_path).getroot())
    return roots


def parse_osm_landcover(
    path: Path,
    origin: tuple[float, float],
    extent,
    extra_path: Path | None = None,
    drops: list[dict] | None = None,
) -> list[dict]:
    """Illustrative ground tints from closed OSM ways, multipolygon outer rings and waterway lines.

    `extra_path` is a cached supplement of ways the bbox extract does not contain, so a
    multipolygon whose outer ring runs outside the extract can still be closed. `drops`, when
    given, collects one record per candidate feature that did not become an area.
    """
    roots = load_osm_documents(path, extra_path)
    nodes: dict[str, tuple[float, float]] = {}
    ways: dict[str, list[str]] = {}
    for root in roots:
        for node in root.findall("node"):
            nodes.setdefault(
                node.get("id"), project(float(node.get("lat")), float(node.get("lon")), *origin)
            )
        for way in root.findall("way"):
            ways.setdefault(way.get("id"), [ref.get("ref") for ref in way.findall("nd")])

    def drop(identifier: str, kind: str, reason: str) -> None:
        if drops is not None:
            drops.append({"id": identifier, "kind": kind, "reason": reason})

    areas = []
    for root in roots:
        for element in [*root.findall("way"), *root.findall("relation")]:
            tags = {tag.get("k"): tag.get("v") for tag in element.findall("tag")}
            identifier = f"{element.tag}/{element.get('id')}"
            waterway = tags.get("waterway") if tags.get("waterway") in WATERWAY_WIDTHS else None
            kind = "water" if waterway else landcover_kind(tags)
            if kind is None:
                continue
            if element.tag == "way" and waterway:
                # A river or stream mapped as a line becomes an illustrative ribbon.
                refs = ways[element.get("id")]
                if any(ref not in nodes for ref in refs):
                    drop(identifier, kind, "line references nodes missing from the extract")
                    continue
                points = [nodes[ref] for ref in refs]
                ribbon = clip_ring(
                    line_to_ribbon(points, WATERWAY_WIDTHS[waterway]), extent
                )
                if len(ribbon) < 3 or polygon_area(ribbon) < 4.0:
                    drop(identifier, kind, "clipped ribbon below 4 m²")
                    continue
                signed = sum(a[0] * b[1] - b[0] * a[1]
                             for a, b in zip(ribbon, ribbon[1:] + ribbon[:1]))
                if signed < 0:
                    ribbon.reverse()
                areas.append({
                    "id": identifier,
                    "kind": kind,
                    "ring": [[round(x, 2), round(y, 2)] for x, y in ribbon],
                })
                continue
            if element.tag == "way":
                refs = ways[element.get("id")]
                rings = [refs] if len(refs) >= 4 and refs[0] == refs[-1] else []
                if not rings:
                    drop(identifier, kind, "way is not a closed ring")
                    continue
            elif tags.get("type") == "multipolygon":
                member_refs = [
                    member.get("ref")
                    for member in element.findall("member")
                    if member.get("type") == "way" and member.get("role") == "outer"
                ]
                absent = [ref for ref in member_refs if ref not in ways]
                rings = join_outer_rings([ways[ref] for ref in member_refs if ref in ways])
                if not rings:
                    detail = f", missing member way {', '.join(absent)}" if absent else ""
                    drop(identifier, kind, f"outer ring could not be closed{detail}")
                    continue
            else:
                drop(identifier, kind, f"relation type {tags.get('type')!r} is not a multipolygon")
                continue
            for refs in rings:
                # Missing nodes must not create an invented edge across an incomplete extract.
                if any(ref not in nodes for ref in refs):
                    drop(identifier, kind, "ring references nodes missing from the extract")
                    continue
                ring = clip_ring([nodes[ref] for ref in refs[:-1]], extent)
                if len(ring) < 3:
                    drop(identifier, kind, "clipped away entirely")
                    continue
                if polygon_area(ring) < 4.0:
                    drop(identifier, kind, "clipped area below 4 m²")
                    continue
                ring = simplify(ring + [ring[0]], 0.5)[:-1]
                if len(ring) < 3 or polygon_area(ring) < 4.0:
                    drop(identifier, kind, "area below 4 m² after simplification")
                    continue
                signed_area = sum(a[0] * b[1] - b[0] * a[1]
                                  for a, b in zip(ring, ring[1:] + ring[:1]))
                if signed_area < 0:
                    ring.reverse()
                areas.append({
                    "id": identifier,
                    "kind": kind,
                    "ring": [[x, y] for x, y in ring],
                })
    areas.sort(key=lambda area: area["id"])
    return areas


def missing_outer_way_ids(path: Path) -> list[str]:
    """Outer member ways of land cover multipolygons that the extract does not contain."""
    root = ET.parse(path).getroot()
    present = {way.get("id") for way in root.findall("way")}
    missing: set[str] = set()
    for element in root.findall("relation"):
        tags = {tag.get("k"): tag.get("v") for tag in element.findall("tag")}
        if landcover_kind(tags) is None or tags.get("type") != "multipolygon":
            continue
        for member in element.findall("member"):
            if member.get("type") == "way" and member.get("role") == "outer":
                ref = member.get("ref")
                if ref not in present:
                    missing.add(ref)
    return sorted(missing)


def download_osm_ways(way_ids: list[str], cache_path: Path) -> None:
    """Fetch the given OSM ways with their nodes and cache them as one XML document."""
    merged = ET.Element("osm", {"version": "0.6", "generator": "TerraformPortfolio"})
    seen_nodes: set[str] = set()
    seen_ways: set[str] = set()
    for way_id in way_ids:
        url = f"https://api.openstreetmap.org/api/0.6/way/{way_id}/full"
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=120, context=SSL_CONTEXT) as response:
            document = ET.fromstring(response.read())
        for node in document.findall("node"):
            if node.get("id") in seen_nodes:
                continue
            seen_nodes.add(node.get("id"))
            merged.append(node)
        for way in document.findall("way"):
            if way.get("id") in seen_ways:
                continue
            seen_ways.add(way.get("id"))
            merged.append(way)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_bytes(ET.tostring(merged, encoding="utf-8", xml_declaration=True))


SHA256SUMS = RAW / "SHA256SUMS"


def verify_cache_checksums() -> None:
    """Verify every cached raw file against SHA256SUMS before offline use.

    Raises RuntimeError naming the first missing or mismatched file so the
    pipeline can never silently rebuild from corrupted caches.
    """
    if not SHA256SUMS.exists():
        raise RuntimeError(f"Missing checksum file: {SHA256SUMS}")
    expected: dict[str, str] = {}
    for line in SHA256SUMS.read_text().splitlines():
        parts = line.split()
        if len(parts) != 2:
            continue
        digest, name = parts
        expected[name] = digest
    missing = [name for name in expected if not (RAW / name).exists()]
    if missing:
        raise RuntimeError(f"Missing cached raw file(s): {', '.join(missing)}")
    for name, digest in expected.items():
        actual = hashlib.sha256((RAW / name).read_bytes()).hexdigest()
        if actual != digest:
            raise RuntimeError(
                f"Checksum mismatch for {RAW / name}: expected {digest}, got {actual}"
            )


def fetch_elevations(points: list[tuple[float, float]], cache_path: Path, offline: bool):
    if cache_path.exists():
        cached = json.loads(cache_path.read_text())
        if cached.get("points") == [list(point) for point in points] and len(
            cached.get("heights", [])
        ) == len(points):
            return cached["heights"]

    if offline:
        raise RuntimeError(f"Missing elevation cache: {cache_path}")

    heights: list[float] = []
    for start in range(0, len(points), 49):
        batch = points[start : start + 49]
        payload = json.dumps(batch, separators=(",", ":"))
        url = f"{ELEVATION_ENDPOINT}?koordsys=4326&punkter={urllib.parse.quote(payload)}"
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=60, context=SSL_CONTEXT) as response:
            data = json.loads(response.read().decode("utf-8"))
        values = data.get("punkter", [])
        if len(values) != len(batch):
            raise RuntimeError(f"Elevation response mismatch: {len(values)} of {len(batch)}")
        for value in values:
            height = value.get("z")
            if not isinstance(height, (int, float)) or not math.isfinite(height):
                raise RuntimeError(f"Invalid elevation: {value}")
            heights.append(float(height))

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps({"points": points, "heights": heights}, indent=2) + "\n")
    return heights


def build_terrain(site: dict, origin: tuple[float, float], offline: bool) -> dict:
    south, west, north, east = site["data_bbox"]
    corners = [
        project(south, west, *origin),
        project(south, east, *origin),
        project(north, west, *origin),
        project(north, east, *origin),
    ]
    xs = [point[0] for point in corners]
    ys = [point[1] for point in corners]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    # The grid grows with the extent so the sample spacing stays near TERRAIN_SPACING_M.
    cols = max(GRID_SIZE, int(round((max_x - min_x) / TERRAIN_SPACING_M)) + 1)
    rows = max(GRID_SIZE, int(round((max_y - min_y) / TERRAIN_SPACING_M)) + 1)
    points: list[tuple[float, float]] = []
    for row in range(rows):
        y = min_y + (max_y - min_y) * row / (rows - 1)
        for col in range(cols):
            x = min_x + (max_x - min_x) * col / (cols - 1)
            lat, lon = unproject(x, y, *origin)
            points.append((round(lon, 8), round(lat, 8)))

    cache_path = RAW / f"{site['id']}-elevation.json"
    absolute = fetch_elevations(points, cache_path, offline)

    center = (rows // 2) * cols + (cols // 2)
    origin_elevation = absolute[center]
    heights: list[list[float]] = []
    for row in range(rows):
        heights.append(
            [
                round(absolute[row * cols + col] - origin_elevation, 2)
                for col in range(cols)
            ]
        )

    return {
        "schemaVersion": 1,
        "siteId": site["id"],
        "cols": cols,
        "rows": rows,
        "minX": round(min_x, 2),
        "maxX": round(max_x, 2),
        "minY": round(min_y, 2),
        "maxY": round(max_y, 2),
        "originElevation": round(origin_elevation, 2),
        "heights": heights,
        "source": "Kartverket DTM1",
    }



def sample_height(terrain: dict, x: float, y: float) -> float:
    cols, rows = terrain["cols"], terrain["rows"]
    min_x, max_x = terrain["minX"], terrain["maxX"]
    min_y, max_y = terrain["minY"], terrain["maxY"]
    tx = min(max((x - min_x) / (max_x - min_x), 0.0), 1.0) * (cols - 1)
    ty = min(max((y - min_y) / (max_y - min_y), 0.0), 1.0) * (rows - 1)
    x0, y0 = int(math.floor(tx)), int(math.floor(ty))
    x1, y1 = min(x0 + 1, cols - 1), min(y0 + 1, rows - 1)
    fx, fy = tx - x0, ty - y0
    h00 = terrain["heights"][y0][x0]
    h10 = terrain["heights"][y0][x1]
    h01 = terrain["heights"][y1][x0]
    h11 = terrain["heights"][y1][x1]
    return (
        h00 * (1 - fx) * (1 - fy)
        + h10 * fx * (1 - fy)
        + h01 * (1 - fx) * fy
        + h11 * fx * fy
    )


def normalise_kind(tags: dict) -> str:
    value = (tags.get("building") or "other").lower()
    if value in {"apartments", "residential", "terrace", "semidetached_house"}:
        return "apartments"
    if value in {"house", "detached", "bungalow"}:
        return "house"
    if value in {"commercial", "retail", "office", "hotel"}:
        return "commercial"
    if value in {"church", "cathedral", "chapel"}:
        return "church"
    if value in {"industrial", "warehouse", "manufacture"}:
        return "industrial"
    if value in {"civic", "public", "school", "university", "hospital"}:
        return "civic"
    if value == "garage":
        return "garage"
    return "other"


def building_height(tags: dict, kind: str) -> float:
    raw_height = tags.get("height")
    if raw_height:
        try:
            value = float(str(raw_height).lower().replace("m", "").strip())
            if 2.0 <= value <= 80.0:
                return round(value, 2)
        except ValueError:
            pass

    raw_levels = tags.get("building:levels")
    if raw_levels:
        try:
            levels = float(str(raw_levels).replace(",", "."))
            if 1.0 <= levels <= 20.0:
                return round(levels * 3.2 + 0.4, 2)
        except ValueError:
            pass

    fallback = {
        "apartments": 4,
        "house": 2,
        "commercial": 3,
        "church": 9,
        "industrial": 3,
        "civic": 4,
        "garage": 1,
        "other": 3,
    }[kind]
    return round(fallback * 3.2 + 0.4, 2)


def process_buildings(raw: list[dict], terrain: dict, boundary: tuple[float, float]) -> list[dict]:
    half_w, half_h = boundary[0] / 2, boundary[1] / 2
    buildings = []
    for item in raw:
        footprint = item["footprint"]
        area = polygon_area(footprint)
        kind = normalise_kind(item["tags"])
        if kind == "garage" and area < 35.0:
            continue
        centroid_x = sum(point[0] for point in footprint) / len(footprint)
        centroid_y = sum(point[1] for point in footprint) / len(footprint)
        inside = abs(centroid_x) <= half_w and abs(centroid_y) <= half_h
        sample_points = footprint + [(centroid_x, centroid_y)]
        base_elevation = min(
            sample_height(terrain, point[0], point[1]) for point in sample_points
        ) - 0.3
        buildings.append(
            {
                "id": item["id"],
                "kind": kind,
                "height": building_height(item["tags"], kind),
                "baseElevation": round(base_elevation, 2),
                "area": round(area, 1),
                "withinStudyArea": inside,
                "footprint": [[round(x, 2), round(y, 2)] for x, y in footprint],
            }
        )
    buildings.sort(key=lambda building: building["area"], reverse=True)
    return buildings[:MAX_CONTEXT_BUILDINGS]



def study_area(site: dict) -> dict:
    width, height = site["boundary"]
    center_x, center_y = site["center"]
    half_w, half_h = width / 2, height / 2
    return {
        "schemaVersion": 1,
        "siteId": site["id"],
        "label": "Study area — not a cadastral parcel",
        "polygon": [
            [center_x - half_w, center_y - half_h],
            [center_x + half_w, center_y - half_h],
            [center_x + half_w, center_y + half_h],
            [center_x - half_w, center_y + half_h],
            [center_x - half_w, center_y - half_h],
        ],
    }


def camera_presets(target_z: float, boundary: tuple[float, float], center: tuple[float, float]) -> dict:
    width, height = boundary
    center_x, center_y = center
    diagonal = math.hypot(width, height)

    isometric_distance = diagonal * 1.7
    direction = math.sqrt(1 + 1.15**2 + 1)
    isometric = [
        round(center_x + isometric_distance / direction, 2),
        round(center_y - isometric_distance * 1.15 / direction, 2),
        round(isometric_distance / direction, 2),
    ]

    return {
        "isometric": {
            "position": isometric,
            "target": [center_x, center_y, target_z],
            "projection": "perspective",
            "fov": 32,
        },
        "top": {
            "position": [center_x, center_y - 0.01, round(diagonal * 2.25, 2)],
            "target": [center_x, center_y, 0.0],
            "projection": "perspective",
            "fov": 32,
        },
        "north": {
            "position": [
                center_x,
                round(center_y - diagonal * 1.35, 2),
                round(diagonal * 0.62, 2),
            ],
            "target": [center_x, center_y, target_z],
            "projection": "perspective",
            "fov": 32,
        },
        "south": {
            "position": [
                center_x,
                round(center_y + diagonal * 1.35, 2),
                round(diagonal * 0.62, 2),
            ],
            "target": [center_x, center_y, target_z],
            "projection": "perspective",
            "fov": 32,
        },
        "eyeLevel": {
            "position": [
                round(center_x + diagonal * 0.8, 2),
                round(center_y - diagonal * 0.9, 2),
                16.0,
            ],
            "target": [center_x, center_y, target_z],
            "projection": "perspective",
            "fov": 34,
        },
    }


def download_osm(site: dict, path: Path) -> None:
    south, west, north, east = site["data_bbox"]
    url = (
        "https://api.openstreetmap.org/api/0.6/map"
        f"?bbox={west},{south},{east},{north}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=180, context=SSL_CONTEXT) as response:
        path.write_bytes(response.read())


def write_attribution(site: dict, terrain: dict) -> str:
    south, west, north, east = site["data_bbox"]
    return f"""# {site['title']} — data attribution

## Building footprints

© OpenStreetMap contributors. Licensed under the Open Database License (ODbL) 1.0.
Source: https://www.openstreetmap.org/copyright
Query: https://api.openstreetmap.org/api/0.6/map?bbox={west},{south},{east},{north}

This simplified, derived building dataset is made available under ODbL 1.0.
If you reuse or redistribute it, keep this attribution and the ODbL notice.
Licence text: https://opendatacommons.org/licenses/odbl/1-0/

## Roads and trees

© OpenStreetMap contributors (ODbL 1.0), from the same extract as the buildings.
Roads are `highway` centrelines clipped to the terrain extent; widths are illustrative
values by highway class, not measured carriageways. Tunnels and area-tagged ways are
omitted; a covered passage through a building (`tunnel=building_passage`) is kept as a
street. Where the extract is missing a node the way is split there rather than joined
across the gap.

Trees are mapped OSM positions: `natural=tree` nodes, and `natural=tree_row` lines with a
tree placed every 8 m along the row. The positions are the mappers' own; the sizes and
tints are illustrative and vary by position, so no species, height or canopy data is
implied. Where OSM has no tree, none is drawn — the ground is left as it is mapped.

## Land cover

© OpenStreetMap contributors (ODbL 1.0), from the same cached extract.
Water: `natural=water`, `waterway=riverbank`, `landuse=reservoir|basin`, and
`waterway=river|canal|stream` drawn as illustrative ribbons (10 m, 6 m and 4 m wide).
Wood: `natural=wood`, `landuse=forest`. Scrub: `natural=scrub`, `natural=heath`,
`landuse=scrub`. Wetland: `natural=wetland`, `landuse=wetland`. Bare ground:
`natural=bare_rock|sand|scree|shingle`. Cemetery: `landuse=cemetery|grave_yard`.
Pitch: `leisure=pitch|playground|sports_centre|stadium`. Field:
`landuse=allotments|orchard|vineyard|farmland|farmyard`. Park:
`leisure=park|garden`, `landuse=recreation_ground|village_green`. Grass:
`landuse=grass|meadow|flowerbed`, `natural=grassland`.
Closed ways and multipolygon outer rings are clipped to the
terrain extent and simplified at 0.5 m; areas below 4 m² and incomplete rings are
omitted. Outer member ways that fall outside the extract are fetched separately so a
multipolygon ring can still be closed. Inner rings are ignored. Polygons are
illustrative ground tints.

Not included: coastline and the fjord, and any land use OSM does not tag with the keys
above.

## Terrain

© Kartverket. Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).
Source: https://ws.geonorge.no/hoydedata/v1/ (DTM1)
Terms: https://www.kartverket.no/api-og-data/vilkar-for-bruk/

Terrain elevations were sampled on a {terrain['cols']} × {terrain['rows']} grid and
recentered to the local origin elevation ({terrain['originElevation']:.2f} m).

## Study area

The boundary is an authored rectangle for this demonstration. It is not a cadastral
parcel, property boundary, zoning designation or planning constraint.

## Simplifications

- Building footprints are simplified with a 1.2 m tolerance.
- Only building ways are included; multipolygon building relations are omitted.
- Heights come from `height`, then `building:levels`, then a typology fallback.
- Terrain is a coarse sampled heightfield, not an engineering surface.
- Buildings use one base elevation sampled at the footprint centroid; sloped
  footprints are not individually conformed to the terrain.

Generated by `scripts/build_site_packages.py` for the Terraform portfolio prototype.
"""



def ensure_osm_extract(site: dict, path: Path, offline: bool) -> str:
    """Keep the OSM cache for the bbox the site asks for.

    The cache records the bbox and the date it was downloaded for, so a wider context is
    fetched again instead of being silently built from the old, smaller extract. Returns the
    acquisition date, which the manifest publishes.
    """
    bbox_path = path.with_suffix(".bbox")
    bbox = ",".join(f"{value:.7f}" for value in site["data_bbox"])
    if path.exists() and bbox_path.exists():
        recorded = bbox_path.read_text().splitlines()
        if recorded and recorded[0].strip() == bbox:
            return recorded[1].strip() if len(recorded) > 1 else ""
    if offline:
        raise RuntimeError(f"Missing or stale OSM cache: {path}")
    download_osm(site, path)
    acquired = datetime.date.today().isoformat()
    bbox_path.write_text(f"{bbox}\n{acquired}\n")
    return acquired


def build_site(site_id: str, offline: bool) -> None:
    site = {**SITES[site_id], "id": site_id}
    south, west, north, east = site["bbox"]
    site["data_bbox"] = expanded_bbox(site)
    # Project from the origin the manifest publishes, so the shipped geometry matches the
    # coordinates the package declares and the build does not depend on the last float bits.
    origin = (round((south + north) / 2, 6), round((west + east) / 2, 6))
    raw_osm = RAW / f"{site_id}.osm"
    if not raw_osm.exists():
        if offline:
            raise RuntimeError(f"Missing OSM cache: {raw_osm}")
        raw_osm.parent.mkdir(parents=True, exist_ok=True)
    osm_acquired_at = ensure_osm_extract(site, raw_osm, offline)

    raw_buildings = parse_osm(raw_osm, origin)
    terrain = build_terrain(site, origin, offline)
    buildings = process_buildings(raw_buildings, terrain, site["boundary"])
    boundary = study_area(site)
    extent = (terrain["minX"], terrain["minY"], terrain["maxX"], terrain["maxY"])
    roads, trees = parse_osm_context(raw_osm, origin, extent)
    # A multipolygon whose outer ring runs outside the bbox extract needs its missing member
    # ways; without them the whole polygon is dropped.
    extra_osm = RAW / f"{site_id}-ways.xml"
    missing_ways = missing_outer_way_ids(raw_osm)
    if missing_ways and not extra_osm.exists():
        if offline:
            raise RuntimeError(f"Missing outer ways cache: {extra_osm}")
        download_osm_ways(missing_ways, extra_osm)
    drops: list[dict] = []
    landcover = parse_osm_landcover(
        raw_osm, origin, extent, extra_osm if extra_osm.exists() else None, drops
    )

    output = PUBLIC / site_id
    output.mkdir(parents=True, exist_ok=True)

    manifest = {
        "schemaVersion": 1,
        "id": site_id,
        "title": site["title"],
        "subtitle": site["subtitle"],
        "description": site["description"],
        "morphology": site["morphology"],
        "location": {
            "latitude": round(origin[0], 6),
            "longitude": round(origin[1], 6),
            "timeZone": "Europe/Oslo",
        },
        "crs": {
            "sourceEPSG": "EPSG:4326",
            "horizontalDatum": "WGS84",
            "verticalDatum": "NN2000",
            "originLatitude": round(origin[0], 6),
            "originLongitude": round(origin[1], 6),
            "originElevation": terrain["originElevation"],
            "projection": "local-tangent-plane-wgs84",
        },
        "unit": "m",
        "dataStatus": "curated-demo",
        "assetPaths": {
            "terrain": "terrain.json",
            "buildings": "buildings.json",
            "studyArea": "study-area.json",
            "thumbnail": f"/sites/{site_id}.svg",
            "attribution": "attribution.md",
            "roads": "roads.json",
            "trees": "trees.json",
            "landcover": "landcover.json",
        },
        "constraints": {
            "maxHeightMeters": site["max_height"],
            "setbackMeters": site["setback"],
            "label": "Illustrative design constraint",
        },
        "cameraPresets": camera_presets(
            site["target_z"], site["boundary"], site["center"]
        ),
        "sources": [
            {
                "title": "OpenStreetMap site extract (buildings, roads, trees, land cover)",
                "url": "https://www.openstreetmap.org/copyright",
                "license": "ODbL 1.0",
                "attribution": "© OpenStreetMap contributors",
                "acquiredAt": osm_acquired_at or "2026-10-27",
            },
            {
                "title": "Kartverket DTM1 elevation",
                "url": "https://ws.geonorge.no/hoydedata/v1/",
                "license": "CC BY 4.0",
                "attribution": "© Kartverket",
                "acquiredAt": "2026-10-27",
            },
        ],
        "simplified": [
            "Footprints simplified with a 1.2 m tolerance; building relations omitted",
            "Heights from height, building:levels, or a typology fallback",
            f"Terrain sampled on a {terrain['cols']} × {terrain['rows']} grid and recentered to the origin",
            "Study boundary is authored, not a cadastral parcel",
            "Roads are OSM centrelines with illustrative widths by highway class; tunnels omitted",
            "Trees are mapped OSM positions (natural=tree nodes, natural=tree_row lines every 8 m) drawn with illustrative, position-varied sizes and tints",
            "Land cover is illustrative OSM ground tints clipped to terrain and simplified at 0.5 m; areas below 4 m² and incomplete rings omitted; multipolygon inner rings ignored",
        ],
        "statistics": {
            "buildingCount": len(buildings),
            "terrainSamples": terrain["cols"] * terrain["rows"],
            "studyAreaM2": round(site["boundary"][0] * site["boundary"][1], 1),
            "sourceChecksum": hashlib.sha256(raw_osm.read_bytes()).hexdigest()[:16],
        },
    }

    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (output / "terrain.json").write_text(json.dumps(terrain, indent=2) + "\n")
    (output / "buildings.json").write_text(
        json.dumps({"schemaVersion": 1, "siteId": site_id, "buildings": buildings}, indent=2)
        + "\n"
    )
    (output / "study-area.json").write_text(json.dumps(boundary, indent=2) + "\n")
    (output / "roads.json").write_text(
        json.dumps({"schemaVersion": 1, "siteId": site_id, "roads": roads}, indent=2) + "\n"
    )
    (output / "trees.json").write_text(
        json.dumps({"schemaVersion": 1, "siteId": site_id, "trees": trees}, indent=2) + "\n"
    )
    (output / "attribution.md").write_text(write_attribution(site, terrain))
    (output / "landcover.json").write_text(
        json.dumps({"schemaVersion": 1, "siteId": site_id, "areas": landcover}, indent=2) + "\n"
    )

    landcover_counts = ", ".join(
        f"{kind}: {sum(area['kind'] == kind for area in landcover)}" for kind in LANDCOVER_TAGS
    )
    print(
        f"{site_id}: {len(buildings)} buildings, {terrain['cols']}x{terrain['rows']} terrain, "
        f"{len(raw_buildings)} raw footprints, {len(roads)} road runs, {len(trees)} trees, "
        f"{len(landcover)} land cover areas ({landcover_counts})"
    )
    if missing_ways:
        print(f"  completed {len(missing_ways)} outer member way(s): {', '.join(missing_ways)}")
    for drop in drops:
        print(f"  dropped land cover {drop['id']} ({drop['kind']}): {drop['reason']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    if args.offline:
        verify_cache_checksums()
    for site_id in SITES:
        build_site(site_id, args.offline)


if __name__ == "__main__":
    main()

