"""
Player tracking pipeline: YOLOv8m + BoT-SORT → SQLite.

Main entry: track()
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path
from typing import Callable, Optional

import cv2
import numpy as np

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    DETECTION_CONF,
    DEFAULT_STRIDE,
    FIELD_TOTAL_LENGTH_YARDS,
    PERSON_CLASS_ID,
    PLAYING_FIELD_WIDTH_YARDS,
    TRACKER_CONFIG,
    YOLO_MODEL,
)
from tracking.db import insert_rows
from tracking.homography import load_homography, pixels_to_yards_batch


def track(
    video_path: Path,
    homography_path: Path,
    conn: sqlite3.Connection,
    *,
    stride: int = DEFAULT_STRIDE,
    conf: float = DETECTION_CONF,
    model_name: str = YOLO_MODEL,
    tracker_config: str = TRACKER_CONFIG,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> int:
    """
    Run detection + tracking on video_path, write rows to conn.

    Returns total number of rows inserted.
    """
    from ultralytics import YOLO

    H = load_homography(homography_path)

    model = YOLO(model_name)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    print(f"Video: {video_path.name}  |  frames: {total_frames}  |  stride: {stride}")
    print(f"Model: {model_name}  |  tracker: {tracker_config}  |  conf: {conf}")

    frame_no = 0
    rows_inserted = 0
    batch: list[tuple] = []
    BATCH_SIZE = 500

    # ultralytics stream generator — memory-efficient frame-by-frame processing
    results_gen = model.track(
        source=str(video_path),
        stream=True,
        tracker=tracker_config,
        conf=conf,
        classes=[PERSON_CLASS_ID],
        verbose=False,
    )

    for result in results_gen:
        if stride > 1 and frame_no % stride != 0:
            frame_no += 1
            continue

        boxes = result.boxes
        if boxes is not None and boxes.id is not None:
            # Extract arrays from GPU/CPU tensors
            xyxy       = boxes.xyxy.cpu().numpy()        # (N, 4)
            track_ids  = boxes.id.cpu().numpy().astype(int)  # (N,)
            confs      = boxes.conf.cpu().numpy()        # (N,)

            # Bounding-box centres
            cx = ((xyxy[:, 0] + xyxy[:, 2]) / 2).reshape(-1, 1)
            cy = xyxy[:, 3].reshape(-1, 1)   # bottom edge = feet on ground
            pixel_pts  = np.hstack([cx, cy]).astype(np.float32)

            yard_pts = pixels_to_yards_batch(H, pixel_pts)  # (N, 2)

            for i in range(len(track_ids)):
                x_yd, y_yd = float(yard_pts[i, 0]), float(yard_pts[i, 1])
                if not (0 <= x_yd <= FIELD_TOTAL_LENGTH_YARDS and
                        0 <= y_yd <= PLAYING_FIELD_WIDTH_YARDS):
                    continue  # outside field boundary — ref, coach, spectator
                batch.append((
                    frame_no,
                    int(track_ids[i]),
                    float(cx[i, 0]),
                    float(cy[i, 0]),
                    float(confs[i]),
                    x_yd,
                    y_yd,
                ))

            if len(batch) >= BATCH_SIZE:
                insert_rows(conn, batch)
                rows_inserted += len(batch)
                batch.clear()

        if progress_cb:
            progress_cb(frame_no, total_frames)
        elif frame_no % 300 == 0:
            pct = frame_no / max(total_frames, 1) * 100
            print(f"  frame {frame_no}/{total_frames}  ({pct:.1f}%)", flush=True)

        frame_no += 1

    # Flush remaining
    if batch:
        insert_rows(conn, batch)
        rows_inserted += len(batch)

    print(f"Done. {rows_inserted} rows inserted.")
    return rows_inserted
