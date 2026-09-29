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

/* ---------- TIMELINE (Gantt) ----------------------------------- */

async function renderTimeline() {
  const container = document.getElementById("timeline");
  if (!container) return;

  const data = await fetch("data/timeline.json").then(r => r.json());
  const lanes = data.lanes;
  const entries = data.entries;
  const milestones = data.milestones || [];
  const startYear = data.startYear;
  const endYear = data.endYear;

  // Wipe container and build a fixed structure
  container.innerHTML = "";

  const wrap = d3.select(container);

  // Sizing: fill the wrapper width but keep a min so it can scroll horizontally
  const W = Math.max(container.clientWidth, 720);
  const margin = { top: 28, right: 28, bottom: 60, left: 160 };
  const laneH  = 56;
  const innerW = W - margin.left - margin.right;
  const innerH = lanes.length * laneH;
  const H = innerH + margin.top + margin.bottom;

  const svg = wrap.append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%")
    .attr("height", H)
    .attr("role", "img")
    .attr("aria-label", `Horizontal timeline from ${startYear} to ${endYear} with ${lanes.length} lanes: ${lanes.map(l => l.label).join(", ")}.`);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const xStart = new Date(startYear, 0, 1);
  const xEnd   = new Date(endYear, 11, 31);
  const x = d3.scaleTime().domain([xStart, xEnd]).range([0, innerW]);

  const laneY = (laneId) => {
    const i = lanes.findIndex(l => l.id === laneId);
    return i * laneH + 10;
  };

  const laneColor = {
    education: cssVar("--c-cat-1"),
    work:      cssVar("--c-cat-2"),
    teaching:  cssVar("--c-cat-3"),
  };

  /* --- lane background rows --- */
  g.selectAll(".lane-row")
    .data(lanes).enter().append("rect")
    .attr("class", "lane-row")
    .attr("x", 0)
    .attr("y", (_, i) => i * laneH)
    .attr("width", innerW)
    .attr("height", laneH - 6)
    .attr("rx", 8)
    .attr("fill", cssVar("--c-bg-soft"))
    .attr("opacity", 0.6);

  /* --- lane labels (left column) --- */
  g.selectAll(".lane-label")
    .data(lanes).enter().append("text")
    .attr("class", "lane-label")
    .attr("x", -12)
    .attr("y", (_, i) => i * laneH + (laneH - 6) / 2 + 5)
    .attr("text-anchor", "end")
    .attr("font-family", "var(--f-sans)")
    .attr("font-size", 13)
    .attr("font-weight", 600)
    .attr("fill", cssVar("--c-ink"))
    .text(d => d.label);

  /* --- today line --- */
  const today = new Date();
  if (today >= xStart && today <= xEnd) {
    g.append("line")
      .attr("class", "today-line")
      .attr("x1", x(today)).attr("x2", x(today))
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", cssVar("--c-ink-mute"))
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3 3");
    g.append("text")
      .attr("x", x(today) + 4)
      .attr("y", 12)
      .attr("font-family", "var(--f-sans)")
      .attr("font-size", 11)
      .attr("fill", cssVar("--c-ink-mute"))
      .text("today");
  }

  /* --- x axis with months + years --- */
  const xAxisG = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${innerH})`);

  // Years
  xAxisG.append("g")
    .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")))
    .selectAll("text")
      .attr("font-family", "var(--f-sans)")
      .attr("font-size", 12)
      .attr("fill", cssVar("--c-ink-soft"));
  xAxisG.selectAll(".domain, .tick line")
    .attr("stroke", cssVar("--c-line"));

  /* --- milestone stars --- */
  g.selectAll(".milestone")
    .data(milestones)
    .enter().append("g")
    .attr("class", "milestone")
    .attr("transform", d => {
      const date = parseTimelineDate(d.date);
      return `translate(${x(date)}, ${innerH + 18})`;
    })
    .each(function(d) {
      const node = d3.select(this);
      node.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .attr("fill", cssVar("--c-accent"))
        .attr("aria-label", `Milestone: ${d.label}`)
        .text("★");
      node.append("title").text(d.label);
    });

  /* --- entry bars --- */
  const tooltip = document.getElementById("timeline-tooltip");
  const showTip = (entry, x, y) => {
    if (!tooltip) return;
    const { start, end } = entryDates(entry);
    tooltip.innerHTML = `
      <strong>${entry.role}</strong>
      ${entry.organisation ? `<div>${entry.organisation}</div>` : ""}
      <div class="tip-dates">${fmtMonthYear(start)} – ${fmtMonthYear(end)}${entry.note ? " · " + entry.note : ""}</div>
    `;
    tooltip.setAttribute("data-visible", "true");
    // Position near (x,y) inside the wrap
    const wrapRect = container.getBoundingClientRect();
    const left = x - wrapRect.left + 14;
    const top  = y - wrapRect.top  + 14;
    tooltip.style.left = left + "px";
    tooltip.style.top  = top  + "px";
  };
  const hideTip = () => { if (tooltip) tooltip.removeAttribute("data-visible"); };

  const bars = g.selectAll(".entry-bar")
    .data(entries)
    .enter().append("g")
    .attr("class", "entry-bar")
    .attr("transform", d => `translate(0, ${laneY(d.lane)})`);

  bars.append("rect")
    .attr("x", d => x(entryDates(d).start))
    .attr("y", 8)
    .attr("width", 0)
    .attr("height", laneH - 24)
    .attr("rx", 6)
    .attr("fill", d => laneColor[d.lane] || cssVar("--c-accent"))
    .attr("opacity", d => d.ongoing ? 0.85 : 1)
    .attr("tabindex", 0)
    .attr("role", "img")
    .attr("aria-label", d => `${d.role} at ${d.organisation || ""}: ${fmtMonthYear(entryDates(d).start)} to ${fmtMonthYear(entryDates(d).end)}`)
    .style("cursor", "pointer")
    .on("mouseenter", function(ev, d) {
      d3.select(this).attr("stroke", cssVar("--c-ink")).attr("stroke-width", 1.5);
      showTip(d, ev.clientX, ev.clientY);
    })
    .on("mousemove", function(ev, d) { showTip(d, ev.clientX, ev.clientY); })
    .on("mouseleave", function() {
      d3.select(this).attr("stroke", "none");
      hideTip();
    })
    .on("focus", function(ev, d) {
      const r = this.getBoundingClientRect();
      showTip(d, r.left + r.width / 2, r.top);
    })
    .on("blur", hideTip)
    .on("keydown", function(ev) {
      if (ev.key === "Escape") { hideTip(); this.blur(); }
    })
    .transition()
      .duration(!reducedMotion() ? 700 : 0)
      .attr("width", d => Math.max(2, x(entryDates(d).end) - x(entryDates(d).start)));

  // Arrow / fade marker for ongoing bars at the right edge
  bars.each(function(d) {
    if (!d.ongoing) return;
    const node = d3.select(this);
    const start = entryDates(d).start;
    const endX  = x(new Date());
    node.append("text")
      .attr("x", endX + 4)
      .attr("y", laneH - 16)
      .attr("font-family", "var(--f-sans)")
      .attr("font-size", 14)
      .attr("fill", laneColor[d.lane] || cssVar("--c-accent"))
      .text("›");
    // Use the rect width up to "today" so the bar doesn't run to the chart edge
    node.select("rect").attr("width", Math.max(2, endX - x(start)));
  });

  /* --- vertical list (mobile) --- */
  renderTimelineVertical(entries, lanes, milestones);
  renderTimelineTable(entries, lanes);

  /* --- on theme change, recolour this chart --- */
  document.addEventListener("theme:changed", () => {
    // Simplest reliable approach: re-render
    renderTimeline();
  });
}

function renderTimelineVertical(entries, lanes, milestones) {
  const wrap = document.getElementById("timeline-vertical");
  if (!wrap) return;
  wrap.innerHTML = "";
  lanes.forEach(lane => {
    const laneEntries = entries.filter(e => e.lane === lane.id);
    if (laneEntries.length === 0) return;
    const block = document.createElement("div");
    block.className = "lane-block";
    block.innerHTML = `<h4>${lane.label}</h4>`;
    const ul = document.createElement("ul");
    laneEntries.forEach(e => {
      const { start, end } = entryDates(e);
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="role">${e.role}</span>
        <span class="org">${e.organisation || ""}</span>
        <span class="dates">${fmtMonthYear(start)} – ${fmtMonthYear(end)}${e.ongoing ? " (ongoing)" : ""}</span>
      `;
      ul.appendChild(li);
    });
    block.appendChild(ul);
    wrap.appendChild(block);
  });
  // Milestones
  if (milestones.length) {
    const block = document.createElement("div");
    block.className = "lane-block";
    block.innerHTML = `<h4>Milestones</h4><ul>` +
      milestones.map(m => `<li><span class="role">★ ${escapeHtml(m.label)}</span><span class="dates">${fmtMonthYear(parseTimelineDate(m.date))}</span></li>`).join("") +
      `</ul>`;
    wrap.appendChild(block);
  }
}

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
    "Database design", "Public speaking and coaching"
  ];
  const cols = [
    { key: "comp3115_cluster",   label: "COMP3115 clustering" },
    { key: "comp3115_pca",       label: "COMP3115 PCA" },
    { key: "internship",         label: "Internship" },
    { key: "debate_coaching",    label: "Debate coaching" },
    { key: "debate_competition", label: "Debate competition" },
    { key: "tutoring",           label: "Tutoring" }
  ];
  // Matrix: rows = skills, cols = contexts; true = used there
  const matrix = [
    [true,  true,  true,  false, false, true ],
    [false, false, true,  false, false, false],
    [true,  true,  true,  false, false, false],
    [true,  true,  true,  false, false, false],
    [false, false, true,  false, false, false],
    [false, false, false, true,  true,  true ]
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
    .data(rows.map((_, r) => rows.map((__, c) => ({ r, c, filled: matrix[r][c] }))).flat())
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
  const grid = document.createElement("div");
  grid.className = "cluster-grid";
  host.appendChild(grid);

  // Colour the bars using the categorical cluster palette
  const clusterFill = (id) => {
    if (id === 0) return cssVar("--c-cat-0");
    if (id === 1) return cssVar("--c-cat-1b");
    return cssVar("--c-cat-2b");
  };

  clusters.forEach(cl => {
    const card = document.createElement("div");
    card.className = "cluster-card";

    const head = document.createElement("div");
    head.className = "cluster-head";
    head.innerHTML = `
      <span class="cluster-title">${escapeHtml(cl.label)}</span>
      <span class="cluster-counties">${escapeHtml(cl.counties)}</span>
    `;
    card.appendChild(head);

    metrics.forEach(m => {
      const value = cl.stats[m.key];
      const [d0, d1] = m.domain;
      const pct = Math.max(0, Math.min(1, (value - d0) / (d1 - d0)));
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <span>${escapeHtml(m.label)}</span>
        <span class="cluster-bar-track">
          <span class="cluster-bar-fill" style="width:${(pct * 100).toFixed(1)}%; background:${clusterFill(cl.id)};"></span>
        </span>
        <span class="cluster-bar-value">${formatValue(m.key, value)}</span>
      `;
      card.appendChild(row);
    });

    grid.appendChild(card);
  });
}

function formatValue(key, value) {
  if (key === "good_ratio_pct") return value.toFixed(1) + "%";
  if (key === "Mean temperature") return value.toFixed(2);
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