"""Throwaway terrain benchmarks on the Kartverket DTM1 tile at Compact Infill.

Run: .venv/bin/python -I terrain_bench.py  (needs dtm_site_600m.tif from the WCS request in
evidence/dtm-wcs-request.txt). Writes evidence/terrain-bench.json and evidence/flow-accumulation.png.

1. Two Kartverket services agree (WCS raster vs height point API).
2. Slope (Horn 1981) and profile against analytic surfaces.
3. Cut/fill on a grid against an analytic volume.
4. D8 flow on a depression-filled DEM (priority flood, Barnes et al. 2014): conservation, runtime.
"""
import heapq
import json
import ssl
import struct
import time
import urllib.parse
import urllib.request
import zlib

import certifi
import numpy as np
import tifffile
from pyproj import Transformer

TIF = "dtm_site_600m.tif"
X0, Y0_TOP, CELL = 262653.0, 6650790.0, 1.0  # from ModelTiepoint / ModelPixelScale of the tile
CTX = ssl.create_default_context(cafile=certifi.where())
out = {}


def bilinear(z, x, y):
    """z[row, col]; x east, y north in EPSG:25833; pixel centres at +0.5."""
    c = (x - X0) / CELL - 0.5
    r = (Y0_TOP - y) / CELL - 0.5
    c0, r0 = int(np.floor(c)), int(np.floor(r))
    fc, fr = c - c0, r - r0
    q = z[r0:r0 + 2, c0:c0 + 2]
    return float(q[0, 0] * (1 - fc) * (1 - fr) + q[0, 1] * fc * (1 - fr) + q[1, 0] * (1 - fc) * fr + q[1, 1] * fc * fr)


def horn_slope_deg(z, cell=1.0):
    p = np.pad(z, 1, mode="edge")
    a, b, c = p[:-2, :-2], p[:-2, 1:-1], p[:-2, 2:]
    d, f = p[1:-1, :-2], p[1:-1, 2:]
    g, h, i = p[2:, :-2], p[2:, 1:-1], p[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * cell)
    dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * cell)
    return np.degrees(np.arctan(np.hypot(dzdx, dzdy)))


EPS = 1e-5  # m per cell along a filled flat


def priority_flood(z):
    """Fill depressions (Barnes et al. 2014, Priority-Flood+Epsilon): returns the filled DEM."""
    rows, cols = z.shape
    filled = z.copy()
    seen = np.zeros(z.shape, bool)
    pq = []
    for r in range(rows):
        for c in (0, cols - 1):
            heapq.heappush(pq, (filled[r, c], r, c)); seen[r, c] = True
    for c in range(1, cols - 1):
        for r in (0, rows - 1):
            heapq.heappush(pq, (filled[r, c], r, c)); seen[r, c] = True
    while pq:
        h, r, c = heapq.heappop(pq)
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                rr, cc = r + dr, c + dc
                if (dr or dc) and 0 <= rr < rows and 0 <= cc < cols and not seen[rr, cc]:
                    seen[rr, cc] = True
                    if filled[rr, cc] <= h:
                        filled[rr, cc] = h + EPS  # Priority-Flood+Epsilon: filled cells keep a drop to the outlet
                    heapq.heappush(pq, (filled[rr, cc], rr, cc))
    return filled


def d8_accumulation(z):
    """D8 receivers on an epsilon-filled DEM; returns
    accumulation in cells (each cell contributes 1) and the count of cells that drain off-grid."""
    rows, cols = z.shape
    n = rows * cols
    zz = z  # epsilon fill leaves no flats, so no tie-break is needed
    p = np.pad(zz, 1, mode="constant", constant_values=-1e9)  # the edge is the outlet
    best = np.zeros(z.shape); recv = np.full(z.shape, -1, np.int64)
    rr, cc = np.indices(z.shape)
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if not (dr or dc):
                continue
            drop = (zz - p[1 + dr:1 + dr + rows, 1 + dc:1 + dc + cols]) / np.hypot(dr, dc)
            better = drop > best
            best = np.where(better, drop, best)
            tr, tc = rr + dr, cc + dc
            inside = (tr >= 0) & (tr < rows) & (tc >= 0) & (tc < cols)
            recv = np.where(better, np.where(inside, tr * cols + tc, -2), recv)
    recv = recv.ravel()
    order = np.argsort(-zz.ravel(), kind="stable")  # high to low
    acc = np.ones(n)
    for i in order:
        j = recv[i]
        if j >= 0:
            acc[j] += acc[i]
    off_grid = float(acc[recv == -2].sum())
    pits = int((recv == -1).sum())
    return acc.reshape(z.shape), off_grid, pits


def write_png(path, img):
    h, w = img.shape
    raw = b"".join(b"\x00" + img[r].tobytes() for r in range(h))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


z = tifffile.imread(TIF).astype(np.float64)
out["tile"] = {"shape": z.shape, "min": round(z.min(), 2), "max": round(z.max(), 2), "mean": round(z.mean(), 2),
               "nodata_cells": int(np.isnan(z).sum())}

# 1. Cross-service agreement: 25 points on a 5x5 lattice inside the tile.
to_ll = Transformer.from_crs(25833, 4326, always_xy=True)
pts = [(X0 + 60 + 120 * i, Y0_TOP - 60 - 120 * j) for i in range(5) for j in range(5)]
ll = [to_ll.transform(x, y) for x, y in pts]
q = "[" + ",".join(f"[{lon:.7f},{lat:.7f}]" for lon, lat in ll) + "]"
url = "https://ws.geonorge.no/hoydedata/v1/punkt?koordsys=4326&punkter=" + urllib.parse.quote(q)
api = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "terraform-feasibility-probe/0.1"}), context=CTX, timeout=30))
diffs = []
for (x, y), p in zip(pts, api["punkter"]):
    if p.get("z") is not None:
        diffs.append(bilinear(z, x, y) - p["z"])
d = np.array(diffs)
out["cross_service"] = {"points": len(d), "sources": sorted({p.get("datakilde") for p in api["punkter"]}),
                        "mean_diff_m": round(d.mean(), 3), "max_abs_diff_m": round(np.abs(d).max(), 3),
                        "rmse_m": round(float(np.sqrt((d ** 2).mean())), 3)}
E, N = Transformer.from_crs(4326, 25833, always_xy=True).transform(10.758, 59.9235)
out["origin"] = {"utm33": [round(E, 2), round(N, 2)], "dtm_bilinear_m": round(bilinear(z, E, N), 3),
                 "point_api_m": 20.42, "curated_manifest_originElevation_m": 20.28}

# 2. Slope and profile against analytic surfaces.
yy, xx = np.mgrid[0:200, 0:200].astype(float)
plane = 0.10 * xx + 0.05 * yy
exact = np.degrees(np.arctan(np.hypot(0.10, 0.05)))
s_plane = horn_slope_deg(plane)[1:-1, 1:-1]
r2 = (xx - 100) ** 2 + (yy - 100) ** 2
bowl = 0.002 * r2  # z = k r^2 -> |grad| = 2 k r
s_bowl = horn_slope_deg(bowl)[2:-2, 2:-2]
exact_bowl = np.degrees(np.arctan(2 * 0.002 * np.sqrt(r2)))[2:-2, 2:-2]
s_site = horn_slope_deg(z)
out["slope"] = {
    "plane_exact_deg": round(exact, 6), "plane_max_err_deg": float(np.abs(s_plane - exact).max()),
    "paraboloid_max_err_deg": round(float(np.abs(s_bowl - exact_bowl).max()), 6),
    "site_percentiles_deg": {k: round(float(np.percentile(s_site, k)), 2) for k in (50, 90, 99)},
    "site_share_over_15deg": round(float((s_site > 15).mean()), 4),
}
line = [(X0 + 10 + t, Y0_TOP - 300) for t in range(0, 580)]
prof = [bilinear(z, x, y) for x, y in line]
rc, cc_ = np.mgrid[0:200, 0:200].astype(float)
za = 0.10 * (cc_ + 0.5) + 0.05 * -(rc + 0.5)  # pixel centres: east = c + 0.5, north = -(r + 0.5) from the corner
plane_prof_err = max(abs(bilinear(za, X0 + 20 + t * 0.37, Y0_TOP - 120.3) - (0.10 * (20 + t * 0.37) + 0.05 * -120.3)) for t in range(300))
out["profile"] = {"we_section_len_m": 579, "min_m": round(min(prof), 2), "max_m": round(max(prof), 2),
                  "analytic_plane_max_err_m": float(plane_prof_err)}

# 3. Cut/fill: a 40 x 40 m pad levelled at its mean on the tilted plane z = 0.1 x.
L = 20
gx = np.arange(-L + 0.5, L, 1.0)
X, _ = np.meshgrid(gx, gx)
dz = 0.1 * X - 0.0
cut, fill = float(dz[dz > 0].sum()), float(-dz[dz < 0].sum())
out["cut_fill"] = {"analytic_each_m3": 0.1 * L ** 3, "grid_cut_m3": cut, "grid_fill_m3": fill}

# 4. Flow: conservation on a synthetic tilted valley, then the site tile.
vy, vx = np.mgrid[0:150, 0:150].astype(float)
valley = np.abs(vx - 75) * 0.2 + vy * 0.05 + 1.0
t0 = time.perf_counter(); facc_v, off_v, pits_v = d8_accumulation(priority_flood(valley)); tv = time.perf_counter() - t0
t0 = time.perf_counter(); filled = priority_flood(z); t_fill = time.perf_counter() - t0
t0 = time.perf_counter(); facc, off, pits = d8_accumulation(filled); t_acc = time.perf_counter() - t0
depth = filled - z
out["flow"] = {
    "synthetic_cells": valley.size, "synthetic_off_grid_sum": off_v, "synthetic_pits": pits_v,
    "synthetic_max_acc_on_axis": float(facc_v[:, 75].max()), "synthetic_runtime_s": round(tv, 2),
    "site_cells": z.size, "site_fill_s": round(t_fill, 2), "site_d8_acc_s": round(t_acc, 2),
    "site_conservation_off_grid_over_cells": off / z.size, "site_pits_after_fill": pits,
    "site_cells_filled_over_5cm": int((depth > 0.05).sum()), "site_max_fill_depth_m": round(float(depth.max()), 2),
    "site_filled_volume_m3": round(float(depth.sum()), 1),
    "note": "DTM is bare earth: buildings are absent, so flow crosses building footprints; no pipes, no infiltration.",
}
img = np.log1p(facc); img = (255 * (1 - img / img.max())).astype(np.uint8)
write_png("evidence/flow-accumulation.png", img)
json.dump(out, open("evidence/terrain-bench.json", "w"), indent=1)
print(json.dumps(out, indent=1))
