/* =========================================================
   main.js — page behaviour
   Owns:
     - Theme toggle (with prefers-color-scheme + optional persistence)
     - Mobile nav toggle
     - Reading progress bar
     - Sticky-nav scroll spy
     - IntersectionObserver reveal
     - Image lightbox (keyboard accessible)
     - Timeline chart vs. table vs. vertical-list switching
     - Year in footer

   No frameworks. ES module. Imports nothing from charts.js — the
   timeline chart initialisation lives in charts.js and runs on its own.
   ========================================================= */

/* ---------- 1. THEME -------------------------------------------- */
const THEME_KEY = "cpc-theme"; // localStorage is wrapped in try/catch below

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}
function setStoredTheme(value) {
  try { localStorage.setItem(THEME_KEY, value); } catch (e) { /* ignore */ }
}
function applyTheme(theme) {
  // theme is "light" | "dark" | "system"
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}
function initTheme() {
  const stored = getStoredTheme();
  if (stored === "light" || stored === "dark") applyTheme(stored);

  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
      || (getStoredTheme() !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    setStoredTheme(next);
    // Tell charts to update fills/strokes that depend on CSS vars
    document.dispatchEvent(new CustomEvent("theme:changed", { detail: { theme: next } }));
  });
}

/* ---------- 2. MOBILE NAV --------------------------------------- */
function initNavToggle() {
  const header = document.getElementById("site-header");
  const btn = document.getElementById("nav-toggle");
  if (!header || !btn) return;

  btn.addEventListener("click", () => {
    const open = header.classList.toggle("nav-open");
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  // Close after clicking a link on small screens
  header.querySelectorAll(".nav-list a").forEach(a => {
    a.addEventListener("click", () => {
      if (window.innerWidth <= 760) {
        header.classList.remove("nav-open");
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-label", "Open menu");
      }
    });
  });
}

/* ---------- 3. READING PROGRESS BAR ----------------------------- */
function initReadingProgress() {
  const bar = document.getElementById("read-progress");
  if (!bar) return;

  const update = () => {
    const h = document.documentElement;
    const scrollTop = h.scrollTop || document.body.scrollTop;
    const height = h.scrollHeight - h.clientHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    bar.style.width = pct.toFixed(2) + "%";
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

/* ---------- 4. SCROLL-SPY FOR NAV ------------------------------- */
function initScrollSpy() {
  const links = Array.from(document.querySelectorAll(".nav-list a[href^='#']"));
  const map = new Map();
  links.forEach(a => {
    const id = a.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (target) map.set(target, a);
  });
  if (map.size === 0) return;

  const setActive = (activeLink) => {
    links.forEach(l => {
      if (l === activeLink) l.setAttribute("aria-current", "true");
      else l.removeAttribute("aria-current");
    });
  };

  const obs = new IntersectionObserver((entries) => {
    // Pick the entry closest to the top that's intersecting
    let best = null;
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      if (!best || e.boundingClientRect.top < best.boundingClientRect.top) best = e;
    });
    if (best && map.has(best.target)) setActive(map.get(best.target));
  }, { rootMargin: "-30% 0px -55% 0px", threshold: 0 });

  map.forEach((_, section) => obs.observe(section));
}

/* ---------- 5. SCROLL REVEAL ------------------------------------ */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (els.length === 0) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => obs.observe(el));
}

/* ---------- 6. LIGHTBOX ----------------------------------------- */
function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const imgEl    = document.getElementById("lightbox-img");
  const closeBtn = document.getElementById("lightbox-close");
  if (!lightbox || !imgEl || !closeBtn) return;

  let lastFocused = null;

  const open = (src, alt) => {
    lastFocused = document.activeElement;
    imgEl.src = src;
    imgEl.alt = alt || "";
    lightbox.setAttribute("data-open", "true");
    closeBtn.focus();
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    lightbox.removeAttribute("data-open");
    imgEl.src = "";
    imgEl.alt = "";
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  };

  // Click on any placeholder OR real <img> inside a .figure-wrap opens the lightbox
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (target.matches(".figure-wrap img")) {
      e.preventDefault();
      open(target.currentSrc || target.src, target.alt);
    } else if (target.closest(".img-placeholder")) {
      const ph = target.closest(".img-placeholder");
      const filename = ph.querySelector(".ph-filename")?.textContent || "placeholder";
      // Placeholder has no real image to enlarge — give a friendly hint
      open(buildPlaceholderSvgDataUrl(filename), `Placeholder for ${filename}`);
    }
  });

  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.getAttribute("data-open") === "true" && e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
}

/** Build a small SVG data URL so clicking a placeholder opens a nice
    "drop your file here" message in the lightbox. */
function buildPlaceholderSvgDataUrl(filename) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'>
      <defs>
        <pattern id='p' width='24' height='24' patternUnits='userSpaceOnUse' patternTransform='rotate(-45)'>
          <rect width='12' height='24' fill='%23efece6'/>
          <rect x='12' width='12' height='24' fill='%23f7f5f1'/>
        </pattern>
      </defs>
      <rect width='800' height='500' fill='url(%23p)'/>
      <rect x='40' y='40' width='720' height='420' fill='none' stroke='%23b75d3a' stroke-dasharray='8 8' stroke-width='3' rx='12'/>
      <text x='400' y='230' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='28' fill='%231c1b18' font-weight='600'>${filename}</text>
      <text x='400' y='270' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='18' fill='%2377736d'>Replace with image</text>
      <text x='400' y='320' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='14' fill='%2377736d'>Drop a real file with this name into assets/img/</text>
    </svg>`;
  return "data:image/svg+xml;utf8," + svg.replace(/\s+/g, " ").trim();
}

/* ---------- 7. TIMELINE VIEW TOGGLE ----------------------------- */
function initTimelineViews() {
  const chartBtn  = document.getElementById("timeline-view-chart");
  const tableBtn  = document.getElementById("timeline-view-table");
  const tableWrap = document.getElementById("timeline-table-wrap");
  const vertWrap  = document.getElementById("timeline-vertical");
  const chartWrap = document.querySelector(".timeline-wrap");

  if (!chartBtn || !tableBtn) return;

  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;

  const show = (mode) => {
    const mobile = isMobile();
    // mode is "chart" or "table"
    chartBtn.setAttribute("aria-pressed", String(mode === "chart"));
    tableBtn.setAttribute("aria-pressed", String(mode === "table"));

    if (mode === "table") {
      if (tableWrap) tableWrap.setAttribute("data-visible", "true");
      if (vertWrap)  vertWrap.removeAttribute("data-visible");
      if (chartWrap) chartWrap.style.display = "none";
    } else {
      if (tableWrap) tableWrap.removeAttribute("data-visible");
      if (mobile) {
        // Mobile chart view = vertical list
        if (vertWrap) vertWrap.setAttribute("data-visible", "true");
        if (chartWrap) chartWrap.style.display = "none";
      } else {
        if (vertWrap) vertWrap.removeAttribute("data-visible");
        if (chartWrap) chartWrap.style.display = "";
      }
    }
  };

  chartBtn.addEventListener("click", () => show("chart"));
  tableBtn.addEventListener("click", () => show("table"));
  window.addEventListener("resize", () => {
    const isTable = tableBtn.getAttribute("aria-pressed") === "true";
    show(isTable ? "table" : "chart");
  });
  show("chart");
}

/* ---------- BOOT ------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavToggle();
  initReadingProgress();
  initScrollSpy();
  initReveal();
  initLightbox();
  initTimelineViews();
});