"""Throwaway Test 2: do the app's curated geometry and authoritative rasters register?

Run: .venv/bin/python -I registration_bench.py   (after terrain_bench.py and the noise-points test)
Writes evidence/registration-bench.json.

1. App terrain grid (ENU, relative to originElevation) vs Kartverket DTM1 at the same points.
2. OSM footprints vs Kartverket DOM - DTM (normalised surface): do buildings stand where the
   footprints are, and how do OSM heights compare with the surface model?
3. App road-noise heuristic vs the Statens vegvesen strategic Lden map (2021) at the same points.
"""
import json
import re
import ssl
import urllib.parse
import urllib.request

import certifi
import numpy as np
import tifffile
from pyproj import Transformer

CTX = ssl.create_default_context(cafile=certifi.where())
SITE = "../../public/sites/compact-infill/"
OLAT, OLON = 59.9235, 10.758
X0, YTOP = 262653.0, 6650790.0
to_utm = Transformer.from_crs(4326, 25833, always_xy=True)
out = {}


def mpd(lat):  # app formula, src/features/import/projection.ts
    p = np.radians(lat)
    return (111132.92 - 559.82 * np.cos(2 * p) + 1.175 * np.cos(4 * p),
            111412.84 * np.cos(p) - 93.5 * np.cos(3 * p) + 0.118 * np.cos(5 * p))


def enu_to_utm(e, n):
    lat_m, lon_m = mpd(OLAT)
    return to_utm.transform(OLON + np.asarray(e) / lon_m, OLAT + np.asarray(n) / lat_m)


def fetch(url, limit=10_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": "terraform-feasibility-probe/0.1"})
    return urllib.request.urlopen(req, context=CTX, timeout=60).read(limit)


def bilinear(z, x, y):
    c = (np.asarray(x) - X0) - 0.5
    r = (YTOP - np.asarray(y)) - 0.5
    c0 = np.floor(c).astype(int); r0 = np.floor(r).astype(int)
    fc, fr = c - c0, r - r0
    ok = (c0 >= 0) & (r0 >= 0) & (c0 < z.shape[1] - 1) & (r0 < z.shape[0] - 1)
    c0, r0 = np.clip(c0, 0, z.shape[1] - 2), np.clip(r0, 0, z.shape[0] - 2)
    v = z[r0, c0] * (1 - fc) * (1 - fr) + z[r0, c0 + 1] * fc * (1 - fr) + z[r0 + 1, c0] * (1 - fc) * fr + z[r0 + 1, c0 + 1] * fc * fr
    return np.where(ok, v, np.nan)


dtm = tifffile.imread("dtm_site_600m.tif").astype(float)
dom_url = ("https://wcs.geonorge.no/skwms1/wcs.hoyde-dom-nhm-25833?service=WCS&version=1.0.0&request=GetCoverage"
           f"&coverage=nhm_dom_topo_25833&crs=EPSG:25833&bbox={X0:.0f},{YTOP - 600:.0f},{X0 + 600:.0f},{YTOP:.0f}&width=600&height=600&format=GeoTIFF")
open("dom_site_600m.tif", "wb").write(fetch(dom_url))
dom = tifffile.imread("dom_site_600m.tif").astype(float)
ndsm = dom - dtm

# 1. Terrain grid registration; the row order is part of what is being checked.
t = json.load(open(SITE + "terrain.json"))
H = np.array(t["heights"], float) + t["originElevation"]
xs = np.linspace(t["minX"], t["maxX"], t["cols"])
for name, ys in (("row0=minY", np.linspace(t["minY"], t["maxY"], t["rows"])), ("row0=maxY", np.linspace(t["maxY"], t["minY"], t["rows"]))):
    E, N = np.meshgrid(xs, ys)
    ue, un = enu_to_utm(E.ravel(), N.ravel())
    ref = bilinear(dtm, ue, un)
    d = H.ravel() - ref
    d = d[~np.isnan(d)]
    out.setdefault("terrain_grid", {})[name] = {"points_in_tile": int(d.size), "mean_m": round(float(d.mean()), 3),
                                               "rmse_m": round(float(np.sqrt((d ** 2).mean())), 3), "p95_abs_m": round(float(np.percentile(np.abs(d), 95)), 3)}
out["terrain_grid"]["spacing_m"] = [round((t["maxX"] - t["minX"]) / (t["cols"] - 1), 2), round((t["maxY"] - t["minY"]) / (t["rows"] - 1), 2)]

# 2. Footprints vs the normalised surface model.
def inside(poly, px, py):
    poly = np.asarray(poly); res = np.zeros(px.shape, bool)
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        res ^= ((yi > py) != (yj > py)) & (px < (xj - xi) * (py - yi) / ((yj - yi) or 1e-12) + xi)
        j = i
    return res

blds = json.load(open(SITE + "buildings.json"))["buildings"]
rows = []
for b in blds:
    fp = np.array(b["footprint"])
    ue, un = enu_to_utm(fp[:, 0], fp[:, 1])
    if ue.min() < X0 + 2 or ue.max() > X0 + 598 or un.min() < YTOP - 598 or un.max() > YTOP - 2:
        continue
    c0, c1 = int(ue.min() - X0), int(ue.max() - X0) + 1
    r0, r1 = int(YTOP - un.max()), int(YTOP - un.min()) + 1
    cc, rr = np.meshgrid(np.arange(c0, c1), np.arange(r0, r1))
    m = inside(np.c_[ue, un], X0 + cc + 0.5, YTOP - rr - 0.5)
    if m.sum() < 10:
        continue
    vals = ndsm[rr[m], cc[m]]
    rows.append({"id": b["id"], "osm_height": b["height"], "cells": int(m.sum()), "share_over_2_5m": float((vals > 2.5).mean()),
                 "ndsm_p90": float(np.percentile(vals, 90))})
share = np.array([r["share_over_2_5m"] for r in rows])
dh = np.array([r["osm_height"] - r["ndsm_p90"] for r in rows])
out["footprints_vs_ndsm"] = {
    "buildings_tested": len(rows), "median_share_of_footprint_cells_over_2_5m": round(float(np.median(share)), 3),
    "buildings_with_under_50pct_raised": int((share < 0.5).sum()),
    "osm_minus_ndsm_p90_height_m": {"median": round(float(np.median(dh)), 2), "mean_abs": round(float(np.abs(dh).mean()), 2),
                                    "p90_abs": round(float(np.percentile(np.abs(dh), 90)), 2), "share_within_3m": round(float((np.abs(dh) <= 3).mean()), 3)},
    "note": "nDSM p90 inside the footprint approximates the roof top; DOM includes trees and roof furniture; DOM and DTM epochs differ.",
}
# Shift test: does a 1-3 m offset raise the share? A clear peak away from zero would mean misregistration.
shifts = {}
for dx, dy in [(0, 0), (2, 0), (-2, 0), (0, 2), (0, -2)]:
    vals = []
    for b in blds[:400]:
        fp = np.array(b["footprint"]) + [dx, dy]
        ue, un = enu_to_utm(fp[:, 0], fp[:, 1])
        if ue.min() < X0 + 4 or ue.max() > X0 + 596 or un.min() < YTOP - 596 or un.max() > YTOP - 4:
            continue
        c0, c1 = int(ue.min() - X0), int(ue.max() - X0) + 1
        r0, r1 = int(YTOP - un.max()), int(YTOP - un.min()) + 1
        cc, rr = np.meshgrid(np.arange(c0, c1), np.arange(r0, r1))
        m = inside(np.c_[ue, un], X0 + cc + 0.5, YTOP - rr - 0.5)
        if m.sum() >= 10:
            vals.append((ndsm[rr[m], cc[m]] > 2.5).mean())
    shifts[f"{dx},{dy}"] = round(float(np.mean(vals)), 4)
out["footprint_shift_test_mean_share"] = shifts

# 3. Noise heuristic vs the official strategic Lden map.
pts = json.load(open("evidence/noise-app-points.json"))
cmp_rows = []
for p in pts:
    ue, un = enu_to_utm(p["e"], p["n"])
    q = urllib.parse.urlencode({"service": "WMS", "version": "1.3.0", "request": "GetFeatureInfo", "layers": "Strategiskstoykart_lden",
                                "query_layers": "Strategiskstoykart_lden", "crs": "EPSG:25833", "bbox": f"{ue - 10},{un - 10},{ue + 10},{un + 10}",
                                "width": 21, "height": 21, "i": 10, "j": 10, "info_format": "text/plain", "styles": "", "format": "image/png"})
    txt = fetch("https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows?" + q).decode("utf-8", "replace")
    m = re.search(r"STØYINTERVALL = (\d+)", txt)
    lo = int(m.group(1)) if m else None
    cmp_rows.append({**p, "official_lden_band_low": lo})
agree = [r for r in cmp_rows if r["appDb"] is not None]
def band_ok(r):
    lo = r["official_lden_band_low"]
    return (r["appDb"] < 55) if lo is None else (lo <= r["appDb"] < lo + 5)
diff = [r["appDb"] - (r["official_lden_band_low"] + 2.5) for r in agree if r["official_lden_band_low"] is not None]
out["noise_vs_official"] = {
    "points": len(cmp_rows), "official_band_counts": {str(k): sum(1 for r in cmp_rows if r["official_lden_band_low"] == k) for k in sorted({r["official_lden_band_low"] for r in cmp_rows}, key=lambda v: -1 if v is None else v)},
    "same_5dB_band_share": round(sum(band_ok(r) for r in agree) / len(agree), 3),
    "app_minus_band_mid_db_where_mapped": {"n": len(diff), "mean": round(float(np.mean(diff)), 1) if diff else None, "mean_abs": round(float(np.mean(np.abs(diff))), 1) if diff else None},
    "note": "App value is an indicative level, not Lden; official map is Lden at 4 m, CNOSSOS-EU (NorStøy 3.4), year 2021, 5 dB bands from 55.",
}
json.dump({"summary": out, "noise_points": cmp_rows, "buildings": rows}, open("evidence/registration-bench.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps(out, indent=1, ensure_ascii=False))
