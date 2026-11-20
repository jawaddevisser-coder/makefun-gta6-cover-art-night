// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo and the controls; ?shot=cover shows the poster alone, full frame, at
// the export size the query names. Every scene is deterministic: the same
// query always paints the same poster. window.__shotReady is set once the
// poster has painted (fonts included), so a headless browser knows when to
// take the screenshot.

/**
 * Runs one shot scene. `api` is { loadSample, applyState, getState } from
 * main.js. Query params: photo, title, accent, tagline, sticker, grade,
 * titlePos, titleStyle, size, inset (on/off), insetPhoto, insetCorner,
 * insetTilt, grain, vignette, glow.
 */
export async function runShot(shot, query, api) {
  const { loadSample, applyState } = api;
  const bool = (v, dflt) => (v === null ? dflt : v !== 'off' && v !== 'false' && v !== '0');
  const patch = {};
  if (query.get('photo')) patch.photoKey = query.get('photo');
  if (query.get('title') !== null) patch.title = query.get('title');
  if (query.get('accent') !== null) patch.accent = query.get('accent');
  if (query.get('tagline') !== null) patch.tagline = query.get('tagline');
  if (query.get('sticker') !== null) patch.sticker = query.get('sticker');
  if (query.get('grade')) patch.grade = query.get('grade');
  if (query.get('titlePos')) patch.titlePos = query.get('titlePos');
  if (query.get('titleStyle')) patch.titleStyle = query.get('titleStyle');
  if (query.get('size')) patch.size = query.get('size');
  patch.grain = bool(query.get('grain'), true);
  patch.vignette = bool(query.get('vignette'), true);
  patch.glow = bool(query.get('glow'), true);
  patch.photo = await loadSample(patch.photoKey || 'sunset-drive');

  const inset = { on: bool(query.get('inset'), false) };
  if (inset.on) {
    inset.photoKey = query.get('insetPhoto') || 'neon-street';
    inset.photo = await loadSample(inset.photoKey);
    if (query.get('insetCorner')) inset.corner = query.get('insetCorner');
    if (query.get('insetTilt') !== null) inset.tilt = Number(query.get('insetTilt'));
    if (query.get('insetZoom') !== null) inset.zoom = Number(query.get('insetZoom'));
  }
  patch.inset = inset;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  applyState(patch);

  // Paint, wait for the web fonts, paint again, then signal readiness.
  await document.fonts.ready;
  applyState({});
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
