// Draws the Vice After Dark poster: one hero photo full-bleed, a neon grade,
// a title block (Archivo Black title, Monoton neon accent, Lobster tagline),
// an optional tilted inset snapshot, a starburst sticker, vignette and
// seeded grain. Everything is drawn on a 2D canvas, deterministic: the grain
// comes from a fixed-seed pattern, so the same state always draws the same
// pixels.

export const GRADES = {
  'after-dark': {
    name: 'After Dark', deep: '#14081f',
    top: 'rgba(255,45,149,0.34)', bottom: 'rgba(80,20,160,0.42)',
    scrim: 'rgba(10,4,20,0.55)', accent: '#ff2d95',
  },
  'teal-tide': {
    name: 'Teal Tide', deep: '#041a1c',
    top: 'rgba(0,229,255,0.30)', bottom: 'rgba(0,90,120,0.45)',
    scrim: 'rgba(2,12,18,0.55)', accent: '#00e5ff',
  },
  'gold-coast': {
    name: 'Gold Coast', deep: '#241204',
    top: 'rgba(255,170,40,0.32)', bottom: 'rgba(180,60,10,0.42)',
    scrim: 'rgba(20,8,2,0.55)', accent: '#ffb52e',
  },
  'ultraviolet': {
    name: 'Ultraviolet', deep: '#160a2e',
    top: 'rgba(190,60,255,0.34)', bottom: 'rgba(60,10,120,0.45)',
    scrim: 'rgba(10,4,26,0.55)', accent: '#be3cff',
  },
  'sunset-strip': {
    name: 'Sunset Strip', deep: '#200a12',
    top: 'rgba(255,110,60,0.32)', bottom: 'rgba(200,30,110,0.42)',
    scrim: 'rgba(18,4,12,0.55)', accent: '#ff6e3c',
  },
  'acid-lime': {
    name: 'Acid Lime', deep: '#0c1a05',
    top: 'rgba(170,255,60,0.28)', bottom: 'rgba(20,80,20,0.45)',
    scrim: 'rgba(4,14,4,0.55)', accent: '#aaff3c',
  },
};
export const GRADE_KEYS = Object.keys(GRADES);

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 × 1080' },
};

/** mulberry32: a tiny deterministic PRNG, so the grain never changes. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let noiseTile = null;
/** A 256 x 256 grey-noise tile, built once from a fixed seed. */
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const rand = mulberry32(20261121);
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  noiseTile = tile;
  return tile;
}

/** Greedy word wrap of `text` to `maxWidth` at the context's current font. */
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size (<= start) whose wrapped lines all fit maxWidth. */
function fitTitle(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  let lines = [];
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxWidth)) break;
    size -= 4;
  }
  return { size, lines };
}

/** Draws `text` with wide letter spacing, centered on x. */
function drawSpaced(ctx, text, cx, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

/** A 12-point starburst, filled, centered on (cx, cy). */
function drawStarburst(ctx, cx, cy, rOuter, rInner, points, rotation) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rotation + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws the whole poster onto `canvas` (its width/height are the export size).
 * `state` carries the photos (Image objects or null), the words, the grade,
 * the title position/style, the inset snapshot and the effect toggles.
 */
export function drawPoster(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES['after-dark'];
  const u = Math.min(w, h) / 1080; // scale unit: 1 at 1080 wide

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, w, h);

  // Hero photo, cover-fit, zoomed and panned by the editor.
  if (state.photo) {
    const iw = state.photo.naturalWidth;
    const ih = state.photo.naturalHeight;
    const base = Math.max(w / iw, h / ih);
    const scale = base * (state.photoZoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) / 2 + (state.photoX || 0) * w;
    const dy = (h - dh) / 2 + (state.photoY || 0) * h;
    ctx.drawImage(state.photo, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#241233';
    for (let i = -h; i < w; i += 48 * u) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.lineTo(i + h + 24 * u, h);
      ctx.lineTo(i + 24 * u, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(48 * u)}px "Archivo Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('LOAD A PHOTO', w / 2, h / 2);
  }

  // Neon grade: colour washes top and bottom, then a legibility scrim.
  ctx.globalCompositeOperation = 'overlay';
  let wash = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h * 0.55);
  wash = ctx.createLinearGradient(0, h * 0.45, 0, h);
  wash.addColorStop(0, 'rgba(0,0,0,0)');
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);
  ctx.globalCompositeOperation = 'source-over';
  const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, grade.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  // Inset snapshot: a tilted white-bordered tile in a corner.
  if (state.inset && state.inset.on && state.inset.photo) {
    const tileW = w * 0.30;
    const tileH = tileW * 1.25;
    const m = w * 0.045;
    const corners = {
      tl: [m, m], tr: [w - m - tileW, m],
      bl: [m, h - m - tileH], br: [w - m - tileW, h - m - tileH],
    };
    const [tx, ty] = corners[state.inset.corner] || corners.br;
    const tilt = ((state.inset.tilt || 0) * Math.PI) / 180;
    ctx.save();
    ctx.translate(tx + tileW / 2, ty + tileH / 2);
    ctx.rotate(tilt);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 28 * u;
    ctx.shadowOffsetY = 10 * u;
    ctx.fillStyle = '#f8f4ec';
    ctx.fillRect(-tileW / 2, -tileH / 2, tileW, tileH);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const iw = state.inset.photo.naturalWidth;
    const ih = state.inset.photo.naturalHeight;
    const inner = 10 * u;
    const fw = tileW - inner * 2;
    const fh = tileH - inner * 2 - 34 * u;
    const s = Math.max(fw / iw, fh / ih) * (state.inset.zoom || 1);
    const dw = iw * s;
    const dh = ih * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-fw / 2, -tileH / 2 + inner, fw, fh);
    ctx.clip();
    ctx.drawImage(state.inset.photo, -dw / 2, -tileH / 2 + inner + (fh - dh) / 2, dw, dh);
    ctx.restore();
    ctx.fillStyle = '#2b2b2b';
    ctx.font = `${Math.round(20 * u)}px "Lobster", cursive`;
    ctx.textAlign = 'center';
    ctx.fillText('leonida', 0, tileH / 2 - 12 * u);
    ctx.restore();
  }

  // Starburst sticker, opposite the title block.
  const sticker = (state.sticker || '').trim();
  if (sticker) {
    const r = w * 0.085;
    const cx = w - r - w * 0.05;
    const cy = state.titlePos === 'top' ? h - r - h * 0.05 : r + h * 0.045;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.21);
    ctx.fillStyle = grade.accent;
    drawStarburst(ctx, 0, 0, r, r * 0.78, 12, 0);
    ctx.fillStyle = '#14081f';
    ctx.font = `bold ${Math.round(r * 0.30)}px "Archivo Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sLines = wrapLines(ctx, sticker.toUpperCase(), r * 1.5);
    const lh = r * 0.34;
    const y0 = -((sLines.length - 1) * lh) / 2;
    sLines.forEach((ln, i) => ctx.fillText(ln, 0, y0 + i * lh));
    ctx.restore();
  }

  // Title block: eyebrow, title, neon accent word, script tagline.
  const maxW = w * 0.88;
  const titleText = (state.title || '').trim().toUpperCase();
  const accentText = (state.accent || '').trim();
  const taglineText = (state.tagline || '').trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const eyebrowSize = Math.round(26 * u);
  const tagSize = Math.round(54 * u);
  const accentSize = Math.round(64 * u);
  const titleFit = titleText
    ? fitTitle(ctx, titleText, maxW, Math.round(150 * u), '"Archivo Black", sans-serif', 'bold')
    : { size: 0, lines: [] };
  const titleH = titleFit.lines.length * titleFit.size * 0.98;
  const blockH = eyebrowSize * 1.6 + titleH + (accentText ? accentSize * 1.25 : 0)
    + (taglineText ? tagSize * 1.3 : 0);
  let top;
  if (state.titlePos === 'top') top = h * 0.05;
  else if (state.titlePos === 'center') top = h * 0.5 - blockH / 2;
  else top = h - h * 0.045 - blockH;

  let y = top;
  // Eyebrow: LEONIDA • VICE CITY, letterspaced, in the grade's accent.
  ctx.font = `bold ${eyebrowSize}px "Archivo Black", sans-serif`;
  ctx.fillStyle = grade.accent;
  drawSpaced(ctx, 'LEONIDA  •  VICE CITY', w / 2, y + eyebrowSize, Math.round(6 * u));
  y += eyebrowSize * 1.6;
  // Title.
  if (titleFit.lines.length) {
    ctx.font = `bold ${titleFit.size}px "Archivo Black", sans-serif`;
    const lh = titleFit.size * 0.98;
    titleFit.lines.forEach((ln) => {
      const cy = y + titleFit.size * 0.82;
      if (state.titleStyle === 'outline') {
        ctx.lineWidth = Math.max(2, titleFit.size * 0.05);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(ln, w / 2, cy);
        if (state.glow) {
          ctx.shadowColor = grade.accent;
          ctx.shadowBlur = titleFit.size * 0.3;
          ctx.strokeText(ln, w / 2, cy);
          ctx.shadowBlur = 0;
        }
      } else if (state.titleStyle === 'neon') {
        ctx.shadowColor = grade.accent;
        ctx.shadowBlur = titleFit.size * 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ln, w / 2, cy);
        ctx.shadowBlur = titleFit.size * 0.18;
        ctx.fillText(ln, w / 2, cy);
        ctx.shadowBlur = 0;
      } else {
        ctx.lineWidth = Math.max(2, titleFit.size * 0.06);
        ctx.strokeStyle = 'rgba(10,5,20,0.85)';
        ctx.strokeText(ln, w / 2, cy);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ln, w / 2, cy);
      }
      y += lh;
    });
  }
  // Neon accent word in Monoton.
  if (accentText) {
    ctx.font = `${accentSize}px "Monoton", cursive`;
    const cy = y + accentSize * 0.9;
    if (state.glow) {
      ctx.shadowColor = grade.accent;
      ctx.shadowBlur = accentSize * 0.5;
    }
    ctx.fillStyle = grade.accent;
    ctx.fillText(accentText.toUpperCase(), w / 2, cy);
    ctx.shadowBlur = 0;
    y += accentSize * 1.25;
  }
  // Script tagline in Lobster.
  if (taglineText) {
    ctx.font = `${tagSize}px "Lobster", cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = tagSize * 0.15;
    ctx.fillText(taglineText, w / 2, y + tagSize * 0.9);
    ctx.shadowBlur = 0;
  }

  // Vignette.
  if (state.vignette) {
    const vg = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // Seeded film grain.
  if (state.grain) {
    const tile = getNoiseTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  ctx.restore();
}
