"""
Re-generates PCA-based figures from the real notebook code.
Uses the SAME features, SAME scaler, SAME PCA(n_components=2),
plus extra steps needed for the scree / elbow / biplot figures.

Inputs (in same folder):
  - final_dataset_2025.csv   (14-feature EPA county dataset)
Outputs (in img/):
  - p2-pca-scatter.png
  - p2-scree.png
  - p2-elbow.png
  - p2-biplot.png

Validation targets (printed to stdout):
  - PC1 ≈ 0.36 of total variance
  - First two PCs ≈ 0.53 total
  - About 5 components reach 80% cumulative variance
  - KMeans(k=4) on 2-PC space is used for the scatter figure
"""
import os
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans

# ---------- STYLE (per project spec) ----------
PALETTE = ["#4C78A8", "#F58518", "#54A24B", "#E45756"]  # 3-cluster or 4-cluster colours
plt.rcParams.update({
    "figure.dpi": 200,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "font.size": 12,
    "axes.titlesize": 14,
    "axes.labelsize": 12,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "font.family": "DejaVu Sans",
})

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSV  = os.path.join(ROOT, "_originals_snapshot", "final_dataset_2025.csv")
OUT  = os.path.join(ROOT, "img")
os.makedirs(OUT, exist_ok=True)

# ---------- DATA (exactly as in Pca.ipynb Cell 1) ----------
FEATURES = [
    "Good", "Moderate", "Unhealthy for Sensitive Groups",
    "Unhealthy", "Very Unhealthy", "Hazardous",
    "AQI Maximum", "AQI 90th Percentile", "AQI Median",
    "# Days CO", "# Days NO2", "# Days O3",
    "# Days PM2.5", "# Days PM10",
]

df = pd.read_csv(CSV)
X = df[FEATURES]
print(f"Loaded final_dataset_2025.csv  rows={len(df)}  cols={len(FEATURES)}")
print(f"Missing values per feature:\n{X.isnull().sum().to_dict()}")

# ---------- SCALING (exactly as in Pca.ipynb Cell 3) ----------
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ---------- FULL PCA (for scree plot) ----------
pca_full = PCA(n_components=14)
pca_full.fit(X_scaled)
var_full = pca_full.explained_variance_ratio_
print(f"\nPC1 explained variance ratio: {var_full[0]:.4f}  (target ~0.36)")
print(f"First 2 cumulative:           {var_full[:2].sum():.4f}  (target ~0.53)")
cum = np.cumsum(var_full)
n80 = int(np.argmax(cum >= 0.80) + 1)
print(f"# components reaching 80%:       {n80}  (target ~5)")
print(f"First 5 cumulative:           {cum[:5].tolist()}")

# ---------- 2-component PCA (for scatter + biplot + elbow) ----------
pca2 = PCA(n_components=2)
X_pca = pca2.fit_transform(X_scaled)
pc1_pct = pca2.explained_variance_ratio_[0] * 100
pc2_pct = pca2.explained_variance_ratio_[1] * 100
print(f"\n2-PC explained variance: PC1={pc1_pct:.2f}%  PC2={pc2_pct:.2f}%  total={pc1_pct+pc2_pct:.2f}%")

# ---------- KMeans on PCA space (per report p13) ----------
km = KMeans(n_clusters=4, random_state=0, n_init=10)
labels = km.fit_predict(X_pca)
print(f"KMeans(4) cluster sizes: {np.bincount(labels).tolist()}")

# ---------- SAVE validation results ----------
val = {
    "rows_in_dataset": int(len(df)),
    "pc1_var_ratio": float(var_full[0]),
    "pc2_var_ratio": float(var_full[1]),
    "first2_cumulative": float(var_full[:2].sum()),
    "n_components_for_80pct": int(n80),
    "cumulative_first5": cum[:5].tolist(),
    "kmeans4_sizes": np.bincount(labels).tolist(),
}
with open(os.path.join(ROOT, "p2_validation.json"), "w") as f:
    json.dump(val, f, indent=2)

# ============================================================
# FIGURE 1: PCA scatter, k=4 clusters (p2-pca-scatter.png)
# ============================================================
fig, ax = plt.subplots(figsize=(10, 7))
for k in range(4):
    mask = labels == k
    ax.scatter(X_pca[mask, 0], X_pca[mask, 1],
               s=70, alpha=0.8, edgecolor="black", linewidth=0.6,
               color=PALETTE[k], label=f"Cluster {k}")
# Label the one most-extreme outlier (the report mentions "isolated outlier top-right")
outlier_idx = int(np.argmax(X_pca[:, 0] + X_pca[:, 1]))
ax.annotate(df.iloc[outlier_idx]["County"] + ", " + df.iloc[outlier_idx]["State"],
            xy=(X_pca[outlier_idx, 0], X_pca[outlier_idx, 1]),
            xytext=(10, 6), textcoords="offset points",
            fontsize=10, fontweight="bold",
            arrowprops=dict(arrowstyle="->", color="#444", lw=0.8))
ax.set_xlabel(f"PC1 — General Air Quality ({pc1_pct:.1f}% variance)")
ax.set_ylabel(f"PC2 — Extreme Pollution Events ({pc2_pct:.1f}% variance)")
ax.set_title("US Counties Segments based on Environmental Data")
ax.grid(True, alpha=0.25)
ax.legend(loc="best", frameon=True)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "p2-pca-scatter.png"), bbox_inches="tight")
plt.close()
print("Wrote p2-pca-scatter.png")

# ============================================================
# FIGURE 2: Scree plot, individual + cumulative + 80% line (p2-scree.png)
# ============================================================
fig, ax = plt.subplots(figsize=(10, 6))
xs = np.arange(1, 15)
bars = ax.bar(xs, var_full, color=PALETTE[0], alpha=0.85,
              edgecolor="black", linewidth=0.5, label="Individual")
ax.set_ylabel("Explained Variance Ratio")
ax.set_xlabel("Principal Component")
ax.set_xticks(xs)
ax2 = ax.twinx()
ax2.plot(xs, cum, color=PALETTE[3], marker="o", lw=2, label="Cumulative")
ax2.axhline(0.80, color="#888", ls="--", lw=1)
ax2.text(14.2, 0.80, "80%", va="center", fontsize=10, color="#666")
ax2.set_ylabel("Cumulative Explained Variance")
ax2.set_ylim(0, 1.05)
ax.set_title("Scree Plot — Explained Variance per Principal Component")
# Combined legend
lines1, labels1 = ax.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax.legend(lines1 + lines2, labels1 + labels2, loc="center right", frameon=True)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "p2-scree.png"), bbox_inches="tight")
plt.close()
print("Wrote p2-scree.png")

# ============================================================
# FIGURE 3: Elbow plot, inertia vs k (p2-elbow.png)
# ============================================================
ks = list(range(1, 11))
inertias = []
for k in ks:
    km_e = KMeans(n_clusters=k, random_state=0, n_init=10).fit(X_pca)
    inertias.append(km_e.inertia_)
print(f"\nInertia k=1: {inertias[0]:.1f}  (target ~1570)")
print(f"Inertia k=10: {inertias[-1]:.1f}  (target <100)")
fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(ks, inertias, marker="o", lw=2, color=PALETTE[0])
ax.set_xlabel("Number of Clusters (k)")
ax.set_ylabel("Inertia (Within-cluster sum of squares)")
ax.set_title("Elbow Plot for K-means Clustering (in PCA space)")
ax.set_xticks(ks)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "p2-elbow.png"), bbox_inches="tight")
plt.close()
print("Wrote p2-elbow.png")

# ============================================================
# FIGURE 4: Biplot (p2-biplot.png)
# ============================================================
loadings = pca2.components_.T  # shape (14, 2)
fig, ax = plt.subplots(figsize=(10, 8))
# Scatter in grey
ax.scatter(X_pca[:, 0], X_pca[:, 1], s=40, c="#888", alpha=0.55, edgecolor="none")
# Scale arrows so they're visible (max loading magnitude to ~0.7 * axis range)
max_axis = max(abs(X_pca[:, 0]).max(), abs(X_pca[:, 1]).max())
scale = max_axis * 0.7 / max(abs(loadings).max(), 1e-9)
for i, feat in enumerate(FEATURES):
    x, y = loadings[i, 0] * scale, loadings[i, 1] * scale
    ax.annotate("",
                xy=(x, y), xytext=(0, 0),
                arrowprops=dict(arrowstyle="->", color=PALETTE[3], lw=1.6))
    ax.text(x * 1.08, y * 1.08, feat,
            fontsize=9, color="#333",
            ha="center", va="center")
ax.axhline(0, color="#888", lw=0.5)
ax.axvline(0, color="#888", lw=0.5)
ax.set_xlabel(f"PC1 ({pc1_pct:.1f}% variance)")
ax.set_ylabel(f"PC2 ({pc2_pct:.1f}% variance)")
ax.set_title("PCA Biplot — Relationship between Features and Counties")
ax.grid(True, alpha=0.2)
plt.tight_layout()
plt.savefig(os.path.join(OUT, "p2-biplot.png"), bbox_inches="tight")
plt.close()
print("Wrote p2-biplot.png")