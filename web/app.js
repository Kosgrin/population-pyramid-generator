// UI logic: loading files, choosing country/year pairs, showing and exporting pyramids.

const MAX_PYRAMIDS = 12;
const $ = (id) => document.getElementById(id);

const state = {
  dataset: null, // { ages, locations, data, sources, loadedAt }
  selections: [], // [{ country, year }]
  files: { male: null, female: null },
};

const options = () => ({
  showValues: $('opt-values').checked,
  showTables: $('opt-tables').checked,
  percent: $('opt-percent').checked,
  sameScale: $('opt-samescale').checked,
});

// ---------- Small storage helpers (all optional: the app works without them) ----------

const prefs = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('ppg:' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('ppg:' + key, JSON.stringify(value));
    } catch { /* ignore */ }
  },
};

// The parsed dataset is kept in IndexedDB so you don't have to pick the files every visit.
const db = {
  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('population-pyramid', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async run(mode, fn) {
    const conn = await this.open();
    return new Promise((resolve, reject) => {
      const tx = conn.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => { conn.close(); resolve(req && req.result); };
      tx.onerror = () => { conn.close(); reject(tx.error); };
    });
  },
  get: (k) => db.run('readonly', (s) => s.get(k)),
  set: (k, v) => db.run('readwrite', (s) => s.put(v, k)),
  del: (k) => db.run('readwrite', (s) => s.delete(k)),
};

// ---------- Status line ----------

function setStatus(text, kind = '') {
  const el = $('status');
  el.className = 'status ' + kind;
  el.innerHTML = '';
  if (kind === 'busy') {
    const sp = document.createElement('span');
    sp.className = 'spinner';
    el.appendChild(sp);
  }
  el.appendChild(document.createTextNode(text));
}

// ---------- Step 1: loading files ----------

function setFile(sex, file) {
  state.files[sex] = file;
  $('name-' + sex).textContent = file.name;
  $('drop-' + sex).classList.add('has-file');
}

function setupFileInput(sex) {
  const input = $('file-' + sex);
  const drop = $('drop-' + sex);
  const pick = (file) => {
    if (!file) return;
    setFile(sex, file);
    maybeParse();
  };
  input.addEventListener('change', () => pick(input.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const files = [...e.dataTransfer.files];
    if (files.length < 2) return pick(files[0]);
    // Both files dropped at once: tell them apart by name.
    for (const f of files) {
      const which = /female/i.test(f.name) ? 'female' : /male/i.test(f.name) ? 'male' : null;
      if (which) setFile(which, f);
    }
    maybeParse();
  });
}

let worker = null;

async function maybeParse() {
  const { male, female } = state.files;
  if (!male || !female) {
    setStatus(`Now choose the ${male ? 'female' : 'male'} population file.`);
    return;
  }
  if (male === female) {
    setStatus('Please choose two different files.', 'error');
    return;
  }
  setStatus('Loading data… large files can take a few seconds.', 'busy');
  const [mBuf, fBuf] = await Promise.all([male.arrayBuffer(), female.arrayBuffer()]);

  if (worker) worker.terminate();
  worker = new Worker('worker.js');
  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.progress) return setStatus(msg.progress, 'busy');
    worker.terminate();
    worker = null;
    if (msg.error) return setStatus('❌ ' + msg.error, 'error');
    const dataset = {
      ...msg.result,
      sources: { male: male.name, female: female.name },
      loadedAt: new Date().toISOString(),
    };
    useDataset(dataset, true);
    db.set('dataset', dataset).catch(() => {});
  };
  worker.onerror = (e) => {
    setStatus('❌ Could not read the files: ' + (e.message || 'unknown error'), 'error');
  };
  worker.postMessage({ male: mBuf, female: fBuf }, [mBuf, fBuf]);
}

function yearsFor(country) {
  const d = state.dataset && state.dataset.data[country];
  return d ? Object.keys(d).map(Number).sort((a, b) => a - b) : [];
}

function closestYear(years, target) {
  if (!years.length) return null;
  return years.reduce((best, y) => (Math.abs(y - target) < Math.abs(best - target) ? y : best), years[0]);
}

function defaultSelection() {
  const ds = state.dataset;
  const last = state.selections[state.selections.length - 1];
  if (last) return { ...last };
  const names = ds.locations.map((l) => l.name);
  const country = names.find((n) => /^world$/i.test(n)) || names[0];
  return { country, year: closestYear(yearsFor(country), new Date().getFullYear()) };
}

function useDataset(dataset, fresh) {
  state.dataset = dataset;
  const nLoc = dataset.locations.length;
  const allYears = new Set();
  for (const loc of Object.values(dataset.data)) for (const y of Object.keys(loc)) allYears.add(+y);
  const ys = [...allYears].sort((a, b) => a - b);
  const when = new Date(dataset.loadedAt).toLocaleDateString();
  setStatus(
    `✅ ${fresh ? 'Loaded' : 'Using saved data from ' + when + ':'} ${nLoc} countries/areas, ` +
    `years ${ys[0]}–${ys[ys.length - 1]}.`,
    'ok'
  );
  $('clear-data').hidden = false;

  // Fill the searchable country list.
  const list = $('locations');
  list.innerHTML = '';
  const sorted = [...dataset.locations].sort((a, b) => a.name.localeCompare(b.name));
  for (const loc of sorted) {
    const opt = document.createElement('option');
    opt.value = loc.name;
    if (loc.type) opt.label = loc.type;
    list.appendChild(opt);
  }

  // Keep earlier choices that still exist in the data.
  const saved = prefs.get('selections', []);
  state.selections = saved
    .filter((s) => dataset.data[s.country])
    .map((s) => ({ country: s.country, year: closestYear(yearsFor(s.country), s.year) }))
    .slice(0, MAX_PYRAMIDS);
  if (!state.selections.length) state.selections.push(defaultSelection());

  $('config-panel').hidden = false;
  $('results-panel').hidden = false;
  renderSelections();
  renderResults();
}

// ---------- Step 2: choosing pyramids ----------

function renderSelections() {
  const wrap = $('selections');
  wrap.innerHTML = '';
  const tpl = $('selection-tpl');

  state.selections.forEach((sel, i) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.sel-title').textContent = `Pyramid ${i + 1}`;
    const countryEl = node.querySelector('.sel-country');
    const yearEl = node.querySelector('.sel-year');
    const removeEl = node.querySelector('.sel-remove');

    countryEl.value = sel.country;
    fillYears(yearEl, sel.country, sel.year);

    const commitCountry = () => {
      const name = matchLocation(countryEl.value);
      if (!name) {
        countryEl.classList.add('invalid');
        return;
      }
      countryEl.classList.remove('invalid');
      countryEl.value = name;
      if (name === sel.country) return;
      sel.country = name;
      sel.year = closestYear(yearsFor(name), sel.year);
      fillYears(yearEl, name, sel.year);
      changed();
    };
    countryEl.addEventListener('change', commitCountry);
    countryEl.addEventListener('input', () => {
      // Picking from the suggestion list should apply right away.
      if (state.dataset.data[countryEl.value]) commitCountry();
    });
    countryEl.addEventListener('focus', () => countryEl.select());

    yearEl.addEventListener('change', () => {
      sel.year = Number(yearEl.value);
      changed();
    });

    removeEl.hidden = state.selections.length === 1;
    removeEl.addEventListener('click', () => {
      state.selections.splice(i, 1);
      renderSelections();
      changed();
    });

    wrap.appendChild(node);
  });

  $('add-pyramid').disabled = state.selections.length >= MAX_PYRAMIDS;
}

function matchLocation(text) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const locs = state.dataset.locations;
  const exact = locs.find((l) => l.name.toLowerCase() === t);
  if (exact) return exact.name;
  const starts = locs.filter((l) => l.name.toLowerCase().startsWith(t));
  return starts.length === 1 ? starts[0].name : null;
}

function fillYears(select, country, year) {
  select.innerHTML = '';
  for (const y of yearsFor(country)) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === year) opt.selected = true;
    select.appendChild(opt);
  }
}

function changed() {
  prefs.set('selections', state.selections);
  renderResults();
}

// ---------- Step 3: results ----------

function pyramidFor(sel) {
  const entry = state.dataset.data[sel.country]?.[sel.year];
  if (!entry) return null;
  return { country: sel.country, year: sel.year, ages: state.dataset.ages, male: entry.m, female: entry.f };
}

function chartOptions(pyramids) {
  const o = options();
  const scaleMax = o.sameScale ? Math.max(...pyramids.map((p) => seriesMax(p, o.percent))) : null;
  return { showValues: o.showValues, percent: o.percent, scaleMax };
}

function currentPyramids() {
  return state.selections.map(pyramidFor).filter(Boolean);
}

function renderResults() {
  const wrap = $('results');
  wrap.innerHTML = '';
  const pyramids = currentPyramids();
  const opts = chartOptions(pyramids);
  const o = options();

  state.selections.forEach((sel) => {
    const card = document.createElement('div');
    card.className = 'card';
    const p = pyramidFor(sel);
    if (!p) {
      card.innerHTML = `<div class="missing">⚠️ No data for ${escapeHtml(sel.country)} (${sel.year})</div>`;
      wrap.appendChild(card);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Population pyramid for ${p.country}, ${p.year}`);
    canvas.addEventListener('click', () => openViewer(p, opts));
    card.appendChild(canvas);

    const actions = document.createElement('div');
    actions.className = 'row gap';
    actions.append(
      button('⬇ PNG', () => downloadPng([p], opts, fileBase(p) + '.png'), 'btn small'),
      button('⬇ CSV', () => downloadCsv(p), 'btn small'),
      button('🔍 Enlarge', () => openViewer(p, opts), 'btn small ghost')
    );
    card.appendChild(actions);

    if (o.showTables) {
      const det = document.createElement('details');
      det.innerHTML = '<summary>Data table</summary>';
      det.appendChild(dataTable(p));
      card.appendChild(det);
    }

    wrap.appendChild(card);
    renderToCanvas(canvas, p, opts);
  });

  $('download-all').hidden = pyramids.length < 2;
}

function button(label, onClick, cls) {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function tableRows(p) {
  return p.ages.map((age, i) => {
    const m = p.male[i] * 1000;
    const f = p.female[i] * 1000;
    return { age, m, f, t: m + f };
  });
}

function dataTable(p) {
  const rows = tableRows(p);
  const total = rows.reduce((a, r) => a + r.t, 0);
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const n = (v) => Math.round(v).toLocaleString();
  const pct = (v) => (total ? ((v / total) * 100).toFixed(2) + '%' : '–');
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.innerHTML = `
    <table class="data">
      <thead><tr><th>Age</th><th>Male</th><th>Female</th><th>Total</th><th>% of total</th></tr></thead>
      <tbody>${[...rows].reverse().map((r) =>
        `<tr><td>${escapeHtml(r.age)}</td><td>${n(r.m)}</td><td>${n(r.f)}</td><td>${n(r.t)}</td><td>${pct(r.t)}</td></tr>`
      ).join('')}</tbody>
      <tfoot><tr><td>Total</td><td>${n(sum('m'))}</td><td>${n(sum('f'))}</td><td>${n(total)}</td><td>100%</td></tr></tfoot>
    </table>`;
  return wrap;
}

// ---------- Viewer ----------

let viewing = null;

function openViewer(p, opts) {
  viewing = { p, opts };
  $('viewer-title').textContent = `${p.country} (${p.year})`;
  const tableWrap = $('viewer-table');
  tableWrap.innerHTML = '';
  tableWrap.appendChild(dataTable(p));
  const dlg = $('viewer');
  if (!dlg.open) dlg.showModal();
  renderToCanvas($('viewer-canvas'), p, opts);
}

// ---------- Downloads ----------

function fileBase(p) {
  return `pyramid_${p.country.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '')}_${p.year}`;
}

function downloadPng(pyramids, opts, name) {
  renderExport(pyramids, opts).toBlob((blob) => saveBlob(blob, name), 'image/png');
}

function downloadCsv(p) {
  const lines = ['Age group,Male,Female,Total'];
  for (const r of tableRows(p)) lines.push(`${r.age},${Math.round(r.m)},${Math.round(r.f)},${Math.round(r.t)}`);
  saveBlob(new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }), fileBase(p) + '.csv');
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Install as an app (PWA) ----------

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('install-btn').hidden = false;
});
window.addEventListener('appinstalled', () => { $('install-btn').hidden = true; });

// ---------- Startup ----------

function init() {
  setupFileInput('male');
  setupFileInput('female');

  // Restore display options.
  const saved = prefs.get('options', {});
  for (const key of ['values', 'tables', 'percent', 'samescale']) {
    const el = $('opt-' + key);
    if (key in saved) el.checked = saved[key];
    el.addEventListener('change', () => {
      const all = {};
      for (const k of ['values', 'tables', 'percent', 'samescale']) all[k] = $('opt-' + k).checked;
      prefs.set('options', all);
      renderResults();
    });
  }

  $('add-pyramid').addEventListener('click', () => {
    if (state.selections.length >= MAX_PYRAMIDS) return;
    state.selections.push(defaultSelection());
    renderSelections();
    changed();
    const inputs = document.querySelectorAll('.sel-country');
    inputs[inputs.length - 1]?.focus();
  });

  $('download-all').addEventListener('click', () => {
    const pyramids = currentPyramids();
    if (pyramids.length) downloadPng(pyramids, chartOptions(pyramids), 'population_pyramids.png');
  });

  $('clear-data').addEventListener('click', async () => {
    await db.del('dataset').catch(() => {});
    location.reload();
  });

  $('viewer-close').addEventListener('click', () => $('viewer').close());
  $('viewer').addEventListener('click', (e) => { if (e.target === $('viewer')) $('viewer').close(); });
  $('viewer-png').addEventListener('click', () => viewing && downloadPng([viewing.p], viewing.opts, fileBase(viewing.p) + '.png'));
  $('viewer-csv').addEventListener('click', () => viewing && downloadCsv(viewing.p));

  $('install-btn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $('install-btn').hidden = true;
  });

  // Redraw charts when the layout width changes.
  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.dataset) renderResults();
      if ($('viewer').open && viewing) renderToCanvas($('viewer-canvas'), viewing.p, viewing.opts);
    }, 150);
  });

  // Load previously parsed data, if any.
  db.get('dataset')
    .then((ds) => { if (ds && !state.dataset) useDataset(ds, false); })
    .catch(() => {});

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
