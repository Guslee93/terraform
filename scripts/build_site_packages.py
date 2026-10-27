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


def repair_ring(points: list[tuple[float, float]]) -> list[tuple[float, float]] | None:
    original = points[:]
    candidates = [original]
    for tolerance in (1.2, 0.6, 0.3):
        simplified = simplify(original + [original[0]], tolerance)[:-1]
        if len(simplified) >= 3:
            candidates.append(simplified)
    for candidate in candidates:
        if len(candidate) >= 3 and polygon_area(candidate) >= 25.0 and is_simple_ring(candidate):
            return candidate
    return None


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
        repaired = repair_ring(coordinates)
        if repaired is None:
            print(f"  skipped self-intersecting building way {way.get('id')}")
            continue
        coordinates = repaired
        buildings.append({"id": way.get("id"), "tags": tags, "footprint": coordinates})
    return buildings


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
    south, west, north, east = site["bbox"]
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

    cols = rows = GRID_SIZE
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
    return buildings[:220]



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
    south, west, north, east = site["bbox"]
    url = (
        "https://api.openstreetmap.org/api/0.6/map"
        f"?bbox={west},{south},{east},{north}"
    )
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120, context=SSL_CONTEXT) as response:
        path.write_bytes(response.read())


def write_attribution(site: dict, terrain: dict) -> str:
    south, west, north, east = site["bbox"]
    return f"""# {site['title']} — data attribution

## Building footprints

© OpenStreetMap contributors. Licensed under the Open Database License (ODbL) 1.0.
Source: https://www.openstreetmap.org/copyright
Query: https://api.openstreetmap.org/api/0.6/map?bbox={west},{south},{east},{north}

This simplified, derived building dataset is made available under ODbL 1.0.
If you reuse or redistribute it, keep this attribution and the ODbL notice.
Licence text: https://opendatacommons.org/licenses/odbl/1-0/

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



def build_site(site_id: str, offline: bool) -> None:
    site = {**SITES[site_id], "id": site_id}
    south, west, north, east = site["bbox"]
    origin = ((south + north) / 2, (west + east) / 2)
    raw_osm = RAW / f"{site_id}.osm"
    if not raw_osm.exists():
        if offline:
            raise RuntimeError(f"Missing OSM cache: {raw_osm}")
        raw_osm.parent.mkdir(parents=True, exist_ok=True)
        download_osm(site, raw_osm)

    raw_buildings = parse_osm(raw_osm, origin)
    terrain = build_terrain(site, origin, offline)
    buildings = process_buildings(raw_buildings, terrain, site["boundary"])
    boundary = study_area(site)

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
                "title": "OpenStreetMap building footprints",
                "url": "https://www.openstreetmap.org/copyright",
                "license": "ODbL 1.0",
                "attribution": "© OpenStreetMap contributors",
                "acquiredAt": "2026-10-27",
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
            "Terrain sampled on a 13 × 13 grid and recentered to the origin",
            "Study boundary is authored, not a cadastral parcel",
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
    (output / "attribution.md").write_text(write_attribution(site, terrain))

    print(
        f"{site_id}: {len(buildings)} buildings, {terrain['cols']}x{terrain['rows']} terrain, "
        f"{len(raw_buildings)} raw footprints"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    for site_id in SITES:
        build_site(site_id, args.offline)


if __name__ == "__main__":
    main()

