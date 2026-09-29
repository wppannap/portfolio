/* =========================================================
   charts.js — D3 visualisations
   All data is fetched from /data/*.json so the student can
   edit content without touching chart code.

   Exposes window.CPCcharts.init() which the page calls when
   the DOM is ready (see bottom of file). Each chart:
     - pulls JSON via fetch()
     - uses CSS custom properties for colour so themes apply
     - supports prefers-reduced-motion
     - has a textual description via aria-label on the wrapper
   ========================================================= */

/* ---------- HELPERS --------------------------------------------- */

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Read a CSS custom property from :root (handles light/dark theming). */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Parse a date string from the timeline JSON into a Date.
    Accepts: YYYY-MM, YYYY-MM-DD, or "present". */
function parseTimelineDate(s) {
  if (!s || s === "present") return null;
  // YYYY-MM or YYYY-MM-DD
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function fmtMonthYear(d) {
  if (!d) return "present";
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** Convert a timeline entry into {start: Date, end: Date}.
    "end: 'present'" => end = today. */
function entryDates(entry) {
  const start = parseTimelineDate(entry.start);
  let end;
  if (!entry.end || entry.end === "present") {
    end = new Date();
  } else {
    end = parseTimelineDate(entry.end);
  }
  return { start, end };
}

/* ---------- TIMELINE (dot-list, decorative — no proportional bars) --- */

/* Renders a horizontal axis of years (2023–2027) with a row of dots,
   one per activity. Decorative only — positions are evenly spaced,
   not data-proportional. Below the axis each entry has a card listing
   role, organisation and dates. Milestones get a star on the axis. */
async function renderTimeline() {
  const container = document.getElementById("timeline");
  if (!container) return;

  const data = await fetch("data/timeline.json").then(r => r.json());
  const entries    = data.entries || [];
  const milestones = data.milestones || [];
  const startYear  = data.startYear;
  const endYear    = data.endYear;
  const years      = d3.range(startYear, endYear + 1);

  // ---- container scaffolding ----
  container.innerHTML = "";

  /* Axis: a single horizontal line with year ticks and one dot per entry.
     Pure HTML/CSS so it renders even if D3 is delayed; D3 only attaches
     tooltips on hover. */
  const axis = document.createElement("div");
  axis.className = "dot-axis";
  axis.style.setProperty("--years", years.length);
  axis.setAttribute("role", "img");
  axis.setAttribute("aria-label",
    `Timeline from ${startYear} to ${endYear}. ${entries.length} activities and ${milestones.length} milestones.`);

  const ticks = document.createElement("div");
  ticks.className = "dot-axis-ticks";
  years.forEach(y => {
    const tick = document.createElement("span");
    tick.className = "dot-axis-tick";
    tick.innerHTML = `<i></i><b>${y}</b>`;
    ticks.appendChild(tick);
  });
  axis.appendChild(ticks);

  const rail = document.createElement("div");
  rail.className = "dot-axis-rail";
  axis.appendChild(rail);

  const dots = document.createElement("div");
  dots.className = "dot-axis-dots";
  entries.forEach(e => {
    const { start, end } = entryDates(e);
    const startYear_e = start.getFullYear();
    const endYear_e   = end.getFullYear();

    // evenly-spaced placement per entry, not proportional
    const idx = Math.max(0, Math.min(years.length - 1,
      startYear_e - startYear));
    const left = (idx + 0.5) / years.length * 100;

    const dot = document.createElement("span");
    dot.className = `dot-axis-dot dot-lane-${e.lane}` + (e.ongoing ? " ongoing" : "");
    dot.style.left = left + "%";
    dot.tabIndex = 0;
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label",
      `${e.role} at ${e.organisation || ""}: ${fmtMonthYear(start)} to ${fmtMonthYear(end)}`);
    dot.dataset.role = e.role;
    dot.dataset.org  = e.organisation || "";
    dot.dataset.start = fmtMonthYear(start);
    dot.dataset.end   = fmtMonthYear(end) + (e.ongoing ? " (ongoing)" : "");
    if (e.note) dot.dataset.note = e.note;
    dots.appendChild(dot);
  });
  milestones.forEach((m, i) => {
    const dDate = parseTimelineDate(m.date);
    if (!dDate) return;
    const idx = Math.max(0, Math.min(years.length - 1,
      dDate.getFullYear() - startYear));
    const left = (idx + 0.5) / years.length * 100;

    const star = document.createElement("span");
    star.className = "dot-axis-star";
    star.style.left = left + "%";
    star.tabIndex = 0;
    star.setAttribute("role", "img");
    star.setAttribute("aria-label", `Milestone: ${m.label}`);
    star.textContent = "★";
    star.dataset.role = "★ " + m.label;
    star.dataset.start = fmtMonthYear(dDate);
    dots.appendChild(star);
  });
  axis.appendChild(dots);
  container.appendChild(axis);

  /* ---- activity list (decorative cards, one per row) ---- */
  const list = document.createElement("ul");
  list.className = "dot-list";
  // Sort by start date so it reads chronologically
  const laneColor = {
    education: "var(--c-cat-1)",
    work:      "var(--c-cat-2)",
    teaching:  "var(--c-cat-3)",
  };
  const ordered = entries.slice().sort((a, b) => entryDates(a).start - entryDates(b).start);
  ordered.forEach(e => {
    const { start, end } = entryDates(e);
    const li = document.createElement("li");
    li.className = `dot-list-item dot-lane-${e.lane}`;
    li.innerHTML = `
      <span class="dot-list-bullet" style="background:${laneColor[e.lane] || "var(--c-accent)"}"></span>
      <div class="dot-list-body">
        <div class="dot-list-role">${escapeHtml(e.role)}</div>
        <div class="dot-list-org">${escapeHtml(e.organisation || "")}</div>
        <div class="dot-list-dates">${fmtMonthYear(start)} – ${fmtMonthYear(end)}${e.ongoing ? " · ongoing" : ""}${e.note ? " · " + escapeHtml(e.note) : ""}</div>
      </div>
    `;
    list.appendChild(li);
  });
  container.appendChild(list);

  /* ---- milestone strip ---- */
  if (milestones.length) {
    const ms = document.createElement("ul");
    ms.className = "dot-list dot-list-milestones";
    milestones.forEach(m => {
      const li = document.createElement("li");
      li.className = "dot-list-item dot-list-milestone";
      const d = parseTimelineDate(m.date);
      li.innerHTML = `
        <span class="dot-list-bullet">★</span>
        <div class="dot-list-body">
          <div class="dot-list-role">${escapeHtml(m.label)}</div>
          <div class="dot-list-dates">${d ? fmtMonthYear(d) : ""}</div>
        </div>
      `;
      ms.appendChild(li);
    });
    container.appendChild(ms);
  }

  /* ---- tooltip on hover/focus for axis dots ---- */
  const tooltip = document.getElementById("timeline-tooltip");
  const showTip = (el) => {
    if (!tooltip) return;
    const org  = el.dataset.org  ? `<div>${escapeHtml(el.dataset.org)}</div>` : "";
    const note = el.dataset.note ? `<div class="tip-note">${escapeHtml(el.dataset.note)}</div>` : "";
    tooltip.innerHTML = `
      <strong>${escapeHtml(el.dataset.role)}</strong>
      ${org}
      <div class="tip-dates">${escapeHtml(el.dataset.start)} – ${escapeHtml(el.dataset.end)}</div>
      ${note}
    `;
    const wrap = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    tooltip.style.left = (r.left - wrap.left + r.width / 2) + "px";
    tooltip.style.top  = (r.top  - wrap.top  - 8) + "px";
    tooltip.setAttribute("data-visible", "true");
  };
  const hideTip = () => { if (tooltip) tooltip.removeAttribute("data-visible"); };
  container.querySelectorAll(".dot-axis-dot, .dot-axis-star").forEach(el => {
    el.addEventListener("mouseenter", () => showTip(el));
    el.addEventListener("focus",      () => showTip(el));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("blur",       hideTip);
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") { hideTip(); el.blur(); }
    });
  });

  /* still populate the data table for accessibility / search engines */
  renderTimelineTable(entries, data.lanes);

  /* recolour on theme change — D3 still drives ticks/rail via CSS vars,
     so this is just a re-render to refresh any cached stroke values. */
  document.addEventListener("theme:changed", () => renderTimeline());
}

/* renderTimelineVertical removed: the section no longer renders a
   mobile vertical list — the toggle was disabled in main.js and the
   timeline now uses a single dot-list visualization for both viewports. */

function renderTimelineTable(entries, lanes) {
  const body = document.getElementById("timeline-table-body");
  if (!body) return;
  body.innerHTML = "";
  const labelById = Object.fromEntries(lanes.map(l => [l.id, l.label]));
  entries
    .slice()
    .sort((a, b) => entryDates(a).start - entryDates(b).start)
    .forEach(e => {
      const { start, end } = entryDates(e);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtMonthYear(start)} – ${fmtMonthYear(end)}</td>
        <td>${escapeHtml(e.role)}</td>
        <td>${escapeHtml(e.organisation || "")}</td>
        <td>${escapeHtml(labelById[e.lane] || e.lane)}</td>
      `;
      body.appendChild(tr);
    });
  // Milestones rows
  // (we fetch the same JSON for milestones — simpler: pull from DOM via a side channel)
  fetch("data/timeline.json").then(r => r.json()).then(data => {
    (data.milestones || []).forEach(m => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtMonthYear(parseTimelineDate(m.date))}</td>
        <td>★ ${escapeHtml(m.label)}</td>
        <td></td>
        <td>Milestone</td>
      `;
      body.appendChild(tr);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ---------- SKILLS-IN-CONTEXT MATRIX --------------------------- */

/* Skills matrix is defined inline here (small, static) instead of a JSON
   file, because the data shape (binary grid) is tightly coupled to the
   chart. The student can edit the array below to update it. */
async function renderSkillsMatrix() {
  const container = document.getElementById("skills-matrix");
  if (!container) return;

  const rows = [
    "Python", "SQL", "Data visualisation", "Exploratory data analysis",
    "Database design"
  ];
  const cols = [
    { key: "comp3115_cluster",   label: "COMP3115 clustering" },
    { key: "comp3115_pca",       label: "COMP3115 PCA" },
    { key: "comp2016_database",  label: "COMP2016 database" },
    { key: "internship",         label: "Internship" }
  ];
  // Matrix: rows = skills, cols = contexts; true = used there.
  // COMP2016 has its own column now; internship gets only "Data visualisation".
  // Python row no longer lights up "tutoring" (per student request).
  const matrix = [
    // rows:                              cluster, pca,      comp2016,  intern
    [/* Python                          */ true,   true,   true,   false],
    [/* SQL                            */ false,  false,  true,   false],
    [/* Data visualisation             */ true,   true,   false,  true ],
    [/* Exploratory data analysis      */ true,   true,   false,  false],
    [/* Database design                */ false,  false,  true,   false]
  ];

  const cell = 28;
  const pad  = 8;
  const labelLeft = 170;
  const labelTop  = 90;
  const W = labelLeft + cols.length * (cell + pad) + pad;
  const H = labelTop  + rows.length * (cell + pad) + pad;

  container.innerHTML = "";
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%")
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-label", `Skills-in-context matrix: ${rows.length} skills across ${cols.length} contexts; a filled dot means the skill was used there.`);

  const fill = cssVar("--c-accent");
  const empty = cssVar("--c-line");
  const ink = cssVar("--c-ink");
  const inkSoft = cssVar("--c-ink-soft");

  // Column labels (rotated)
  svg.selectAll(".col-label")
    .data(cols).enter().append("text")
    .attr("class", "col-label")
    .attr("x", d => labelLeft + cols.indexOf(d) * (cell + pad) + cell / 2)
    .attr("y", labelTop - 14)
    .attr("text-anchor", "start")
    .attr("transform", d => `rotate(-35, ${labelLeft + cols.indexOf(d) * (cell + pad) + cell / 2}, ${labelTop - 14})`)
    .attr("font-family", "var(--f-sans)")
    .attr("font-size", 12)
    .attr("fill", inkSoft)
    .text(d => d.label);

  // Row labels
  svg.selectAll(".row-label")
    .data(rows).enter().append("text")
    .attr("class", "row-label")
    .attr("x", labelLeft - 10)
    .attr("y", (_, i) => labelTop + i * (cell + pad) + cell / 2 + 4)
    .attr("text-anchor", "end")
    .attr("font-family", "var(--f-sans)")
    .attr("font-size", 13)
    .attr("fill", ink)
    .text(d => d);

  // Cells
  const groups = svg.selectAll(".cell-group")
    .data(rows.flatMap((_, r) => cols.map((__, c) => ({ r, c, filled: matrix[r][c] }))))
    .enter().append("g")
    .attr("class", "cell-group")
    .attr("data-row", d => d.r)
    .attr("transform", d => `translate(${labelLeft + d.c * (cell + pad)}, ${labelTop + d.r * (cell + pad)})`);

  groups.append("rect")
    .attr("width", cell).attr("height", cell)
    .attr("rx", cell / 2)
    .attr("fill", d => d.filled ? fill : empty)
    .attr("opacity", d => d.filled ? 0.9 : 0.5);

  groups.append("title").text(d => `${rows[d.r]} — ${cols[d.c].label}: ${d.filled ? "used" : "not used"}`);

  // Row hover highlight: dim cells in other rows
  svg.selectAll(".cell-group")
    .on("mouseenter", function() {
      const r = +this.getAttribute("data-row");
      svg.selectAll(".cell-group").each(function() {
        const rr = +this.getAttribute("data-row");
        d3.select(this).select("rect").attr("opacity", rr === r ? 1 : 0.25);
      });
    })
    .on("mouseleave", function() {
      svg.selectAll(".cell-group rect").attr("opacity", function(d) {
        return d.filled ? 0.9 : 0.5;
      });
    });
}

/* ---------- CORRELATION HEATMAP -------------------------------- */

async function renderCorrelationHeatmap() {
  const container = document.getElementById("correlation-heatmap");
  if (!container) return;

  const data = await fetch("data/correlation.json").then(r => r.json());
  const vars = data.variables;
  const mat  = data.matrix;
  const N = vars.length;

  // Sized for readability, scrolls inside container if narrow
  const cell = 64;
  const pad = 4;
  const labelMargin = 110;
  const W = labelMargin + N * (cell + pad) + 20;
  const H = labelMargin + N * (cell + pad) + 20;

  container.innerHTML = "";

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%")
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-label", `Correlation matrix of ${vars.length} variables. Diverging colour from blue (negative) to red (positive), centred at zero.`);

  // Diverging colour scale: -1 -> blue (var), 0 -> bg-soft, +1 -> red (var)
  const neg = cssVar("--c-neg");
  const pos = cssVar("--c-pos");
  const zero = cssVar("--c-zero");

  const color = d3.scaleLinear()
    .domain([-1, 0, 1])
    .range([neg, zero, pos])
    .interpolate(d3.interpolateRgb);

  // Column labels (top)
  svg.selectAll(".col-label")
    .data(vars).enter().append("text")
    .attr("class", "col-label")
    .attr("x", (_, i) => labelMargin + i * (cell + pad) + cell / 2)
    .attr("y", labelMargin - 10)
    .attr("text-anchor", "start")
    .attr("transform", (_, i) => `rotate(-35, ${labelMargin + i * (cell + pad) + cell / 2}, ${labelMargin - 10})`)
    .attr("font-family", "var(--f-sans)")
    .attr("font-size", 12)
    .attr("fill", cssVar("--c-ink-soft"))
    .text(d => d);

  // Row labels
  svg.selectAll(".row-label")
    .data(vars).enter().append("text")
    .attr("class", "row-label")
    .attr("x", labelMargin - 10)
    .attr("y", (_, i) => labelMargin + i * (cell + pad) + cell / 2 + 4)
    .attr("text-anchor", "end")
    .attr("font-family", "var(--f-sans)")
    .attr("font-size", 12)
    .attr("fill", cssVar("--c-ink-soft"))
    .text(d => d);

  // Cells
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      cells.push({ r, c, v: mat[r][c] });
    }
  }

  const groups = svg.selectAll(".corr-cell")
    .data(cells).enter().append("g")
    .attr("class", "corr-cell")
    .attr("transform", d => `translate(${labelMargin + d.c * (cell + pad)}, ${labelMargin + d.r * (cell + pad)})`);

  groups.append("rect")
    .attr("width", cell).attr("height", cell)
    .attr("rx", 6)
    .attr("fill", d => color(d.v))
    .attr("stroke", cssVar("--c-line-soft"));

  groups.append("text")
    .attr("x", cell / 2)
    .attr("y", cell / 2 + 5)
    .attr("text-anchor", "middle")
    .attr("font-family", "var(--f-sans)")
    .attr("font-size", 13)
    .attr("font-weight", 600)
    .attr("fill", d => readableTextOn(d.v))
    .text(d => d.v.toFixed(2));

  // Hover tooltip via title (accessible)
  groups.append("title").text(d => `${vars[d.r]} × ${vars[d.c]}: ${d.v.toFixed(2)}`);

  // Populate the textual data table fallback
  const tableHost = document.getElementById("correlation-table");
  if (tableHost) {
    let html = '<table class="cluster-table" style="font-size:0.85rem;"><thead><tr><th></th>';
    vars.forEach(v => html += `<th>${escapeHtml(v)}</th>`);
    html += '</tr></thead><tbody>';
    vars.forEach((v, r) => {
      html += `<tr><th>${escapeHtml(v)}</th>`;
      for (let c = 0; c < N; c++) html += `<td>${mat[r][c].toFixed(2)}</td>`;
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableHost.innerHTML = html;
  }
}

/** Pick black or white text for a correlation cell depending on luminance. */
function readableTextOn(value) {
  // Empirical threshold: |value| > 0.55 tends to be saturated enough for white text.
  return Math.abs(value) > 0.55 ? "#ffffff" : cssVar("--c-ink");
}

/* ---------- CLUSTER PROFILE BARS ------------------------------- */

async function renderClusterProfiles() {
  const host = document.getElementById("cluster-profiles");
  if (!host) return;

  const data = await fetch("data/clusters.json").then(r => r.json());
  const clusters = data.clusters;
  const metrics = data.metrics;

  host.innerHTML = "";

  // Hard-coded hex colours — guarantees visibility regardless of theme.
  // Each cluster has its own distinct hue, used in every metric panel.
  const COLORS = {
    0: "#c89b3c",  // gold     — Cluster 0
    1: "#2f6f8f",  // blue     — Cluster 1
    2: "#b75d3a"   // terracotta — Cluster 2
  };

  // Layout constants (in SVG user units)
  const PANEL_W   = 320;
  const PANEL_H   = 220;
  const PAD_L     = 90;   // left padding for cluster-name labels
  const PAD_R     = 50;   // right padding for value labels
  const PAD_T     = 56;   // top padding for metric title + scale
  const PAD_B     = 24;   // bottom padding
  const BAR_H     = 28;
  const BAR_GAP   = 14;
  const TRACK_W   = PANEL_W - PAD_L - PAD_R;   // 180 px usable bar width

  const wrap = document.createElement("div");
  wrap.className = "cluster-svg-wrap";

  const totalW = metrics.length * PANEL_W;
  const totalH = PANEL_H;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);
  svg.setAttribute("width", totalW);
  svg.setAttribute("height", totalH);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label",
    "Cluster profiles: three clusters (gold, blue, terracotta) compared on Median AQI, good-day ratio, and mean temperature.");

  metrics.forEach((m, mi) => {
    const x0 = mi * PANEL_W;
    const [d0, d1] = m.domain;
    const range = d1 - d0;

    // Panel card
    const card = document.createElementNS(svgNS, "rect");
    card.setAttribute("x", x0 + 6);
    card.setAttribute("y", 6);
    card.setAttribute("width", PANEL_W - 12);
    card.setAttribute("height", PANEL_H - 12);
    card.setAttribute("rx", 10);
    card.setAttribute("ry", 10);
    card.setAttribute("fill", "#f5f1ea");      // matches --c-bg-alt
    card.setAttribute("stroke", "#d9d3c7");    // matches --c-line
    svg.appendChild(card);

    // Metric title
    const title = document.createElementNS(svgNS, "text");
    title.setAttribute("x", x0 + PAD_L);
    title.setAttribute("y", 28);
    title.setAttribute("font-family", "Georgia, 'Times New Roman', serif");
    title.setAttribute("font-size", "15");
    title.setAttribute("font-weight", "600");
    title.setAttribute("fill", "#222");
    title.textContent = m.label;
    svg.appendChild(title);

    // Scale subtitle
    const scale = document.createElementNS(svgNS, "text");
    scale.setAttribute("x", x0 + PAD_L);
    scale.setAttribute("y", 46);
    scale.setAttribute("font-size", "10");
    scale.setAttribute("fill", "#777");
    scale.textContent = `scale ${formatValue(m.key, d0)} – ${formatValue(m.key, d1)}`;
    svg.appendChild(scale);

    // Bars (one per cluster)
    clusters.forEach((cl, ci) => {
      const value = cl.stats[m.key];
      const pct = Math.max(0, Math.min(1, (value - d0) / range));
      const barY = PAD_T + ci * (BAR_H + BAR_GAP);

      // Cluster name (left side)
      const name = document.createElementNS(svgNS, "text");
      name.setAttribute("x", x0 + 14);
      name.setAttribute("y", barY + BAR_H * 0.7);
      name.setAttribute("font-size", "12");
      name.setAttribute("font-weight", "500");
      name.setAttribute("fill", "#333");
      name.textContent = cl.label;
      svg.appendChild(name);

      // Colour swatch (small square next to name)
      const sw = document.createElementNS(svgNS, "rect");
      sw.setAttribute("x", x0 + 14);
      sw.setAttribute("y", barY - 8);
      sw.setAttribute("width", 10);
      sw.setAttribute("height", 10);
      sw.setAttribute("rx", 2);
      sw.setAttribute("fill", COLORS[cl.id]);
      svg.appendChild(sw);
      // push name to the right of swatch
      name.setAttribute("x", x0 + 30);

      // Track (background of bar)
      const track = document.createElementNS(svgNS, "rect");
      track.setAttribute("x", x0 + PAD_L);
      track.setAttribute("y", barY);
      track.setAttribute("width", TRACK_W);
      track.setAttribute("height", BAR_H);
      track.setAttribute("rx", 4);
      track.setAttribute("fill", "#e8e2d3");   // matches --c-bg-soft
      svg.appendChild(track);

      // Filled bar — WIDTH DIFFERS PER CLUSTER because pct differs.
      // Using hex color directly (not CSS var) so it always paints.
      const fillW = Math.max(2, TRACK_W * pct);
      const fill = document.createElementNS(svgNS, "rect");
      fill.setAttribute("x", x0 + PAD_L);
      fill.setAttribute("y", barY);
      fill.setAttribute("width", fillW.toFixed(1));
      fill.setAttribute("height", BAR_H);
      fill.setAttribute("rx", 4);
      fill.setAttribute("fill", COLORS[cl.id]);
      svg.appendChild(fill);

      // Value label at the right end of the bar
      const val = document.createElementNS(svgNS, "text");
      val.setAttribute("x", x0 + PAD_L + TRACK_W + 8);
      val.setAttribute("y", barY + BAR_H * 0.7);
      val.setAttribute("font-size", "12");
      val.setAttribute("fill", "#333");
      val.setAttribute("font-variant-numeric", "tabular-nums");
      val.textContent = formatValue(m.key, value);
      svg.appendChild(val);
    });
  });

  wrap.appendChild(svg);

  // Legend below the SVG
  const legend = document.createElement("ul");
  legend.className = "cluster-legend";
  clusters.forEach(cl => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="cl-dot" style="background:${COLORS[cl.id]};"></span>${escapeHtml(cl.label)} · ${escapeHtml(cl.counties)}`;
    legend.appendChild(li);
  });
  wrap.appendChild(legend);

  host.appendChild(wrap);
}

function formatValue(key, value) {
  if (key === "good_ratio_pct") return value.toFixed(1) + "%";
  if (key === "Median AQI") return value.toFixed(2);
  if (key === "Mean temperature") return value.toFixed(2) + "°C";
  return value.toFixed(2);
}

/* ---------- BOOT ------------------------------------------------ */

async function init() {
  try {
    await Promise.all([
      renderTimeline(),
      renderSkillsMatrix(),
      renderCorrelationHeatmap(),
      renderClusterProfiles()
    ]);
  } catch (err) {
    console.error("Chart init failed:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}