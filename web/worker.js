// Parses the UN World Population Prospects Excel files off the main thread,
// so the page stays responsive while large files load.
importScripts('vendor/xlsx.mini.min.js');

const LOCATION_HEADER = /^region, subregion, country or area/i;
const AGE_HEADER = /^\d+\s*[-–]\s*\d+$|^\d+\s*\+$/;

// Sheets read first win when the same place/year shows up twice.
const SHEET_PRIORITY = ['estimates', 'medium variant'];

function sheetOrder(names) {
  const rank = (n) => {
    const i = SHEET_PRIORITY.indexOf(n.trim().toLowerCase());
    return i === -1 ? SHEET_PRIORITY.length : i;
  };
  return [...names].sort((a, b) => rank(a) - rank(b));
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[\s,]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Returns { ages: string[], rows: Map<location, Map<year, number[]>>, types: Map<location, type> }
 */
function parseWorkbook(buffer, label) {
  const wb = XLSX.read(buffer, { type: 'array', dense: true });
  const rows = new Map();
  const types = new Map();
  let ages = null;

  for (const name of sheetOrder(wb.SheetNames)) {
    const table = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });

    // Find the header row instead of assuming a fixed position.
    const headerIdx = table.findIndex(
      (r, i) => i < 60 && r && r.some((c) => typeof c === 'string' && LOCATION_HEADER.test(c.trim()))
    );
    if (headerIdx === -1) continue;

    const header = table[headerIdx].map((c) => (c == null ? '' : String(c).trim()));
    const locCol = header.findIndex((c) => LOCATION_HEADER.test(c));
    const yearCol = header.findIndex((c) => c.toLowerCase() === 'year');
    const typeCol = header.findIndex((c) => c.toLowerCase() === 'type');
    const ageCols = header.map((c, i) => (AGE_HEADER.test(c) ? i : -1)).filter((i) => i !== -1);
    if (yearCol === -1 || ageCols.length === 0) continue;

    const sheetAges = ageCols.map((i) => header[i].replace(/\s+/g, '').replace('–', '-'));
    if (!ages) ages = sheetAges;
    else if (ages.join() !== sheetAges.join()) continue; // different layout, skip

    for (let r = headerIdx + 1; r < table.length; r++) {
      const row = table[r];
      if (!row) continue;
      const loc = row[locCol];
      const year = toNumber(row[yearCol]);
      if (loc == null || year == null) continue;
      const values = ageCols.map((i) => toNumber(row[i]));
      if (values.every((v) => v == null)) continue;

      const name = String(loc).trim();
      if (!rows.has(name)) rows.set(name, new Map());
      const byYear = rows.get(name);
      if (!byYear.has(year)) byYear.set(year, values.map((v) => v ?? 0));
      if (typeCol !== -1 && row[typeCol] && !types.has(name)) types.set(name, String(row[typeCol]).trim());
    }
  }

  if (!ages) {
    throw new Error(
      `${label}: couldn't find the data table. Expected a header row with ` +
      `"Region, subregion, country or area *", "Year" and age columns like "0-4".`
    );
  }
  return { ages, rows, types };
}

self.onmessage = (e) => {
  const { male, female } = e.data;
  try {
    self.postMessage({ progress: 'Reading male file…' });
    const m = parseWorkbook(male, 'Male file');
    self.postMessage({ progress: 'Reading female file…' });
    const f = parseWorkbook(female, 'Female file');

    if (m.ages.join() !== f.ages.join()) {
      throw new Error('The male and female files have different age groups.');
    }

    // Keep only place/year pairs present in both files.
    const data = {};
    const locations = [];
    for (const [name, mYears] of m.rows) {
      const fYears = f.rows.get(name);
      if (!fYears) continue;
      const years = {};
      for (const [year, mv] of mYears) {
        const fv = fYears.get(year);
        if (fv) years[year] = { m: mv, f: fv };
      }
      if (Object.keys(years).length) {
        data[name] = years;
        locations.push({ name, type: m.types.get(name) || f.types.get(name) || '' });
      }
    }
    if (!locations.length) throw new Error('No country/year combinations appear in both files.');

    self.postMessage({ result: { ages: m.ages, locations, data } });
  } catch (err) {
    self.postMessage({ error: err.message || String(err) });
  }
};
