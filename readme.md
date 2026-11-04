# 🌍 Population Pyramid Generator

Build population pyramids from UN World Population Prospects data — right in your browser.
No server, no Python, no installation: the app is a static web page that can be hosted on
GitHub Pages, works offline once opened, and can be installed as a desktop or phone app.

![License](https://img.shields.io/badge/license-MIT-green.svg)

**Live app:** `https://kosgrin.github.io/population-pyramid-generator/` (after enabling GitHub Pages, see below)

## ✨ Features

- 📊 **Up to 12 pyramids at once** — compare countries, or one country across years
- 🔎 **Searchable country list** and per-country year list
- 🏷️ **Value labels** on bars (toggle)
- 📋 **Data tables** with male / female / total and % of total
- 📐 **% of total population** mode for fair comparisons between countries of different sizes
- ⚖️ **Same scale** option so several pyramids can be compared at a glance
- 💾 **Downloads**: PNG for each pyramid, all pyramids in one PNG, and CSV data
- 🔒 **Private**: Excel files are read on your device; nothing is uploaded
- 🧠 **Remembers your data** and choices between visits (stored in your browser)
- 📴 **Works offline** and can be **installed as an app** (Chrome/Edge: “Install app” button or the install icon in the address bar; iPhone: Share → Add to Home Screen)
- 🌙 Light and dark mode, works on phones

## 📊 Data

Download from [UN World Population Prospects](https://population.un.org/wpp/downloads?folder=Standard%20Projections&group=Population):

- **Male**: `WPP2024_POP_F02_2_POPULATION_5-YEAR_AGE_GROUPS_MALE.xlsx`
- **Female**: `WPP2024_POP_F02_3_POPULATION_5-YEAR_AGE_GROUPS_FEMALE.xlsx`

The app finds the header row automatically (the one containing
`Region, subregion, country or area *`, `Year` and age columns like `0-4` … `100+`).
It reads both the **Estimates** (1950–2023) and **Medium variant** (2024–2100) sheets,
so past data and projections are both available. Values in the files are in thousands.

## 🚀 Usage

1. Open the app and choose the male and female files (or drop both onto either box).
2. Pick a country/area and a year for each pyramid; use **+ Add pyramid** for more.
3. Toggle the display options. Charts update instantly.
4. Tap a pyramid to enlarge it, or use the PNG / CSV buttons to download.

## 🌐 Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `web/` folder on every push to `main`.

One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source**
and choose **GitHub Actions**. After the next push to `main` (or running the workflow manually
from the **Actions** tab) the app is live at `https://<user>.github.io/population-pyramid-generator/`.

## 💻 Running locally

Any static file server works, for example:

```bash
python3 -m http.server 8000 -d web
```

Then open <http://localhost:8000>. (Opening `index.html` directly from disk won't work,
because browsers block the background file reader on `file://` pages.)

## 🗂️ Project structure

```
web/
  index.html            page layout
  style.css             styles (light + dark)
  app.js                UI: loading files, selections, downloads
  pyramid.js            draws the pyramid on a canvas
  worker.js             reads the Excel files in the background
  sw.js                 offline support
  manifest.webmanifest  makes the app installable
  vendor/               SheetJS (Excel reader), bundled so no CDN is needed
legacy/
  streamlit_app.py      the original Streamlit version
```

## 🎨 Customization

Colors live at the top of `web/pyramid.js`:

```js
const COLORS = { male: '#3498db', female: '#e74c3c', ... };
```

## 🐍 Old Streamlit version

The original Streamlit app is kept in `legacy/`:

```bash
pip install -r legacy/requirements.txt
streamlit run legacy/streamlit_app.py
```

## 📄 License

MIT — see [LICENSE](LICENSE). Bundled [SheetJS](https://sheetjs.com/) is Apache-2.0 licensed (`web/vendor/xlsx-LICENSE.txt`).

## 🙏 Acknowledgments

- Data: [UN World Population Prospects 2024](https://population.un.org/wpp/)
- Excel reading: [SheetJS](https://sheetjs.com/)

## 📧 Contact

Open an issue on GitHub or email grinyakkostya@gmail.com.

## 🗺️ Roadmap

- [ ] Animation over time for one country
- [ ] Overlay two pyramids for comparison
- [ ] Export several pyramids to PDF
- [ ] Custom color schemes
- [ ] Optional built-in dataset so no download is needed
