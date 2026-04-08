"""
Smoke test — validates the full Phase 1 stack without a video file.

Tests:
  1. Config constants match IFAF 5-on-5 spec
  2. SQLite DB initialises and accepts rows
  3. Homography math: pixel → yards round-trip
  4. All package imports succeed (including ultralytics)
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

PASS = "\033[92m PASS\033[0m"
FAIL = "\033[91m FAIL\033[0m"
results = []


def check(label, fn):
    try:
        fn()
        print(f"{PASS}  {label}")
        results.append(True)
    except Exception as e:
        print(f"{FAIL}  {label}")
        print(f"       {e}")
        results.append(False)


# 1. Config constants
def test_config():
    from config import (
        FIELD_TOTAL_LENGTH_YARDS,
        PLAYING_FIELD_LENGTH_YARDS,
        PLAYING_FIELD_WIDTH_YARDS,
        END_ZONE_DEPTH_YARDS,
        NO_RUNNING_ZONE_YARDS,
    )
    assert FIELD_TOTAL_LENGTH_YARDS == 70,   f"Expected 70, got {FIELD_TOTAL_LENGTH_YARDS}"
    assert PLAYING_FIELD_LENGTH_YARDS == 50, f"Expected 50, got {PLAYING_FIELD_LENGTH_YARDS}"
    assert PLAYING_FIELD_WIDTH_YARDS == 25,  f"Expected 25, got {PLAYING_FIELD_WIDTH_YARDS}"
    assert END_ZONE_DEPTH_YARDS == 10,       f"Expected 10, got {END_ZONE_DEPTH_YARDS}"
    assert NO_RUNNING_ZONE_YARDS == 5,       f"Expected 5, got {NO_RUNNING_ZONE_YARDS}"
    assert PLAYING_FIELD_LENGTH_YARDS + 2 * END_ZONE_DEPTH_YARDS == FIELD_TOTAL_LENGTH_YARDS


# 2. SQLite DB init + insert
def test_db():
    import sqlite3
    from tracking.db import init_db, insert_rows, export_csv

    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        conn = init_db(db_path)

        rows = [
            (1, 42, 320.0, 240.0, 0.85, 12.5, 10.0),
            (1, 43, 400.0, 300.0, 0.91, 20.0, 15.0),
            (2, 42, 325.0, 242.0, 0.87, 12.8, 10.1),
        ]
        insert_rows(conn, rows)

        cur = conn.execute("SELECT COUNT(*) FROM tracking")
        assert cur.fetchone()[0] == 3

        csv_path = Path(tmp) / "out.csv"
        export_csv(conn, csv_path)
        lines = csv_path.read_text().strip().split("\n")
        assert len(lines) == 4  # header + 3 rows
        conn.close()


# 3. Homography transform
def test_homography():
    import numpy as np
    import cv2
    from tracking.homography import (
        CALIBRATION_YARD_COORDS,
        pixels_to_yards_batch,
        pixel_to_yards,
    )

    # Synthetic pixel points — corners of a 1280x720 frame
    pixel_corners = np.array([
        [0,    720],   # near-left
        [1280, 720],   # near-right
        [1280,   0],   # far-right
        [0,      0],   # far-left
        [640,  720],   # mid-left
        [640,    0],   # mid-right
    ], dtype=np.float32)

    yard_corners = CALIBRATION_YARD_COORDS

    H, _ = cv2.findHomography(pixel_corners, yard_corners, cv2.RANSAC, 5.0)
    assert H is not None

    # Near-left corner should map to (0, 0)
    x_yd, y_yd = pixel_to_yards(H, 0, 720)
    assert abs(x_yd) < 0.5 and abs(y_yd) < 0.5, f"Expected ~(0,0), got ({x_yd:.2f}, {y_yd:.2f})"

    # Far-right corner should map to (70, 25)
    x_yd, y_yd = pixel_to_yards(H, 1280, 0)
    assert abs(x_yd - 70) < 0.5 and abs(y_yd - 25) < 0.5, \
        f"Expected ~(70,25), got ({x_yd:.2f}, {y_yd:.2f})"

    # Batch version
    result = pixels_to_yards_batch(H, pixel_corners)
    assert result.shape == (6, 2)


# 4. Imports
def test_imports():
    import ultralytics        # noqa: F401
    import cv2                # noqa: F401
    import numpy              # noqa: F401
    import pandas             # noqa: F401
    import fastapi            # noqa: F401
    import anthropic          # noqa: F401
    from tracking import pipeline, db, homography  # noqa: F401
    from scripts import calibrate, track           # noqa: F401


# ---------------------------------------------------------------------------
print("\n=== Flag Football Tracker — Smoke Test ===\n")
check("Config: IFAF 5-on-5 field constants",   test_config)
check("SQLite: init, insert, CSV export",       test_db)
check("Homography: pixel → yards transform",   test_homography)
check("Imports: all Phase 1 modules",           test_imports)

passed = sum(results)
total  = len(results)
print(f"\n{'='*42}")
print(f"  {passed}/{total} tests passed")
print(f"{'='*42}\n")
sys.exit(0 if passed == total else 1)
