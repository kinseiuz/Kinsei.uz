/**
 * KINSEI Studio — Header logo mark
 *
 * One SVG path is interpolated between the KINSEI mark and its four-point star
 * form, so the outline is always the same shape travelling between two poses.
 * Vertices 0–5 (the right, bottom and left points) are shared by both poses;
 * only the top-left spike (6–9) moves.
 *
 * Geometry lives in an 800-unit box centred on (400, 400). Every tip sits
 * 396 units from that centre, so a full turn never leaves the viewBox.
 */

const CENTER = 400;
const VERTS = 10;

/* Clockwise from the top-right tip. */
const MARK = [
  [680, 120],       // 0 top-right tip
  [513, 400],       // 1 right notch
  [680, 680],       // 2 bottom-right tip
  [400, 513],       // 3 bottom notch
  [120, 680],       // 4 bottom-left tip
  [287, 400],       // 5 left notch
  [120, 287],       // 6 flag: outer corner      → star tip
  [373, 287],       // 7 flag: inner corner      → on the star's spike edge
  [373, 369],       // 8 flag: notch floor       → on the star's spike edge
  [452, 257],       // 9 shoulder of the top-right point
];

/* Vertices 7 and 8 sit on the straight edge between the star's tip (6) and its
   top notch (9), so the star renders exactly as a clean four-point star. */
const STAR = [
  [680, 120],
  [513, 400],
  [680, 680],
  [400, 513],
  [120, 680],
  [287, 400],
  [120, 120],
  [366.4, 266.96],
  [383.2, 276.98],
  [400, 287],
];

const HOLD_MS = 2000;
const MORPH_MS = 900;
const SPIN_DEG = 360;
const CYCLE_MS = HOLD_MS + MORPH_MS + MORPH_MS;

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let pathEl = null;
let reduceQuery = null;
let raf = 0;
let elapsed = 0;
let lastFrame = 0;

export function initLogoMark() {
  pathEl = document.getElementById('brandLogoPath');
  if (!pathEl) return;

  reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onPreferenceChange = () => (reduceQuery.matches ? stop() : start());

  if (typeof reduceQuery.addEventListener === 'function') {
    reduceQuery.addEventListener('change', onPreferenceChange);
  } else if (typeof reduceQuery.addListener === 'function') {
    reduceQuery.addListener(onPreferenceChange);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
    } else if (!reduceQuery.matches) {
      start();
    }
  });

  onPreferenceChange();
}

function start() {
  if (raf) return;
  lastFrame = 0;
  raf = requestAnimationFrame(frame);
}

/* Keeps the timeline position so the loop resumes instead of restarting. */
function pause() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
  lastFrame = 0;
}

function stop() {
  pause();
  elapsed = 0;
  render(0);
}

function frame(now) {
  if (!lastFrame) lastFrame = now;
  elapsed = (elapsed + Math.min(now - lastFrame, 120)) % CYCLE_MS;
  lastFrame = now;
  render(elapsed);
  raf = requestAnimationFrame(frame);
}

function render(time) {
  const morphStart = HOLD_MS;
  const returnStart = morphStart + MORPH_MS;

  let shape;
  let angle;

  if (time < morphStart) {
    shape = 0;
    angle = 0;
  } else if (time < returnStart) {
    const p = (time - morphStart) / MORPH_MS;
    shape = easeOutCubic(p);
    angle = SPIN_DEG * easeOutExpo(p);
  } else {
    const p = (time - returnStart) / MORPH_MS;
    shape = 1 - easeInOutCubic(p);
    angle = SPIN_DEG;
  }

  pathEl.setAttribute('d', outlineAt(shape));
  pathEl.setAttribute('transform', `rotate(${angle.toFixed(3)} ${CENTER} ${CENTER})`);
}

function outlineAt(t) {
  let d = '';
  for (let i = 0; i < VERTS; i += 1) {
    const x = MARK[i][0] + (STAR[i][0] - MARK[i][0]) * t;
    const y = MARK[i][1] + (STAR[i][1] - MARK[i][1]) * t;
    d += `${i === 0 ? 'M' : 'L'}${round(x)},${round(y)}`;
  }
  return `${d}Z`;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
