"""Throwaway: put DTM1, matrikkel parcels, the SVV strategic noise map and the app's curated
buildings/roads into Terraform's local ENU frame, measure registration, and write scene.json for
the isolated three.js viewer in this folder.

Run from feasibility/scratch:  .venv/bin/python -I registration/prep.py
Needs dtm_site_600m.tif, dom_site_600m.tif and evidence/norstoy-lden-tile.geojson (see 04).
"""
import json
import re
import ssl
import urllib.request

import certifi
import numpy as np
import tifffile
from pyproj import Transformer

CTX = ssl.create_default_context(cafile=certifi.where())
SITE = "../../public/sites/compact-infill/"
man = json.load(open(SITE + "manifest.json"))
OLAT, OLON, OELEV = man["crs"]["originLatitude"], man["crs"]["originLongitude"], man["crs"]["originElevation"]
X0, YTOP = 262653.0, 6650790.0  # DTM tile corner (EPSG:25833), 1 m pixels
utm2ll = Transformer.from_crs(25833, 4326, always_xy=True)
ll2utm = Transformer.from_crs(4326, 25833, always_xy=True)
out = {}


def mpd(lat):  # identical to src/features/import/projection.ts
    p = np.radians(lat)
    return (111132.92 - 559.82 * np.cos(2 * p) + 1.175 * np.cos(4 * p),
            111412.84 * np.cos(p) - 93.5 * np.cos(3 * p) + 0.118 * np.cos(5 * p))


LAT_M, LON_M = mpd(OLAT)


def utm_to_enu(x, y):
    lon, lat = utm2ll.transform(np.asarray(x, float), np.asarray(y, float))
    return (lon - OLON) * LON_M, (lat - OLAT) * LAT_M


def enu_to_utm(e, n):
    return ll2utm.transform(OLON + np.asarray(e) / LON_M, OLAT + np.asarray(n) / LAT_M)


dtm = tifffile.imread("dtm_site_600m.tif").astype(float)
dom = tifffile.imread("dom_site_600m.tif").astype(float)


def dtm_at(x, y):
    c = np.clip(((np.asarray(x) - X0) - 0.5).astype(int), 0, 599)
    r = np.clip(((YTOP - np.asarray(y)) - 0.5).astype(int), 0, 599)
    return dtm[r, c]


# --- What a naive "UTM offset = ENU" shortcut would cost (grid convergence) ---
oe, on = ll2utm.transform(OLON, OLAT)
corners = np.array([[X0, YTOP], [X0 + 600, YTOP], [X0, YTOP - 600], [X0 + 600, YTOP - 600]])
ce, cn = utm_to_enu(corners[:, 0], corners[:, 1])
naive = corners - [oe, on]
out["naive_utm_offset_error_m"] = round(float(np.max(np.hypot(ce - naive[:, 0], cn - naive[:, 1]))), 2)
_a, _b = np.array(utm_to_enu(oe, on)), np.array(utm_to_enu(oe, on + 100))
out["utm_north_bearing_in_enu_deg"] = round(float(np.degrees(np.arctan2(_b[0] - _a[0], _b[1] - _a[1]))), 3)

# --- Terrain mesh: 2 m vertices from the 1 m DTM, positioned in ENU ---
step = 2
rows = np.arange(0, 600, step) + 0.5
cols = np.arange(0, 600, step) + 0.5
CX, RY = np.meshgrid(X0 + cols, YTOP - rows)
E, N = utm_to_enu(CX, RY)
Z = dtm[::step, ::step] - OELEV
scene = {"terrain": {"w": len(cols), "h": len(rows), "e": np.round(E, 2).ravel().tolist(), "n": np.round(N, 2).ravel().tolist(),
                     "z": np.round(Z, 2).ravel().tolist()}}

# --- Noise polygons -> band raster on the same 2 m grid (exact UV = grid index) ---
gj = json.load(open("evidence/norstoy-lden-tile.geojson"))
band = np.zeros(CX.shape)


def pip(ring, px, py):
    ring = np.asarray(ring); res = np.zeros(px.shape, bool); j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][:2]; xj, yj = ring[j][:2]
        res ^= ((yi > py) != (yj > py)) & (px < (xj - xi) * (py - yi) / ((yj - yi) or 1e-12) + xi)
        j = i
    return res


noise_polys = []
for f in gj["features"]:
    lo = int(f["properties"]["STØYINTERVALL"])
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for poly in polys:
        inside = np.zeros(CX.shape, bool)
        for ring in poly:  # even-odd over exterior + holes
            inside ^= pip(ring, CX, RY)
        band = np.where(inside, np.maximum(band, lo), band)
        noise_polys.append((lo, poly))
scene["noise"] = {"band": band.astype(int).ravel().tolist(), "bands": sorted({int(f["properties"]["STØYINTERVALL"]) for f in gj["features"]}),
                  "year": gj["features"][0]["properties"]["BEREGNETÅR"]}

# --- Parcels (matrikkel teig WFS, GML) ---
url = ("https://wfs.geonorge.no/skwms1/wfs.matrikkelen-eiendomskart-teig?service=WFS&version=2.0.0&request=GetFeature"
       f"&typeNames=app:Teig&count=3000&bbox={X0},{YTOP - 600},{X0 + 600},{YTOP},urn:ogc:def:crs:EPSG::25833")
gml = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "terraform-feasibility-probe/0.1"}), context=CTX, timeout=120).read().decode()
open("evidence/teig-tile.gml", "w").write(gml)
rings = []
for m in re.finditer(r"<gml:posList[^>]*>([^<]+)</gml:posList>", gml):
    v = np.array(m.group(1).split(), float).reshape(-1, 2)
    rings.append(v)
acc = re.findall(r"<app:nøyaktighetsklasseTeig>([^<]+)<", gml) or re.findall(r"nøyaktighet[^>]*>([^<]+)<", gml)
out["parcels"] = {"teig_features": gml.count("<app:Teig "), "rings": len(rings), "accuracy_classes": {a: acc.count(a) for a in set(acc)}}
scene["parcels"] = []
for v in rings:
    e, n = utm_to_enu(v[:, 0], v[:, 1])
    z = dtm_at(v[:, 0], v[:, 1]) - OELEV + 0.25
    scene["parcels"].append(np.round(np.c_[e, n, z], 2).ravel().tolist())

# --- Curated buildings and roads (already ENU) ---
blds = json.load(open(SITE + "buildings.json"))["buildings"]
roads = json.load(open(SITE + "roads.json"))["roads"]
half = 300
scene["buildings"] = [{"fp": b["footprint"], "base": b["baseElevation"], "h": b["height"]} for b in blds
                      if all(abs(p[0]) < half and abs(p[1]) < half for p in b["footprint"])]
scene["roads"] = [{"hw": r["highway"], "c": r["centreline"]} for r in roads]

# --- Registration checks ---
# (a) Building outline vertices vs nearest parcel boundary, with a shift test.
seg = np.concatenate([np.c_[v[:-1], v[1:]] for v in rings])  # x1 y1 x2 y2 in UTM


def dist_to_segments(px, py):
    ax, ay, bx, by = seg.T
    dx, dy = bx - ax, by - ay
    t = np.clip(((px[:, None] - ax) * dx + (py[:, None] - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    return np.min(np.hypot(ax + t * dx - px[:, None], ay + t * dy - py[:, None]), axis=1)


vx = np.concatenate([np.array(b["fp"])[:, 0] for b in scene["buildings"]])
vy = np.concatenate([np.array(b["fp"])[:, 1] for b in scene["buildings"]])
ux, uy = enu_to_utm(vx, vy)
shift = {}
for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)]:
    d = dist_to_segments(ux + dx, uy + dy)
    shift[f"{dx},{dy}"] = {"median_m": round(float(np.median(d)), 2), "share_within_1m": round(float((d <= 1).mean()), 3)}
out["building_vertices_to_parcel_boundary"] = {"vertices": int(len(ux)), "by_shift_m": shift}

# (b) Noise vs roads: share of major-road centreline length inside >= 65 dB polygons, with a shift test.
major = [r for r in roads if r["highway"] in ("primary", "secondary", "tertiary")]
pts = []
for r in major:
    c = np.array(r["centreline"])
    for a, b in zip(c[:-1], c[1:]):
        L = np.hypot(*(b - a)); k = max(1, int(L // 2))
        for t in np.linspace(0, 1, k, endpoint=False):
            pts.append(a + t * (b - a))
pts = np.array(pts)
pts = pts[(np.abs(pts[:, 0]) < 280) & (np.abs(pts[:, 1]) < 280)]
px, py = enu_to_utm(pts[:, 0], pts[:, 1])
noise_shift = {}
for dx, dy in [(0, 0), (8, 0), (-8, 0), (0, 8), (0, -8)]:
    inside = np.zeros(len(px), bool)
    for lo, poly in noise_polys:
        if lo < 65:
            continue
        ins = np.zeros(len(px), bool)
        for ring in poly:
            ins ^= pip(ring, px + dx, py + dy)
        inside |= ins
    noise_shift[f"{dx},{dy}"] = round(float(inside.mean()), 3)
out["major_road_share_inside_lden65"] = {"samples_2m": int(len(px)), "by_shift_m": noise_shift}

# (c) Building base elevation vs DTM at the footprint centroid.
dz = []
for b in scene["buildings"]:
    c = np.array(b["fp"]).mean(axis=0)
    cx, cy = enu_to_utm(c[0], c[1])
    dz.append(b["base"] + OELEV - float(dtm_at(cx, cy)))
dz = np.array(dz)
out["building_base_vs_dtm_m"] = {"n": len(dz), "median": round(float(np.median(dz)), 2), "p90_abs": round(float(np.percentile(np.abs(dz), 90)), 2)}

json.dump(scene, open("registration/scene.json", "w"), separators=(",", ":"))
json.dump(out, open("evidence/registration-3d.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps(out, indent=1, ensure_ascii=False))
