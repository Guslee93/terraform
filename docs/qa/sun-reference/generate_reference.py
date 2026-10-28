#!/usr/bin/env python3
"""
Independent NREL SPA solar reference for Terraform v1 (M3).

Generates azimuth/elevation for Oslo and Tromsø at:
  - The fixtures §4 verification timestamps
  - Every hour on the equinoxes and solstices of 2026

Uses pvlib (NREL SPA, the US Government's standard solar position algorithm).
Outputs JSON and CSV to docs/qa/sun-reference/.

pvlib 0.15.2 — https://pvlib-python.readthedocs.io/
Source: https://github.com/pvlib/pvlib-python
Citation:
  William F. Holmgren, Clifford W. Hansen, and Joshua M. Mikofski,
  "pvlib python: a python package for modeling solar energy systems,"
  Journal of Open Source Software, 3(29), 1066 (2018).
  DOI: 10.21105/joss.01066
"""

import json
import os
import zoneinfo
from datetime import datetime, timedelta

import pandas as pd
import pvlib.solarposition

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

SITES = {
    "oslo": {"lat": 59.9235, "lon": 10.758, "label": "Oslo"},
    "tromso": {"lat": 69.6492, "lon": 18.9553, "label": "Tromsø"},
}

TZ_OSLO = zoneinfo.ZoneInfo("Europe/Oslo")

# Fixtures §4 timestamps plus every hour on solstices/equinoxes
FIXTURE_DATES = [
    "2026-03-20",
    "2026-06-21",
    "2026-09-22",
    "2026-12-21",
]

FIXTURES = [
    ("2026-03-20 12:00", "Equinox noon (Oslo)"),
    ("2026-06-21 12:00", "Summer solstice noon"),
    ("2026-09-22 12:00", "Autumn equinox noon"),
    ("2026-12-21 12:00", "Winter solstice noon"),
    ("2026-12-21 23:00", "Winter solstice night"),
]


def make_local_times(local_date_str: str, site_lon: float) -> pd.DatetimeIndex:
    """Generate hourly local times for a date string, all day 00:00–23:00."""
    date = datetime.strptime(local_date_str, "%Y-%m-%d").date()
    times = []
    for hour in range(24):
        dt_local = datetime(date.year, date.month, date.day, hour, 0, 0, tzinfo=TZ_OSLO)
        times.append(dt_local)
    return pd.DatetimeIndex(times)


def compute_spa(
    local_times: pd.DatetimeIndex,
    lat: float,
    lon: float,
) -> pd.DataFrame:
    """Compute SPA solar position for local times at a WGS84 location."""
    # pvlib expects UTC timestamps; localise the index from Europe/Oslo zoneinfo
    utc_times = local_times.tz_convert("UTC")
    result = pvlib.solarposition.get_solarposition(
        utc_times, lat, lon
    )
    # SPA returns azimuth (degrees east of north), zenith, elevation
    # apparent_elevation/zenith include refraction
    return result


def format_row(
    local_ts: pd.Timestamp,
    row: pd.Series,
    label: str,
    site_key: str,
) -> dict:
    """One output row."""
    dt_local = local_ts.to_pydatetime()
    return {
        "site": site_key,
        "label": label,
        "local_datetime": dt_local.strftime("%Y-%m-%d %H:%M %Z"),
        "utc_datetime": local_ts.tz_convert("UTC").strftime("%Y-%m-%d %H:%M UTC"),
        "apparent_elevation": round(row["apparent_elevation"], 4),
        "apparent_zenith": round(row["apparent_zenith"], 4),
        "elevation": round(row["elevation"], 4),
        "zenith": round(row["zenith"], 4),
        "azimuth": round(row["azimuth"], 4),
        "equation_of_time": round(row["equation_of_time"], 4),
    }


def main():
    all_rows = []

    for site_key, site in SITES.items():
        lat, lon, label = site["lat"], site["lon"], site["label"]

        # Fixtures
        for ts_str, ts_label in FIXTURES:
            dt_local = datetime.strptime(ts_str, "%Y-%m-%d %H:%M").replace(tzinfo=TZ_OSLO)
            times = pd.DatetimeIndex([dt_local])
            result = compute_spa(times, lat, lon)
            row = format_row(times[0], result.iloc[0], ts_label, site_key)
            all_rows.append(row)

        # Hourly grids
        for date_str in FIXTURE_DATES:
            hourly = make_local_times(date_str, lon)
            result = compute_spa(hourly, lat, lon)
            for i, ts_local in enumerate(hourly):
                row = format_row(ts_local, result.iloc[i], f"{date_str} hourly", site_key)
                all_rows.append(row)

    df = pd.DataFrame(all_rows)

    # Write JSON
    json_path = os.path.join(OUTPUT_DIR, "nrel_spa_reference.json")
    with open(json_path, "w") as f:
        json.dump(all_rows, f, indent=2, ensure_ascii=False)

    # Write CSV
    csv_path = os.path.join(OUTPUT_DIR, "nrel_spa_reference.csv")
    df.to_csv(csv_path, index=False)

    print(f"Written {len(all_rows)} rows to:")
    print(f"  {json_path}")
    print(f"  {csv_path}")

    # Summary for verification table
    print("\n=== Fixtures §4 verification values ===")
    for site_key in SITES:
        print(f"\n--- {SITES[site_key]['label']} ---")
        for ts_str, ts_label in FIXTURES:
            matches = [
                r
                for r in all_rows
                if r["site"] == site_key and r["label"] == ts_label
            ]
            if matches:
                m = matches[0]
                elev = m["apparent_elevation"] if not pd.isna(m["apparent_elevation"]) else m["elevation"]
                print(
                    f"  {ts_str}: azimuth={m['azimuth']:.2f}°  "
                    f"elevation={elev:.2f}°"
                )


if __name__ == "__main__":
    main()