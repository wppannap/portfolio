# Chin Pang Chow — Personal Portfolio

A static, single-page personal portfolio built with plain HTML, CSS, vanilla
JavaScript and D3.js (v7). No build step, no backend — designed to be hosted
on GitHub Pages for free.

> **Positioning:** *I turn data into clear, human stories.*

---

## File tree

```
portfolio/
├── index.html                  ← the whole page (one file)
├── README.md                   ← this file
├── .nojekyll                   ← keep GitHub Pages from running Jekyll
├── css/
│   └── style.css               ← design system, layout, theme, charts, responsive, print
├── js/
│   ├── main.js                 ← nav, theme toggle, scroll-spy, lightbox, reveal, timeline views
│   ├── charts.js               ← D3 visualisations (timeline, skills, heatmap, clusters)
│   └── project3.js             ← COMP2016 SQL viewer
├── data/
│   ├── timeline.json           ← career / competition / milestone data
│   ├── correlation.json        ← correlation matrix for the heatmap
│   ├── clusters.json           ← cluster profile data for the bar multiples
│   ├── flights.json            ← COMP2016 sample flights (CX100, CX101, CX102)
│   └── sql/                    ← COMP2016 verbatim SQL shown in the tabs
│       ├── schema.sql          ← CREATE TABLE statements
│       ├── trigger.sql         ← seat-update trigger
│       └── search.sql          ← one-stop connection query
└── assets/
    ├── img/                    ← drop real images here (filenames match placeholders)
    │   ├── p1-cluster-scatter.png
    │   ├── p1-correlation-heatmap.png
    │   ├── p2-pca-scatter.png
    │   ├── p2-scree.png
    │   ├── p2-biplot.png
    │   ├── p2-elbow.png
    │   ├── p4-er-diagram.png
    │   ├── profile-photo.jpg
    │   └── _backup/
    │       └── hero-visual.png ← previous hero image, kept out of use
    └── docs/
        └── CV_Chin_Pang_Chow.pdf ← add your CV
```

> **Hero image:** the hero `<img src=…>` in `index.html` (search for
> `Single source of truth for the hero image`) currently points at
> `assets/img/p2-pca-scatter.png`. Change the `src` and `alt` there in one
> place to swap in a different figure.

---

## Run it locally

You only need a static file server — there is no build step.

### Option 1 — Python (built-in)
```bash
cd portfolio
python3 -m http.server 8000
```
Then open <http://localhost:8000/> in your browser.

### Option 2 — Node
```bash
npx serve .
```

### Option 3 — VS Code
Install the **Live Server** extension, right-click `index.html`, choose
*Open with Live Server*.

> Why a server? Browsers refuse to `fetch()` `data/*.json` and
> `data/sql/*.sql` from a plain `file://` URL for security reasons. Any
> local server works. The SQL viewer still works if a `fetch()` fails
> because it falls back to inline content.

---

## Deploy to GitHub Pages (step by step)

1. **Create a GitHub repo** (e.g. `chin-pang-chow.github.io`).
2. **Push this folder:**
   ```bash
   cd portfolio
   git init
   git add .
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git commit -m "Initial portfolio"
   git push -u origin main
   ```
3. **Turn on GitHub Pages:** repo → **Settings** → **Pages** → *Source*:
   **Deploy from a branch** → `main` / `(root)` → **Save**.
4. Wait ~30 seconds; site is live at:
   `https://<your-username>.github.io/<repo>/`

   If the repo is named `<username>.github.io`, GitHub serves it from the
   root path. All links are **relative**, so they work under either root
   or sub-path hosting.

---

## What you need to replace before going live

The site ships with visible, labelled `[placeholder]` slots so nothing is
hidden — but you must drop your own files into the right places.

### 1. Images (drop a real file with the same name into `assets/img/`)

| Slot                          | File                                   |
|-------------------------------|----------------------------------------|
| Profile photo                 | `assets/img/profile-photo.jpg`         |
| Project 1 cluster scatter     | `assets/img/p1-cluster-scatter.png`   |
| Project 1 correlation heatmap | `assets/img/p1-correlation-heatmap.png`|
| Project 2 PCA scatter         | `assets/img/p2-pca-scatter.png`       |
| Project 2 scree plot          | `assets/img/p2-scree.png`              |
| Project 2 biplot              | `assets/img/p2-biplot.png`             |
| Project 2 elbow plot          | `assets/img/p2-elbow.png`              |
| Project 3 ER diagram (COMP2016) | `assets/img/p4-er-diagram.png`       |

Just overwrite the placeholder file with the same name — the page picks
it up automatically. If the file is missing, a styled placeholder shows
up with the expected filename and a "Replace with image" hint.

### 2. CV PDF

Save your CV as `assets/docs/CV_Chin_Pang_Chow.pdf`. The "Download CV"
buttons link to this file.

### 3. Social links

In `index.html`, find the Contact section and replace the two `[link]`
placeholders with real GitHub and LinkedIn URLs.

### 4. Any other `[placeholder]` you find

Search the project for `[placeholder]` (Ctrl/Cmd-Shift-F). Every visible
one is intentional and meant to be replaced.

---

## TODO list for the student (open items)

These are the places where this site still relies on assumptions about
your work. Each is searchable and small.

### COMP2016 case study (Project 3)

- [ ] **Confirm dates** for COMP2016. The subtitle currently shows
  `[placeholder: months/year]`. Open `index.html` and search for that
  phrase; replace it with e.g. `Jan–Apr 2025`. Do **not** add a
  COMP2016 entry to the career timeline yet (it stays a project, not a
  job).
- [ ] **Confirm your role** on the COMP2016 group project. The subtitle
  currently shows
  `[placeholder: confirm role, e.g. database design, security and documentation]`.
  Search for that phrase in `index.html` and replace it with your real
  role (one short phrase is enough).
- [ ] **Decide whether to keep the "What I'd do differently" items**.
  They describe gaps in the project's `main.py`: total_price of 0 on
  insert, three-flight search not implemented, and seats not restored on
  cancel. If your final code added any of these, edit
  `index.html` and remove the matching bullet so the page matches what
  the project actually shipped.

### Career timeline (only if dates are confirmed)

- [ ] If you want COMP2016 in the timeline anyway (e.g. as a course bar
  on the Education lane), open `data/timeline.json` and add an entry
  with `id: "edu-comp2016"`, `lane: "education"`, your start and end
  months, and a short note. Do **not** invent dates.

### Other placeholders

- [ ] GitHub and LinkedIn profile URLs in the Contact section
  (`[placeholder]` inside `https://github.com/[placeholder]` and
  `https://www.linkedin.com/in/[placeholder]`).
- [ ] `assets/docs/CV_Chin_Pang_Chow.pdf` — replace if you have an
  updated version.
- [ ] `assets/img/profile-photo.jpg` — drop a real profile photo.

---

## Editing content

- **Words on the page** live in `index.html`. Edit them in place; the
  layout reflows automatically.
- **Chart data** lives in `data/*.json`. Edit those files; the charts
  re-render on reload. Do **not** edit the numbers inside `js/charts.js`.
- **Skills matrix** is defined inline at the top of `renderSkillsMatrix`
  in `js/charts.js`. It is intentionally local to the chart code
  because the structure (rows × cols grid) is tightly coupled to it.
- **SQL viewer** reads `data/sql/schema.sql`, `data/sql/trigger.sql`
  and `data/sql/search.sql` via `fetch()`. The same strings are baked
  into `js/project3.js` as a fallback for `file://` previews.
- **Colours** are all CSS custom properties at the top of `css/style.css`
  under `:root` and `[data-theme="dark"]`. Change them once and every
  chart and timeline lane updates.
- **Fonts** are loaded from Google Fonts in `index.html`. Swap them out
  there if you want a different pairing.

---

## Accessibility, performance and theme

- Semantic landmarks (`header`, `nav`, `main`, `section`, `article`,
  `aside`, `footer`).
- Skip link, visible focus, keyboard-accessible lightbox, keyboard-accessible
  timeline tooltips and SQL viewer tabs (ARIA tablist).
- The SQL annotation region uses `aria-live="polite"` so
  screen readers announce results.
- All charts expose `role="img"` with an `aria-label` describing the
  chart in plain English, plus a `<title>` element on each cell/marker
  for screen readers and a textual fallback table for the correlation
  heatmap.
- Light/dark theme toggle in the header. Honours `prefers-color-scheme`
  on first visit, remembers the user's choice in `localStorage` (wrapped
  in `try/catch` so it never breaks the page if storage is unavailable).
- `prefers-reduced-motion` disables chart entrance transitions and
  reveal animations.
- Responsive from 360 px to 1280 px+. Charts overflow-scroll inside
  their own cards so the page never gets sideways scroll.

---

## QA / acceptance tests

Acceptance tests live in `_qa/`. They are checked into the repo so you
can rerun them after edits.

```bash
python3 _qa/acceptance.py
```

The test starts a local HTTP server, opens the site in headless Chrome,
and at viewport widths 360, 768 and 1280 px it:

1. For every `figure img`, asserts that the displayed size equals the
   natural size (proportional scaling) and that no ancestor has
   `overflow: hidden` clipping the image.
2. Verifies the SQL viewer tabs render the right code from `data/sql/`.
2. Verifies the SQL viewer tabs render the right code from `data/sql/`.
3. Saves full-page PNG screenshots at each viewport into `_qa/`.

Exit code `0` means all checks passed.

---

## License & attribution

- D3.js v7 — ISC licence (loaded from jsDelivr CDN).
- highlight.js v11 — BSD licence (loaded from cdnjs).
- Inter and Source Serif 4 — Google Fonts (OFL).
- All text on this site is the student's own work.