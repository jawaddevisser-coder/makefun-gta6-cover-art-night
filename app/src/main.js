// Wires the Vice After Dark editor: photo uploads, drag-to-pan and zoom,
// title and tagline editing, grade and effect controls, the inset snapshot,
// and one-click PNG exports in the three post sizes. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js). Fonts load first so
// the canvas lettering is never drawn in a fallback face.

import { drawPoster, GRADES, GRADE_KEYS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('poster');
const status = $('status');

const SAMPLES = {
  'sunset-drive': 'samples/sunset-drive.jpg',
  'neon-street': 'samples/neon-street.jpg',
};

const state = {
  photo: null,
  photoKey: 'sunset-drive',
  photoZoom: 1,
  photoX: 0,
  photoY: 0,
  title: 'NIGHT DRIVE',
  accent: 'VICE',
  tagline: 'welcome to leonida',
  titlePos: 'bottom',
  titleStyle: 'neon',
  grade: 'after-dark',
  sticker: 'VICE CITY',
  grain: true,
  vignette: true,
  glow: true,
  size: 'square',
  inset: { on: false, photo: null, photoKey: 'neon-street', corner: 'br', tilt: -6, zoom: 1 },
};

const loadedPhotos = {};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads (and caches) a bundled sample photo by key. */
async function loadSample(key) {
  if (!loadedPhotos[key]) loadedPhotos[key] = await loadImage(SAMPLES[key]);
  return loadedPhotos[key];
}

/** Sizes the preview canvas to the chosen export size and redraws. */
function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawPoster(canvas, state);
}

/** Applies a patch of state (from a control or a shot scene) and redraws. */
export function applyState(patch) {
  Object.assign(state, patch);
  if (patch.inset) Object.assign(state.inset, patch.inset);
  redraw();
  syncControls();
}

/** Mirrors the current state back into every control, so a state change made
 *  by code (a screenshot scene, a sample button) is what the panel shows. */
function syncControls() {
  $('title').value = state.title;
  $('accent').value = state.accent;
  $('tagline').value = state.tagline;
  $('sticker').value = state.sticker;
  $('zoom').value = String(state.photoZoom);
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('glow').checked = state.glow;
  $('insetOn').checked = state.inset.on;
  $('insetControls').classList.toggle('off', !state.inset.on);
  $('insetCorner').value = state.inset.corner;
  $('insetTilt').value = String(state.inset.tilt);
  $('insetZoom').value = String(state.inset.zoom);
  const mark = (id, value) => {
    $(id).querySelectorAll('button').forEach((el) => {
      el.classList.toggle('active', el.dataset.value === value);
    });
  };
  mark('titlePos', state.titlePos);
  mark('titleStyle', state.titleStyle);
  mark('sizeSeg', state.size);
  $('grades').querySelectorAll('.grade').forEach((el) => {
    el.classList.toggle('active', el.dataset.grade === state.grade);
  });
}

export function getState() {
  return state;
}

/** Renders the poster off-screen at an exact export size and downloads it. */
async function exportCover(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawPoster(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-after-dark-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  status.textContent = `Saved vice-after-dark-${size.w}x${size.h}.png`;
}

/** Builds the grade swatch buttons from GRADES. */
function buildGrades() {
  const box = $('grades');
  GRADE_KEYS.forEach((key) => {
    const g = GRADES[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grade' + (key === state.grade ? ' active' : '');
    b.dataset.grade = key;
    b.style.background = `linear-gradient(135deg, ${g.top.replace(/[\d.]+\)$/, '1)')}, ${g.bottom.replace(/[\d.]+\)$/, '1)')})`;
    b.title = g.name;
    b.textContent = g.name;
    b.addEventListener('click', () => {
      state.grade = key;
      box.querySelectorAll('.grade').forEach((el) => el.classList.toggle('active', el.dataset.grade === key));
      redraw();
    });
    box.appendChild(b);
  });
}

/** Builds a segmented control (buttons that set one state key). */
function buildSegment(id, key, values) {
  const box = $(id);
  values.forEach(([value, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = value;
    b.textContent = label;
    b.classList.toggle('active', state[key] === value);
    b.addEventListener('click', () => {
      state[key] = value;
      box.querySelectorAll('button').forEach((el) => el.classList.toggle('active', el.dataset.value === value));
      redraw();
    });
    box.appendChild(b);
  });
}

/** Builds the three export buttons, one per post size. */
function buildExports() {
  const box = $('exports');
  Object.entries(SIZES).forEach(([key, size]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'export';
    b.textContent = `Export ${size.label} PNG`;
    b.addEventListener('click', () => exportCover(key));
    box.appendChild(b);
  });
}

function bindControls() {
  $('photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photo = await loadImage(URL.createObjectURL(file));
    state.photoKey = 'upload';
    state.photoZoom = 1;
    state.photoX = 0;
    state.photoY = 0;
    $('zoom').value = '1';
    redraw();
  });
  $('sampleSunset').addEventListener('click', async () => {
    state.photo = await loadSample('sunset-drive');
    state.photoKey = 'sunset-drive';
    redraw();
  });
  $('sampleNeon').addEventListener('click', async () => {
    state.photo = await loadSample('neon-street');
    state.photoKey = 'neon-street';
    redraw();
  });
  $('zoom').addEventListener('input', (e) => {
    state.photoZoom = Number(e.target.value);
    redraw();
  });
  $('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    redraw();
  });
  $('accent').addEventListener('input', (e) => {
    state.accent = e.target.value;
    redraw();
  });
  $('tagline').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    redraw();
  });
  $('sticker').addEventListener('input', (e) => {
    state.sticker = e.target.value;
    redraw();
  });

  // Inset snapshot controls.
  $('insetOn').addEventListener('change', async (e) => {
    state.inset.on = e.target.checked;
    $('insetControls').classList.toggle('off', !state.inset.on);
    if (state.inset.on && !state.inset.photo) {
      state.inset.photo = await loadSample(state.inset.photoKey);
    }
    redraw();
  });
  $('insetPhoto').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.inset.photo = await loadImage(URL.createObjectURL(file));
    redraw();
  });
  $('insetSample').addEventListener('click', async () => {
    state.inset.photo = await loadSample('neon-street');
    state.inset.photoKey = 'neon-street';
    redraw();
  });
  $('insetCorner').addEventListener('change', (e) => {
    state.inset.corner = e.target.value;
    redraw();
  });
  $('insetTilt').addEventListener('input', (e) => {
    state.inset.tilt = Number(e.target.value);
    redraw();
  });
  $('insetZoom').addEventListener('input', (e) => {
    state.inset.zoom = Number(e.target.value);
    redraw();
  });

  // Effect toggles.
  $('grain').addEventListener('change', (e) => {
    state.grain = e.target.checked;
    redraw();
  });
  $('vignette').addEventListener('change', (e) => {
    state.vignette = e.target.checked;
    redraw();
  });
  $('glow').addEventListener('change', (e) => {
    state.glow = e.target.checked;
    redraw();
  });

  // Drag the hero photo inside the preview to pan it.
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, y: e.clientY, px: state.photoX, py: state.photoY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    state.photoX = Math.max(-0.6, Math.min(0.6, dragging.px + (e.clientX - dragging.x) / rect.width));
    state.photoY = Math.max(-0.6, Math.min(0.6, dragging.py + (e.clientY - dragging.y) / rect.height));
    redraw();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('pointercancel', () => { dragging = null; });
}

buildGrades();
buildSegment('titlePos', 'titlePos', [['top', 'Top'], ['center', 'Centre'], ['bottom', 'Bottom']]);
buildSegment('titleStyle', 'titleStyle', [['solid', 'Solid'], ['outline', 'Outline'], ['neon', 'Neon']]);
buildSegment('sizeSeg', 'size', [['square', 'Square'], ['portrait', 'Portrait'], ['landscape', 'Landscape']]);
buildExports();
bindControls();

/** Boot: load the fonts, then the default sample photo, then paint. */
async function boot() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('100px "Archivo Black"'),
        document.fonts.load('100px "Monoton"'),
        document.fonts.load('100px "Lobster"'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch {
    // A missing face falls back to sans-serif; the poster still draws.
  }
  state.photo = await loadSample(state.photoKey);
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, { loadSample, applyState, getState });
  }
  redraw();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => redraw());
  }
}

boot();
