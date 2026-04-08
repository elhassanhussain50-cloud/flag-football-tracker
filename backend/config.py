"""
Project-wide configuration.

Field dimensions: IFAF Flag Football Rules 2023, "Dimensions of Fields" (p.8)
Format: Flag Football 5 on 5 (regular field 50 x 25 yd)
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# IFAF 5-on-5 field dimensions (yards)
# Origin (0, 0) = back-left corner of the near end zone.
# X-axis: along the field length (0 → 70 yd, near-end to far-end).
# Y-axis: along the field width  (0 → 25 yd, left sideline to right sideline).
# ---------------------------------------------------------------------------
PLAYING_FIELD_LENGTH_YARDS: int = 50   # between the two goal lines
PLAYING_FIELD_WIDTH_YARDS: int  = 25   # sideline to sideline
END_ZONE_DEPTH_YARDS: int       = 10   # depth of each end zone
FIELD_TOTAL_LENGTH_YARDS: int   = 70   # PLAYING_FIELD_LENGTH + 2 * END_ZONE_DEPTH
NO_RUNNING_ZONE_YARDS: int      = 5    # 5 yd from each goal line into playing field

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT   = Path(__file__).parent.parent   # repo root (one level above backend/)
DATA_DIR       = PROJECT_ROOT / "data"
VIDEOS_DIR     = DATA_DIR / "videos"
OUTPUTS_DIR    = DATA_DIR / "outputs"

DEFAULT_HOMOGRAPHY_PATH = OUTPUTS_DIR / "homography.npy"
DEFAULT_TRACKING_DB     = OUTPUTS_DIR / "tracking.db"
DEFAULT_TRACKING_CSV    = OUTPUTS_DIR / "tracking.csv"

# ---------------------------------------------------------------------------
# Tracker defaults
# ---------------------------------------------------------------------------
YOLO_MODEL          = "yolov8m.pt"
TRACKER_CONFIG      = "botsort.yaml"   # built into ultralytics
DETECTION_CONF      = 0.4
PERSON_CLASS_ID     = 0                # COCO class 0 = person
DEFAULT_STRIDE      = 1                # process every frame
