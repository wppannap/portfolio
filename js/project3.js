/* =========================================================
   project3.js — COMP2016 SQL viewer for Project 3.
   Owns:
     - SQL viewer (tabs + copy + line numbers + annotation)
     - highlight.js loader (pinned version from cdnjs)
   ========================================================= */

/* ---------- 1. HIGHLIGHT.JS LOADER ----------------------------- */
const HLJS_VERSION = "11.9.0";
const HLJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}/highlight.min.js`;
const HLJS_SQL = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}/languages/sql.min.js`;
const HLJS_CSS = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}/styles/atom-one-dark.min.css`;

function loadCssOnce(href) {
  if (document.querySelector(`link[data-hljs-css]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  l.setAttribute("data-hljs-css", "1");
  document.head.appendChild(l);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function ensureHighlightJs() {
  loadCssOnce(HLJS_CSS);
  if (window.hljs && window.hljs.getLanguage && window.hljs.getLanguage("sql")) return;
  try {
    await loadScript(HLJS_CDN);
    await loadScript(HLJS_SQL);
  } catch (e) {
    // Non-fatal: code still shows, just without highlighting.
    console.warn("highlight.js failed to load:", e);
  }
}

function highlightInto(codeEl, text) {
  codeEl.textContent = text;
  if (window.hljs && window.hljs.getLanguage("sql")) {
    try { window.hljs.highlightElement(codeEl); } catch (_) { /* ignore */ }
  }
}

/* ---------- 2. SQL VIEWER -------------------------------------- */

const SQL_FALLBACK = {
  schema: `CREATE TABLE Customers (
  cust_id     VARCHAR2(10) PRIMARY KEY,
  name        VARCHAR2(100) NOT NULL,
  nationality VARCHAR2(50),
  passport_no VARCHAR2(20) UNIQUE NOT NULL
);

CREATE TABLE Flights (
  fno         VARCHAR2(10) PRIMARY KEY,
  time_depart DATE NOT NULL,
  time_arrive DATE NOT NULL,
  fare        NUMBER(10, 2),
  seats_left  NUMBER(5),
  src_city    VARCHAR2(50),
  dest_city   VARCHAR2(50),
  CONSTRAINT chk_fare  CHECK (fare >= 0),
  CONSTRAINT chk_seats CHECK (seats_left >= 0),
  CONSTRAINT chk_time  CHECK (time_arrive > time_depart)
);

CREATE TABLE Bookings (
  bid         VARCHAR2(10) PRIMARY KEY,
  cust_id     VARCHAR2(10) REFERENCES Customers(cust_id),
  total_price NUMBER(10, 2)
);

CREATE TABLE Booking_Details (
  bid          VARCHAR2(10) REFERENCES Bookings(bid) ON DELETE CASCADE,
  fno          VARCHAR2(10) REFERENCES Flights(fno),
  flight_order NUMBER(1),
  PRIMARY KEY (bid, fno)
);`,
  trigger: `CREATE OR REPLACE TRIGGER update_flight_seats
AFTER INSERT ON Booking_Details
FOR EACH ROW
BEGIN
  UPDATE Flights
  SET seats_left = seats_left - 1
  WHERE fno = :NEW.fno;
END;
/`,
  search: `SELECT f1.fno,
       f2.fno,
       (f1.fare + f2.fare) * 0.9,
       (f2.time_arrive - f1.time_depart) * 24
FROM   Flights f1
JOIN   Flights f2 ON f1.dest_city = f2.src_city
WHERE  f1.src_city = :1
  AND  f2.dest_city = :2
  AND  f2.time_depart > f1.time_arrive
  AND  f1.seats_left > 0
  AND  f2.seats_left > 0`
};

const SQL_ANNOTATIONS = {
  schema: [
    ["UNIQUE passport_no",      "one passport, one account."],
    ["chk_seats",               "seats can never go below zero, so no overbooking."],
    ["chk_time",                "a flight cannot arrive before it departs."],
    ["chk_fare",                "no negative prices."],
    ["PRIMARY KEY (bid, fno)",  "the same flight cannot be in one booking twice."],
    ["ON DELETE CASCADE",       "cancelling a booking removes its flight details."]
  ],
  trigger: [
    ["AFTER INSERT ON Booking_Details", "fires after each Booking_Details row is inserted;"],
    ["seats_left = seats - 1",           "subtracts one seat from the flight being booked;"],
    ["chk_seats",                        "if that would go below zero, the CHECK raises an error and the booking is rolled back."]
  ],
  search: [
    ["JOIN Flights f2",                  "joins Flights to itself;"],
    ["f1.dest_city = f2.src_city",       "the first flight's destination is the second flight's origin;"],
    ["f2.time_depart > f1.time_arrive",  "the second departs after the first arrives;"],
    ["seats_left > 0",                   "both must have seats;"],
    ["* 24",                             "travel time is (last arrival − first departure) × 24 hours;"],
    ["* 0.9",                            "the fare gets the 10% connection discount;"],
    [":1 / :2",                          "are bind variables (no SQL injection)."]
  ]
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

async function initSqlViewer() {
  const root = document.getElementById("sql-viewer");
  if (!root) return;

  await ensureHighlightJs();

  // Load text from data/sql/*.sql; fall back to inline if fetch fails
  async function loadTab(tab) {
    const path = root.getAttribute(`data-tab-${tab}`);
    let text = null;
    try {
      const r = await fetch(path);
      if (r.ok) text = await r.text();
    } catch (_) { /* ignore — use fallback */ }
    if (text == null) text = SQL_FALLBACK[tab];

    const panel = root.querySelector(`[data-tab-panel="${tab}"]`);
    if (!panel) return;
    const code = panel.querySelector("code");
    highlightInto(code, text);

    // Adjust line-number gutter to actual line count
    const lineNum = panel.querySelector(".line-num");
    if (lineNum) {
      const nLines = text.split("\n").length;
      lineNum.innerHTML = Array.from({ length: nLines }, () => "<span></span>").join("");
    }
  }

  for (const tab of ["schema", "trigger", "search"]) await loadTab(tab);

  // Tabs
  const tabs   = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
  const ann    = document.getElementById("sql-annotation");

  function renderAnnotation(tab) {
    const rows = SQL_ANNOTATIONS[tab] || [];
    let out = `<table><thead><tr><th>Code</th><th>What it does</th></tr></thead><tbody>`;
    rows.forEach(([k, v]) => {
      out += `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`;
    });
    out += `</tbody></table>`;
    ann.innerHTML = out;
  }

  function selectTab(tab) {
    tabs.forEach(t => {
      const isSel = t.dataset.tab === tab;
      t.setAttribute("aria-selected", String(isSel));
      t.tabIndex = isSel ? 0 : -1;
    });
    panels.forEach(p => {
      const isSel = p.dataset.tabPanel === tab;
      p.hidden = !isSel;
    });
    renderAnnotation(tab);
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t.dataset.tab));
    t.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") { ev.preventDefault(); tabs[(i + 1) % tabs.length].focus(); tabs[(i + 1) % tabs.length].click(); }
      if (ev.key === "ArrowLeft")  { ev.preventDefault(); tabs[(i - 1 + tabs.length) % tabs.length].focus(); tabs[(i - 1 + tabs.length) % tabs.length].click(); }
    });
  });

  // Copy buttons
  root.querySelectorAll(".sql-copy").forEach(btn => {
    btn.addEventListener("click", async () => {
      const panel = btn.closest("[data-tab-panel]");
      const text = panel ? panel.querySelector("code").textContent : "";
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = orig; }, 1200);
      } catch (_) {
        btn.textContent = "Copy failed";
      }
    });
  });

  selectTab("schema");
}

/* ---------- BOOT ------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initSqlViewer();
});