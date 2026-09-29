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
│   └── style.css               ← design system, layout, theme, charts, responsive
├── js/
│   ├── main.js                 ← nav, theme toggle, scroll-spy, lightbox, reveal
│   └── charts.js               ← D3 visualisations (timeline, skills, heatmap, clusters)
├── data/
│   ├── timeline.json           ← career / competition / milestone data
│   ├── correlation.json        ← correlation matrix for the heatmap
│   └── clusters.json           ← cluster profile data for the bar multiples
└── assets/
    ├── img/                    ← drop real images here (filenames match placeholders)
    │   ├── hero-visual.png
    │   ├── profile-photo.jpg
    │   ├── p1-cluster-scatter.png
    │   ├── p1-correlation-heatmap.png
    │   ├── p2-pca-scatter.png
    │   ├── p2-scree.png
    │   ├── p2-biplot.png
    │   ├── p2-elbow.png
    │   ├── p4-er-diagram.png
    │   └── (p3-mock-dashboard.png intentionally absent)
    └── docs/
        └── CV_Chin_Pang_Chow.pdf    ← you must add this file
```

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

> Why a server? Browsers refuse to `fetch()` `data/*.json` from a plain
> `file://` URL for security reasons. Any local server works.

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
3. **Turn on GitHub Pages:**
   - Go to the repo on GitHub → **Settings** → **Pages**.
   - Under *Source*, choose **Deploy from a branch**.
   - Select `main` / `(root)` and click **Save**.
4. Wait ~30 seconds; your site is live at:
   `https://<your-username>.github.io/<repo>/`

   If the repo is named `<username>.github.io`, GitHub will serve it from
   the root path. All links in this portfolio are **relative**, so they
   work under either root or sub-path hosting without changes.

---

## What you need to replace before going live

The site ships with visible, labelled `[placeholder]` slots so nothing is
hidden — but you must drop your own files into the right places.

### 1. Images (drop a real file with the same name into `assets/img/`)

| Slot                              | File                         |
|----------------------------------|-----------------------------|
| Hero visual                      | `assets/img/hero-visual.png` |
| Profile photo                   | `assets/img/profile-photo.jpg` |
| Project 1 cluster scatter       | `assets/img/p1-cluster-scatter.png` |
| Project 1 correlation heatmap   | `assets/img/p1-correlation-heatmap.png` |
| Project 2 PCA scatter           | `assets/img/p2-pca-scatter.png` |
| Project 2 scree plot            | `assets/img/p2-scree.png` |
| Project 2 biplot                | `assets/img/p2-biplot.png` |
| Project 2 elbow plot            | `assets/img/p2-elbow.png` |
| Project 4 ER diagram (COMP2016) | `assets/img/p4-er-diagram.png` |

Just overwrite the placeholder file with the same name — the page picks it
up automatically. If the file is missing, a styled placeholder shows up
with the expected filename and a "Replace with image" hint.

### 2. CV PDF

Save your CV as `assets/docs/CV_Chin_Pang_Chow.pdf`. The "Download CV"
button on the home page and the Contact section both link to this file.

### 3. Social links

In `index.html`, find the Contact section and replace the two `[link]`
placeholders with real GitHub and LinkedIn URLs.

### 4. Any other `[placeholder]` you find

Search the project for `[placeholder]` (Ctrl/Cmd-Shift-F). Every visible
one is intentional and meant to be replaced.

### 5. Project 3 dashboard (`assets/img/p3-mock-dashboard.png`)

This is intentionally **missing** — the original internship figures are
confidential. The caption has been updated to flag the slot as pending;
the page now shows a placeholder there. Three options:
  (a) supply a redacted / sample-data version you are allowed to publish,
  (b) replace the figure with the existing `p3-process.png` diagram only,
  (c) remove the figure and its `<figure>` block from `index.html`.

### 6. Profile photo (`assets/img/profile-photo.jpg`)

Drop any JPG/PNG into this slot. The two photos that would normally
come from `Internship_Work_Report.pdf` could not be extracted (the PDF
is not present in the project folder). The slot is wired up: drop the
file with the right name and it appears automatically.

---

## Editing content

- **Words on the page** live in `index.html`. Edit them in place; the
  layout reflows automatically.
- **Chart data** lives in `data/*.json`. Edit those files; the charts
  re-render on reload. Do **not** edit the numbers inside `js/charts.js`.
- **Skills matrix** is a small inline table at the top of `renderSkillsMatrix`
  in `js/charts.js`. It's intentionally local to the chart code because
  the structure (rows × cols grid) is tightly coupled to it.
- **Colours** are all CSS custom properties at the top of `css/style.css`
  under `:root` and `[data-theme="dark"]`. Change them once and every
  chart and timeline lane updates.
- **Fonts** are loaded from Google Fonts in `index.html`. Swap them out
  there if you want a different pairing.

---

## Accessibility, performance and theme

- Semantic landmarks (`header`, `nav`, `main`, `section`, `article`, `footer`).
- Skip link, visible focus, keyboard-accessible lightbox, keyboard-accessible
  timeline tooltips.
- All charts expose `role="img"` with an `aria-label` describing the chart
  in plain English, plus a `<title>` element on each cell/marker for
  screen readers and a textual fallback table for the correlation heatmap.
- Light/dark theme toggle in the header. Honours `prefers-color-scheme`
  on first visit, remembers the user's choice in `localStorage` (wrapped
  in `try/catch` so it never breaks the page if storage is unavailable).
- `prefers-reduced-motion` disables chart entrance transitions and reveal
  animations.
- Responsive from 360px to 1280px+. Charts overflow-scroll inside their
  own cards so the page never gets sideways scroll.

---

## License & attribution

- D3.js v7 — ISC licence (loaded from jsDelivr CDN).
- Inter and Source Serif 4 — Google Fonts (OFL).
- All text on this site is the student's own work, used verbatim from the
  assignment brief.

Built with the help of generative AI; prompts and conversation logs are
provided with the assignment submission.