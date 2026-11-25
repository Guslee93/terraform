# Feasibility scratch (isolated, not product code)

Throwaway tests and evidence for `docs/feasibility/01–09`. Nothing here is imported by `src/`, and `npm run test` does not include it (own `vitest.config.ts`).

Not committed (regenerate):
- `.venv/`: `python3 -m venv .venv && .venv/bin/pip install pyproj==3.6.1 numpy==2.2.6 tifffile==2024.8.30 certifi`
- `dtm_site_600m.tif`: the URL in `evidence/dtm-wcs-request.txt` (checksum in `evidence/dtm_site_600m.sha256`)
- `dom_site_600m.tif`: written by `registration_bench.py`
- `dtm_enu.bin`, `dom_enu.bin`: the resample step in 09 §3 (see `enu_raster.json`)
- `registration/scene.json`: `.venv/bin/python -I registration/prep.py`
- `evidence/pvgis-*.json` (raw PVGIS; redistribution terms unconfirmed): the URLs in 04 §5 / 02 row 23

Commands per test: see `docs/feasibility/04_POC_TEST_RESULTS.md` and `09_FOUNDATION_VERIFICATION.md`.
