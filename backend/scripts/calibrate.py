"""
Homography calibration entry point.

Usage:
    python scripts/calibrate.py --video data/videos/game.mp4
    python scripts/calibrate.py --video data/videos/game.mp4 --output data/outputs/homography.npy --frame 30
"""

import argparse
import sys
from pathlib import Path

# Allow running from project root without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import DEFAULT_HOMOGRAPHY_PATH
from tracking.homography import run_calibration


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Interactively calibrate field homography by clicking 6 points."
    )
    parser.add_argument("--video",  required=True,  type=Path, help="Input video file")
    parser.add_argument("--output", default=DEFAULT_HOMOGRAPHY_PATH, type=Path,
                        help="Where to save homography.npy")
    parser.add_argument("--frame",  default=0, type=int,
                        help="Frame index to use for calibration (default: 0)")
    args = parser.parse_args()

    if not args.video.exists():
        print(f"Error: video not found: {args.video}", file=sys.stderr)
        sys.exit(1)

    run_calibration(args.video, args.output, frame_index=args.frame)


if __name__ == "__main__":
    main()
