"""
Homography utilities: coordinate transform and interactive calibration.

Calibration expects the user to click 6 points in this order:

    Point 0 — near-left  corner  (back of near end zone,  left  sideline) → (  0,  0)
    Point 1 — near-right corner  (back of near end zone,  right sideline) → (  0, 25)
    Point 2 — far-right  corner  (back of far  end zone,  right sideline) → ( 70, 25)
    Point 3 — far-left   corner  (back of far  end zone,  left  sideline) → ( 70,  0)
    Point 4 — mid-left   sideline (midfield,              left  sideline) → ( 35,  0)
    Point 5 — mid-right  sideline (midfield,              right sideline) → ( 35, 25)

Coordinate system:
    Origin (0, 0) = back-left corner of the near end zone.
    X = yards along field length (0 → 70).
    Y = yards along field width  (0 → 25).
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from config import (
    FIELD_TOTAL_LENGTH_YARDS,
    PLAYING_FIELD_WIDTH_YARDS,
)

# Real-world yard coordinates for the 6 calibration points (x_yd, y_yd).
CALIBRATION_YARD_COORDS = np.array(
    [
        [0,                         0],
        [0,                         PLAYING_FIELD_WIDTH_YARDS],
        [FIELD_TOTAL_LENGTH_YARDS,  PLAYING_FIELD_WIDTH_YARDS],
        [FIELD_TOTAL_LENGTH_YARDS,  0],
        [FIELD_TOTAL_LENGTH_YARDS / 2, 0],
        [FIELD_TOTAL_LENGTH_YARDS / 2, PLAYING_FIELD_WIDTH_YARDS],
    ],
    dtype=np.float32,
)

POINT_LABELS = [
    "0: near-left corner",
    "1: near-right corner",
    "2: far-right corner",
    "3: far-left corner",
    "4: mid-left sideline",
    "5: mid-right sideline",
]


# ---------------------------------------------------------------------------
# Transform
# ---------------------------------------------------------------------------

def load_homography(path: Path) -> np.ndarray:
    H = np.load(path)
    if H.shape != (3, 3):
        raise ValueError(f"Expected 3x3 homography matrix, got {H.shape}")
    return H


def pixel_to_yards(H: np.ndarray, x_px: float, y_px: float) -> tuple[float, float]:
    """Transform a single pixel coordinate to yard coordinates."""
    pt = np.array([[[x_px, y_px]]], dtype=np.float32)
    result = cv2.perspectiveTransform(pt, H)
    x_yd, y_yd = result[0, 0]
    return float(x_yd), float(y_yd)


def pixels_to_yards_batch(H: np.ndarray, points: np.ndarray) -> np.ndarray:
    """
    Transform N pixel points to yard coordinates.

    points: shape (N, 2) float32
    returns: shape (N, 2) float32
    """
    pts = points.reshape(-1, 1, 2).astype(np.float32)
    result = cv2.perspectiveTransform(pts, H)
    return result.reshape(-1, 2)


# ---------------------------------------------------------------------------
# Interactive calibration
# ---------------------------------------------------------------------------

def _draw_overlay(frame: np.ndarray, clicks: list[tuple[int, int]], next_idx: int) -> np.ndarray:
    overlay = frame.copy()
    h, w = overlay.shape[:2]

    # Semi-transparent instruction panel
    panel_h = 30 + len(POINT_LABELS) * 22 + 20
    cv2.rectangle(overlay, (10, 10), (340, 10 + panel_h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, overlay)

    cv2.putText(overlay, "Click calibration points in order:", (15, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    for i, label in enumerate(POINT_LABELS):
        y = 54 + i * 22
        if i < len(clicks):
            color = (0, 200, 0)
            status = f"  {label}"
        elif i == next_idx:
            color = (0, 200, 255)
            status = f"> {label}  <-- click here"
        else:
            color = (150, 150, 150)
            status = f"  {label}"
        cv2.putText(overlay, status, (15, y), cv2.FONT_HERSHEY_SIMPLEX, 0.48, color, 1)

    # Draw confirmed clicks
    for idx, (cx, cy) in enumerate(clicks):
        cv2.circle(overlay, (cx, cy), 6, (0, 200, 0), -1)
        cv2.putText(overlay, str(idx), (cx + 8, cy - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 0), 2)

    return overlay


def run_calibration(
    video_path: Path,
    output_path: Path,
    frame_index: int = 0,
) -> np.ndarray:
    """
    Open an OpenCV window for the user to click 6 calibration points.
    Computes homography, prints reprojection error, and saves to output_path.
    Returns the 3x3 homography matrix.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        raise RuntimeError(f"Could not read frame {frame_index} from {video_path}")

    clicks: list[tuple[int, int]] = []
    window = "Homography Calibration — press R to restart, Q to quit"

    def on_mouse(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN and len(clicks) < 6:
            clicks.append((x, y))

    cv2.namedWindow(window, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(window, on_mouse)

    while True:
        display = _draw_overlay(frame, clicks, len(clicks))
        cv2.imshow(window, display)
        key = cv2.waitKey(20) & 0xFF

        if key == ord("r") or key == ord("R"):
            clicks.clear()
        elif key == ord("q") or key == ord("Q"):
            cv2.destroyAllWindows()
            raise RuntimeError("Calibration cancelled by user.")
        elif len(clicks) == 6:
            cv2.destroyAllWindows()
            break

    pixel_pts = np.array(clicks, dtype=np.float32)
    yard_pts  = CALIBRATION_YARD_COORDS

    H, mask = cv2.findHomography(pixel_pts, yard_pts, cv2.RANSAC, 5.0)
    if H is None:
        raise RuntimeError("findHomography failed — try clicking more accurate points.")

    # Reprojection error
    projected = pixels_to_yards_batch(H, pixel_pts)
    errors = np.linalg.norm(projected - yard_pts, axis=1)
    print(f"\nCalibration complete.")
    print(f"  Reprojection errors (yards): {errors.round(3)}")
    print(f"  Mean: {errors.mean():.3f} yd   Max: {errors.max():.3f} yd")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    np.save(output_path, H)
    print(f"  Saved → {output_path}\n")

    return H
