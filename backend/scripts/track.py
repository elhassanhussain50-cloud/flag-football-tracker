"""
Tracking entry point.

Usage:
    python scripts/track.py --video data/videos/game.mp4 --homography data/outputs/homography.npy
    python scripts/track.py --video data/videos/game.mp4 --homography data/outputs/homography.npy \\
        --output data/outputs/tracking.db --stride 2 --export-csv
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    DEFAULT_HOMOGRAPHY_PATH,
    DEFAULT_TRACKING_CSV,
    DEFAULT_TRACKING_DB,
    DEFAULT_STRIDE,
    DETECTION_CONF,
    YOLO_MODEL,
    TRACKER_CONFIG,
)
from tracking.db import init_db, export_csv
from tracking.pipeline import track


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Track players in a flag football video and store results in SQLite."
    )
    parser.add_argument("--video",      required=True, type=Path,
                        help="Input video file")
    parser.add_argument("--homography", default=DEFAULT_HOMOGRAPHY_PATH, type=Path,
                        help="Path to homography.npy (from calibrate.py)")
    parser.add_argument("--output",     default=DEFAULT_TRACKING_DB, type=Path,
                        help="Output SQLite database path")
    parser.add_argument("--stride",     default=DEFAULT_STRIDE, type=int,
                        help="Process every Nth frame (default: 1 = every frame)")
    parser.add_argument("--conf",       default=DETECTION_CONF, type=float,
                        help="Detection confidence threshold (default: 0.4)")
    parser.add_argument("--model",      default=YOLO_MODEL,
                        help="YOLOv8 model name (default: yolov8m.pt)")
    parser.add_argument("--tracker",    default=TRACKER_CONFIG,
                        help="Ultralytics tracker config (default: botsort.yaml)")
    parser.add_argument("--export-csv", action="store_true",
                        help="Also export tracking.csv after run")
    args = parser.parse_args()

    for p, name in [(args.video, "video"), (args.homography, "homography")]:
        if not p.exists():
            print(f"Error: {name} file not found: {p}", file=sys.stderr)
            sys.exit(1)

    conn = init_db(args.output)

    track(
        video_path=args.video,
        homography_path=args.homography,
        conn=conn,
        stride=args.stride,
        conf=args.conf,
        model_name=args.model,
        tracker_config=args.tracker,
    )

    if args.export_csv:
        csv_path = DEFAULT_TRACKING_CSV
        export_csv(conn, csv_path)
        print(f"CSV exported → {csv_path}")

    conn.close()
    print(f"Tracking database → {args.output}")


if __name__ == "__main__":
    main()
