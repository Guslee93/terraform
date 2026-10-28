#!/usr/bin/env python3
"""D31 — Europe/Oslo DST fixture generator for Terraform v1 (M3).

Lists every Europe/Oslo DST transition for 2026-2028 and records, per transition:
  - the UTC instant of the transition
  - local times inside the spring-forward GAP (e.g. 02:30) mapped to the
    instant zoneinfo resolves (the "shifted" instant, displayed as 03:30)
  - local times inside the autumn OVERLAP with BOTH possible instants
    (fold=0 earlier/CEST and fold=1 later/CET)
  - normal-day controls

Uses stdlib zoneinfo only; tzdata version recorded in the output.

Run from repo root:
  python3 src/features/analysis/__fixtures__/generate_dst_fixtures.py
Writes src/features/analysis/__fixtures__/dst-oslo.json
"""

import json
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Oslo")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dst-oslo.json")
START_YEAR, END_YEAR = 2026, 2028


def find_transitions(start, end):
    """Yield (utc_instant) for each DST boundary between start and end."""
    prev_offset = start.astimezone(TZ).utcoffset()
    day = start
    while day < end:
        t = day + timedelta(hours=12)  # midday probe avoids the midnight edge
        off = t.astimezone(TZ).utcoffset()
        if off != prev_offset:
            # Binary search the exact UTC transition instant within this day.
            lo, hi = day, day + timedelta(hours=24)
            while hi - lo > timedelta(seconds=0.5):
                mid = lo + (hi - lo) / 2
                if mid.astimezone(TZ).utcoffset() == off:
                    hi = mid
                else:
                    lo = mid
            yield hi
            prev_offset = off
        day += timedelta(days=1)


def resolve_gap(local, pre_offset=None):
    """Map a gap (nonexistent) local time to the instant that would have existed.

    Gap times in the spring-forward are skipped by the local clock. The correct
    mapping is: attach the pre-transition UTC offset (CET, UTC+1) to the local
    wall-clock, then convert to UTC. That instant displays as 03:30 under the
    post-transition offset CEST.
    """
    if pre_offset is None:
        pre_offset = timedelta(hours=1)  # CET
    fixed_local = local.replace(tzinfo=timezone(pre_offset))
    instant = fixed_local.astimezone(timezone.utc)
    return {
        "local": local.strftime("%Y-%m-%d %H:%M"),
        "utc_instant": instant.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "displayed_post": instant.astimezone(TZ).strftime("%Y-%m-%d %H:%M %Z"),
        "note": (
            "gap (this wall-clock never occurred); mapped via pre-transition "
            "offset to UTC instant; displays as post-transition offset time"
        ),
    }


def resolve_overlap(local, fold):
    """Resolve an ambiguous local time for one fold (both instants exist).

    fold=0 is the earlier/summer occurrence (CEST, UTC+2); fold=1 is the
    later/winter occurrence (CET, UTC+1). Python's zoneinfo fold attribute
    selects which offset to use for the wall-clock time.
    """
    tz_aware = local.replace(fold=fold, tzinfo=TZ)
    instant = tz_aware.astimezone(timezone.utc)
    return {
        "local": local.strftime("%Y-%m-%d %H:%M"),
        "fold": fold,
        "utc_instant": instant.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "displayed_local": instant.astimezone(TZ).strftime("%Y-%m-%d %H:%M %Z"),
        "note": "overlap (time occurred twice); "
        f"fold={fold} is the {'earlier (CEST)' if fold == 0 else 'later (CET)'} occurrence",
    }


def normal_day_controls(year):
    """Fixed local times on transition-free days."""
    rows = []
    for month, day in ((7, 10), (1, 10)):
        local = datetime(year, month, day, 12, 0)
        # Attach Europe/Oslo zoneinfo (on a normal day this uniquely resolves)
        tz_aware = local.replace(tzinfo=TZ)
        instant = tz_aware.astimezone(timezone.utc)
        rows.append(
            {
                "control": f"normal {year}-{month:02d}-{day:02d} 12:00",
                "local": local.strftime("%Y-%m-%d %H:%M"),
                "utc_instant": instant.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "displayed_local": instant.astimezone(TZ).strftime("%Y-%m-%d %H:%M %Z"),
                "note": "normal day control (no transition nearby)",
            }
        )
    return rows


def case_times(date):
    """Local wall-clock probes around the transition hour."""
    return [
        datetime(date.year, date.month, date.day, 2, 15),
        datetime(date.year, date.month, date.day, 2, 30),
        datetime(date.year, date.month, date.day, 2, 45),
    ]


def main():
    start = datetime(START_YEAR, 1, 1, tzinfo=timezone.utc)
    end = datetime(END_YEAR, 12, 31, 23, 59, tzinfo=timezone.utc)
    transitions = []
    for utc_instant in find_transitions(start, end):
        before = (utc_instant - timedelta(seconds=1)).astimezone(TZ)
        after = (utc_instant + timedelta(seconds=1)).astimezone(TZ)
        gap = after.utcoffset() > before.utcoffset()
        record = {
            "transition_utc_instant": utc_instant.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "local_before": before.strftime("%Y-%m-%d %H:%M %Z"),
            "local_after": after.strftime("%Y-%m-%d %H:%M %Z"),
            "kind": "gap" if gap else "overlap",
            "offset_before": str(before.utcoffset()),
            "offset_after": str(after.utcoffset()),
            "cases": [],
        }
        for probe in case_times(before.date()):
            if gap:
                record["cases"].append(resolve_gap(probe))
            else:
                record["cases"].append(resolve_overlap(probe, fold=0))
                record["cases"].append(resolve_overlap(probe, fold=1))
        transitions.append(record)

    controls = []
    for transition in transitions:
        year = int(transition["local_after"][:4])
        controls.extend(normal_day_controls(year))

    import tzdata

    payload = {
        "$schema": "dst-oslo-v1",
        "timezone": "Europe/Oslo",
        "notes": (
            "Gap local times map to the instant zoneinfo resolves (pre-transition "
            "offset), which is what a time scrubber must jump to. Overlap local "
            "times carry both folds. tzdata version is the authoritative rule set."
        ),
        "tzdata_version": tzdata.__version__,
        "transitions": transitions,
        "controls": controls,
    }

    with open(OUT, "w") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")

    for t in transitions:
        print(
            f"{t['kind']:>7} {t['local_before']} -> {t['local_after']} "
            f"({t['offset_before']} -> {t['offset_after']})"
        )
        for case in t["cases"][:2]:
            print(f"    {case['local']} -> {case['utc_instant']} ({case.get('displayed_local', case.get('displayed_post', '?'))})")
    print(f"\nWrote {OUT} — {len(transitions)} transitions, {len(controls)} controls")


if __name__ == "__main__":
    main()
