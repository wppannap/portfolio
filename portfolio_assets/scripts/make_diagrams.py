"""
Draws p1-data-flow.png and p3-process.png as clean flow diagrams.
Uses ONLY wording from the brief — no extra content.

Style: muted, minimal, matching the portfolio's editorial look.
Palette: #4C78A8, #F58518, #54A24B, #E45756.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

PALETTE = ["#4C78A8", "#F58518", "#54A24B", "#E45756"]
BG       = "#ffffff"
INK      = "#1c1b18"
MUTED    = "#77736d"

plt.rcParams.update({
    "figure.dpi": 200,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "font.family": "DejaVu Sans",
    "font.size": 11,
})

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, "img")
os.makedirs(OUT, exist_ok=True)


def box(ax, x, y, w, h, text, color, font_size=9):
    patch = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.10",
        linewidth=1.2, edgecolor=color, facecolor="white",
    )
    ax.add_patch(patch)
    ax.text(x + w / 2, y + h / 2, text,
            ha="center", va="center",
            fontsize=font_size, color=INK,
            wrap=True)


def arrow(ax, x1, y1, x2, y2, color="#444"):
    a = FancyArrowPatch((x1, y1), (x2, y2),
                        arrowstyle="-|>", mutation_scale=14,
                        color=color, lw=1.4)
    ax.add_patch(a)


# ============================================================
# p1-data-flow.png — 5 boxes, strictly left to right
# ============================================================
fig, ax = plt.subplots(figsize=(13, 5))
ax.set_xlim(0, 13)
ax.set_ylim(0, 5)
ax.set_aspect("equal")
ax.axis("off")

# Two stacked source boxes on the left (Box 1: EPA, Box 2: NOAA)
box(ax, 0.1, 3.05, 2.6, 1.25, "EPA Annual AQI by\nCounty 2025", PALETTE[0])
box(ax, 0.1, 1.55, 2.6, 1.25, "NOAA LCDv2 2025\nweather data", PALETTE[1])

# Merge point between sources (vertical line joining both arrows)
ax.plot([3.6, 3.6], [2.2, 2.85], color="#444", lw=1.4)
ax.plot([3.6, 4.0], [2.5, 2.5],  color="#444", lw=1.4)
arrow(ax, 2.7, 3.65, 3.6, 3.0)   # EPA → merge
arrow(ax, 2.7, 2.20, 3.6, 2.20)   # NOAA → merge

# Box 2: Joined by state
box(ax, 4.0, 2.0, 2.1, 1.2, "Joined by state", PALETTE[3], font_size=10)
arrow(ax, 6.1, 2.6, 6.7, 2.6)

# Box 3: 6 counties × 6 features
box(ax, 6.7, 2.0, 2.4, 1.4,
    "6 counties × 6 features\n(Median AQI, 90th Percentile AQI,\ngood ratio, mean temperature,\nmean humidity, total rainfall)",
    PALETTE[2], font_size=8)
arrow(ax, 9.1, 2.6, 9.7, 2.6)

# Box 4: Min-max scaling
box(ax, 9.7, 2.0, 1.5, 1.2, "Min-max\nscaling\n(0 to 1)", PALETTE[0], font_size=9)
arrow(ax, 11.2, 2.6, 11.8, 2.6)

# Box 5: K-Means k=3
box(ax, 11.8, 2.0, 1.2, 1.2, "K-Means\nk = 3", PALETTE[1], font_size=10)

ax.text(6.5, 4.55, "Project 1 — Data Pipeline",
        ha="center", va="center", fontsize=12, fontweight="600", color=INK)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "p1-data-flow.png"), bbox_inches="tight", facecolor=BG)
plt.savefig(os.path.join(OUT, "p1-data-flow.svg"), bbox_inches="tight", facecolor=BG)
plt.close()
print("Wrote p1-data-flow.png / .svg")


# ============================================================
# p3-process.png — 3 boxes (Record / Tidy / Show)
# ============================================================
fig, ax = plt.subplots(figsize=(11, 3.6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 3.2)
ax.set_aspect("equal")
ax.axis("off")

# Box 1: Record
box(ax, 0.2, 1.2, 2.6, 1.4,
    "Record:\nraw material quantities,\npackaged product volumes,\norder numbers",
    PALETTE[0], font_size=10)
arrow(ax, 2.8, 1.9, 3.7, 1.9)

# Box 2: Tidy
box(ax, 3.7, 1.2, 2.6, 1.4,
    "Tidy:\nkeep records consistent",
    PALETTE[1], font_size=10)
arrow(ax, 6.3, 1.9, 7.2, 1.9)

# Box 3: Show
box(ax, 7.2, 1.2, 2.6, 1.4,
    "Show:\nsimple visual reports",
    PALETTE[2], font_size=10)

ax.text(5, 2.95, "Project 3 — Reporting Workflow",
        ha="center", va="center", fontsize=12, fontweight="600", color=INK)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "p3-process.png"), bbox_inches="tight", facecolor=BG)
plt.savefig(os.path.join(OUT, "p3-process.svg"), bbox_inches="tight", facecolor=BG)
plt.close()
print("Wrote p3-process.png / .svg")