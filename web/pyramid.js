// Drawing a population pyramid on a <canvas>.
// Population values come from the UN files in thousands; we convert to persons here.

const COLORS = {
  male: '#3498db',
  female: '#e74c3c',
  text: '#1f2933',
  muted: '#61707f',
  grid: '#e3e7eb',
  axis: '#1f2933',
  background: '#ffffff',
};

/** Short human format: 1.23B, 45.6M, 789k, 512 */
function formatPeople(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return trim(n / 1e9, a >= 1e10 ? 1 : 2) + 'B';
  if (a >= 1e6) return trim(n / 1e6, a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e3) return trim(n / 1e3, a >= 1e4 ? 0 : 1) + 'k';
  return String(Math.round(n));
}

function formatPercent(p) {
  return trim(p, Math.abs(p) >= 10 ? 1 : 2) + '%';
}

function trim(x, digits) {
  return Number(x.toFixed(digits)).toString();
}

/** A "nice" step for axis ticks so that we get roughly `count` ticks up to max. */
function niceStep(max, count) {
  const raw = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return mult * pow;
}

/**
 * Turn raw data into what the chart shows.
 * pyramid: { country, year, ages[], male[], female[] } (male/female in thousands)
 */
function pyramidSeries(pyramid, percent) {
  const male = pyramid.male.map((v) => v * 1000);
  const female = pyramid.female.map((v) => v * 1000);
  const totalMale = male.reduce((a, b) => a + b, 0);
  const totalFemale = female.reduce((a, b) => a + b, 0);
  const total = totalMale + totalFemale;
  const scale = percent ? (total > 0 ? 100 / total : 0) : 1;
  return {
    male: male.map((v) => v * scale),
    female: female.map((v) => v * scale),
    totalMale,
    totalFemale,
    total,
  };
}

function seriesMax(pyramid, percent) {
  const s = pyramidSeries(pyramid, percent);
  return Math.max(0, ...s.male, ...s.female);
}

/**
 * Draw a pyramid.
 * opts: { width, height, showValues, percent, scaleMax }
 * scaleMax: optional shared maximum (in display units) so pyramids are comparable.
 */
function drawPyramid(ctx, pyramid, opts) {
  const W = opts.width;
  const H = opts.height;
  const s = pyramidSeries(pyramid, opts.percent);
  const fmt = opts.percent ? formatPercent : formatPeople;
  const n = pyramid.ages.length;

  // Everything scales with the canvas so thumbnails and exports look alike.
  const u = Math.min(W / 720, H / 560);
  const font = (px, weight = '') =>
    `${weight} ${Math.max(8, px * u)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  ctx.save();
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // Title and totals
  const pad = 24 * u;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = font(26, '700');
  ctx.fillText(`${pyramid.country} (${pyramid.year})`, W / 2, pad, W - 2 * pad);
  ctx.font = font(16);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(
    `Total ${formatPeople(s.total)}  ·  Male ${formatPeople(s.totalMale)}  ·  Female ${formatPeople(s.totalFemale)}`,
    W / 2, pad + 36 * u, W - 2 * pad
  );

  // Plot area: two halves with a central column for age labels.
  const top = pad + 96 * u;
  const bottom = H - pad - 34 * u;
  const gutter = 64 * u;
  const left = pad + 14 * u;
  const right = W - pad - 14 * u;
  const center = W / 2;
  const halfW = center - gutter / 2 - left;
  const maleZero = center - gutter / 2;
  const femaleZero = center + gutter / 2;

  // Side labels
  ctx.font = font(16, '700');
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = COLORS.male;
  ctx.textAlign = 'left';
  ctx.fillText('♂ Male', left, top - 10 * u);
  ctx.fillStyle = COLORS.female;
  ctx.textAlign = 'right';
  ctx.fillText('Female ♀', right, top - 10 * u);

  const dataMax = Math.max(0, ...s.male, ...s.female);
  let max = opts.scaleMax && opts.scaleMax > 0 ? opts.scaleMax : dataMax;
  if (max <= 0) max = 1;
  const step = niceStep(max, 4);
  // Leave room for value labels at the end of the longest bars.
  const axisMax = Math.max(Math.ceil((max * (opts.showValues ? 1.18 : 1.04)) / step) * step, step);
  const scaleX = halfW / axisMax;

  // Grid and ticks
  ctx.font = font(13);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for (let v = 0; v <= axisMax + 1e-9; v += step) {
    for (const [zero, dir] of [[maleZero, -1], [femaleZero, 1]]) {
      const x = zero + dir * v * scaleX;
      ctx.strokeStyle = v === 0 ? COLORS.axis : COLORS.grid;
      ctx.lineWidth = v === 0 ? 1.2 * u : 1 * u;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(fmt(v), x, bottom + 6 * u);
    }
  }

  // Bars: index 0 is the youngest group, drawn at the bottom.
  const rowH = (bottom - top) / n;
  const barH = rowH * 0.82;
  const labelPx = Math.min(13, (rowH / u) * 0.6);
  for (let i = 0; i < n; i++) {
    const yMid = bottom - (i + 0.5) * rowH;
    const y = yMid - barH / 2;
    const mw = s.male[i] * scaleX;
    const fw = s.female[i] * scaleX;

    ctx.fillStyle = COLORS.male;
    ctx.fillRect(maleZero - mw, y, mw, barH);
    ctx.fillStyle = COLORS.female;
    ctx.fillRect(femaleZero, y, fw, barH);

    // Age label in the middle column
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(Math.min(13, (rowH / u) * 0.65));
    ctx.fillText(pyramid.ages[i], center, yMid, gutter - 4 * u);

    if (opts.showValues) {
      ctx.font = font(labelPx);
      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = 'right';
      ctx.fillText(fmt(s.male[i]), maleZero - mw - 4 * u, yMid);
      ctx.textAlign = 'left';
      ctx.fillText(fmt(s.female[i]), femaleZero + fw + 4 * u, yMid);
    }
  }

  // Axis caption
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = font(13);
  ctx.fillText(opts.percent ? '% of total population' : 'Population', center, H - pad / 2);

  ctx.restore();
}

/** Size a visible canvas to its CSS width (crisp on high-DPI screens) and draw. */
function renderToCanvas(canvas, pyramid, opts) {
  const cssW = canvas.clientWidth || 600;
  const cssH = Math.round(cssW * 0.78);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPyramid(ctx, pyramid, { ...opts, width: cssW, height: cssH });
}

/** Render one or more pyramids into a fixed-size image for download. */
function renderExport(pyramids, opts) {
  const cellW = 1500;
  const cellH = 1170;
  const cols = Math.min(3, pyramids.length);
  const rows = Math.ceil(pyramids.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cellW * cols;
  canvas.height = cellH * rows;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  pyramids.forEach((p, i) => {
    ctx.save();
    ctx.translate((i % cols) * cellW, Math.floor(i / cols) * cellH);
    drawPyramid(ctx, p, { ...opts, width: cellW, height: cellH });
    ctx.restore();
  });
  return canvas;
}
