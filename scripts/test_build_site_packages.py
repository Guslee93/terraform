"""Self-check for the road clipping in build_site_packages.py: python3 scripts/test_build_site_packages.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_site_packages import clip_polyline  # noqa: E402

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
