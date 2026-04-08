"""
Visualize tracking results.

Modes:
  video  — annotated video with player IDs drawn on original footage
  field  — top-down field diagram with player position trails (saved as PNG)
  both   — run both

Usage:
  python scripts/visualize.py --mode video --db data/outputs/tracking.db \\
      --video "data/videos/game.mp4" --output data/outputs/annotated.mp4

  python scripts/visualize.py --mode field --db data/outputs/tracking.db \\
      --output data/outputs/field_map.png

  python scripts/visualize.py --mode both --db data/outputs/tracking.db \\
      --video "data/videos/game.mp4"
"""

from __future__ import annotations

import argparse
import colorsys
import sqlite3
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    END_ZONE_DEPTH_YARDS,
    FIELD_TOTAL_LENGTH_YARDS,
    NO_RUNNING_ZONE_YARDS,
    OUTPUTS_DIR,
    PLAYING_FIELD_WIDTH_YARDS,
)


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _id_color(player_id: int) -> tuple[int, int, int]:
    """Deterministic BGR colour per player ID."""
    hue = (player_id * 0.618033988749895) % 1.0
    r, g, b = colorsys.hsv_to_rgb(hue, 0.85, 0.95)
    return int(b * 255), int(g * 255), int(r * 255)


# ---------------------------------------------------------------------------
# Annotated video
# ---------------------------------------------------------------------------

def render_video(
    video_path: Path,
    db_path: Path,
    output_path: Path,
    trail_frames: int = 15,
) -> None:
    conn = sqlite3.connect(db_path)

    # Load all tracking data into memory (grouped by frame)
    rows = conn.execute(
        "SELECT frame_no, player_id, x_pixel, y_pixel FROM tracking ORDER BY frame_no"
    ).fetchall()
    conn.close()

    from collections import defaultdict
    frame_data: dict[int, list[tuple[int, float, float]]] = defaultdict(list)
    for frame_no, pid, xp, yp in rows:
        frame_data[frame_no].append((pid, xp, yp))

    # Trail: last N positions per player
    trail: dict[int, list[tuple[int, int]]] = defaultdict(list)

    cap = cv2.VideoCapture(str(video_path))
    fps    = cap.get(cv2.CAP_PROP_FPS) or 30
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    frame_no = 0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Rendering annotated video → {output_path}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        detections = frame_data.get(frame_no, [])
        for pid, xp, yp in detections:
            cx, cy = int(xp), int(yp)
            color = _id_color(pid)
            trail[pid].append((cx, cy))
            if len(trail[pid]) > trail_frames:
                trail[pid].pop(0)

        # Draw trails
        for pid, pts in trail.items():
            color = _id_color(pid)
            for i in range(1, len(pts)):
                alpha = i / len(pts)
                faded = tuple(int(c * alpha) for c in color)
                cv2.line(frame, pts[i - 1], pts[i], faded, 2)

        # Draw current positions
        for pid, xp, yp in detections:
            cx, cy = int(xp), int(yp)
            color = _id_color(pid)
            cv2.circle(frame, (cx, cy), 10, color, -1)
            cv2.circle(frame, (cx, cy), 10, (255, 255, 255), 2)
            cv2.putText(frame, str(pid), (cx + 12, cy + 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Frame counter
        cv2.putText(frame, f"frame {frame_no}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

        writer.write(frame)

        if frame_no % 60 == 0:
            print(f"  {frame_no}/{total}", flush=True)

        frame_no += 1

    cap.release()
    writer.release()
    print(f"Done → {output_path}")


# ---------------------------------------------------------------------------
# Top-down field map
# ---------------------------------------------------------------------------

def render_field_map(
    db_path: Path,
    output_path: Path,
    trail_alpha: float = 0.15,
) -> None:
    try:
        import matplotlib.pyplot as plt
        import matplotlib.patches as patches
    except ImportError:
        print("matplotlib not installed — run: uv pip install matplotlib")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT player_id, x_yards, y_yards FROM tracking ORDER BY frame_no"
    ).fetchall()
    conn.close()

    from collections import defaultdict
    player_xy: dict[int, tuple[list[float], list[float]]] = defaultdict(lambda: ([], []))
    for pid, x, y in rows:
        if x is not None and y is not None:
            player_xy[pid][0].append(x)
            player_xy[pid][1].append(y)

    fig, ax = plt.subplots(figsize=(14, 6))
    ax.set_facecolor("#2d5a1b")
    fig.patch.set_facecolor("#1a1a1a")

    W = PLAYING_FIELD_WIDTH_YARDS
    L = FIELD_TOTAL_LENGTH_YARDS
    EZ = END_ZONE_DEPTH_YARDS
    NRZ = NO_RUNNING_ZONE_YARDS

    # Field background
    ax.add_patch(patches.Rectangle((0, 0), L, W, color="#3a7a22", zorder=1))

    # End zones
    for x_start, label in [(0, "END ZONE"), (L - EZ, "END ZONE")]:
        ax.add_patch(patches.Rectangle((x_start, 0), EZ, W,
                                        color="#1e5c10", zorder=2))
        ax.text(x_start + EZ / 2, W / 2, label, ha="center", va="center",
                color="white", fontsize=8, alpha=0.6, rotation=90, zorder=3)

    # No-running zones
    for x_start in [EZ, L - EZ - NRZ]:
        ax.add_patch(patches.Rectangle((x_start, 0), NRZ, W,
                                        color="#2d6b18", zorder=2, linestyle="--",
                                        linewidth=1, edgecolor="white", fill=False))
        ax.text(x_start + NRZ / 2, W - 1, "NRZ", ha="center", va="top",
                color="white", fontsize=6, alpha=0.5, zorder=3)

    # Yard lines every 5 yards (within playing field)
    for x in range(EZ, L - EZ + 1, 5):
        ax.axvline(x, color="white", linewidth=0.5, alpha=0.3, zorder=2)

    # Midfield
    ax.axvline(L / 2, color="white", linewidth=1.5, alpha=0.6, zorder=2)

    # Sidelines / end lines
    for spine in ax.spines.values():
        spine.set_edgecolor("white")
        spine.set_linewidth(2)

    # Player trails + final positions
    for pid, (xs, ys) in player_xy.items():
        if len(xs) < 2:
            continue
        color = [c / 255 for c in reversed(_id_color(pid))]  # BGR→RGB
        ax.plot(xs, ys, color=color, linewidth=0.8, alpha=trail_alpha, zorder=4)
        ax.scatter(xs[-1], ys[-1], color=color, s=40, zorder=5, edgecolors="white",
                   linewidths=0.5)
        ax.annotate(str(pid), (xs[-1], ys[-1]), textcoords="offset points",
                    xytext=(4, 4), color="white", fontsize=6, zorder=6)

    ax.set_xlim(0, L)
    ax.set_ylim(0, W)
    ax.set_xlabel("yards (length)", color="white")
    ax.set_ylabel("yards (width)", color="white")
    ax.tick_params(colors="white")
    ax.set_title("Player Tracking — Top-Down Field View", color="white", pad=10)

    # Yard markers
    for x in range(EZ, L - EZ + 1, 10):
        label = x - EZ
        ax.text(x, -1.2, str(label), ha="center", color="white", fontsize=7, alpha=0.7)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print(f"Field map saved → {output_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Visualize tracking results.")
    parser.add_argument("--mode",   choices=["video", "field", "both"], default="both")
    parser.add_argument("--db",     default=str(OUTPUTS_DIR / "tracking.db"), type=Path)
    parser.add_argument("--video",  type=Path, help="Required for video/both mode")
    parser.add_argument("--output", type=Path, help="Output path (auto-named if omitted)")
    parser.add_argument("--trail",  default=15, type=int,
                        help="Trail length in frames for video mode (default: 15)")
    args = parser.parse_args()

    if args.mode in ("video", "both") and args.video is None:
        parser.error("--video is required for video/both mode")

    if args.mode in ("video", "both"):
        out = args.output or (OUTPUTS_DIR / "annotated.mp4")
        render_video(args.video, args.db, out, trail_frames=args.trail)

    if args.mode in ("field", "both"):
        out = args.output or (OUTPUTS_DIR / "field_map.png")
        render_field_map(args.db, out)


if __name__ == "__main__":
    main()
