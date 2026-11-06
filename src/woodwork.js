// Carved Newar timber work: sub-voxel detail layered onto voxel facades.
// The voxel opening carries the read at distance; these boxes add the carving that rewards zooming in.
import { P } from './palette.js';
import { opening, put } from './architecture.js';

const WD = 0x2e1c12, WM = 0x5c3a23, WL = 0x8c5e3a, BRASS = 0xc39445;
const STONE = { d: 0x7d7567, m: 0x978e7e, l: 0xbdb39f };
const TIMBER = { d: WD, m: WM, l: WL };

// Returns f(u, y, n, su, sy, sn, colour) placing a box on face s:
// u = world coordinate along the face, y = height, n = distance proud of the wall surface (negative = into a recess).
export function face(w, s) {
  const [ox, oz] = s.out, [fx, fz] = s.at(s.a);
  const sign = ox + oz;
  const plane = (ox ? fx : fz) + (sign > 0 ? 1 : 0);
  return (u, y, n, su, sy, sn, c) => {
    const n0 = sign > 0 ? plane + n : plane - n - sn;
    if (ox) w.detail(n0, y, u, sn, sy, su, c);
    else w.detail(u, y, n0, su, sy, sn, c);
  };
}

// Moulded jambs, lintel and sill with projecting horns (tiki), and a carved frieze over the lintel.
function frame(f, t0, y0, wd, ht, { horns = true, sill = true, C = TIMBER } = {}) {
  const t1 = t0 + wd, y1 = y0 + ht, e = horns ? 1.4 : 0.6;
  f(t0 - 0.5, y0 - 0.1, 0, 0.4, ht + 0.2, 0.15, C.d);
  f(t1 + 0.1, y0 - 0.1, 0, 0.4, ht + 0.2, 0.15, C.d);
  f(t0 - 0.12, y0, 0, 0.1, ht, 0.26, C.l);
  f(t1 + 0.02, y0, 0, 0.1, ht, 0.26, C.l);
  f(t0 - e, y1 + 0.05, 0, wd + 2 * e, 0.4, 0.3, C.m);
  for (let x = t0 - e + 0.45; x < t1 + e - 0.5; x += 0.42) f(x, y1 + 0.45, 0, 0.22, 0.22, 0.2, C.l);
  if (horns) for (const x of [t0 - e, t1 + e - 0.3]) f(x, y1 + 0.45, 0, 0.3, 0.32, 0.32, C.d);
  if (!sill) return;
  f(t0 - e + 0.15, y0 - 0.45, 0, wd + 2 * e - 0.3, 0.4, 0.3, C.m);
  if (horns) for (const x of [t0 - e + 0.15, t1 + e - 0.45]) f(x, y0 - 0.78, 0, 0.3, 0.33, 0.3, C.d);
}

// Square-grid lattice (jhyal) set back in a recess.
function lattice(f, t0, y0, wd, ht, n = -0.7, c = WM) {
  for (let x = t0 + 0.27; x < t0 + wd - 0.1; x += 0.36) f(x - 0.04, y0, n, 0.08, ht, 0.12, c);
  for (let y = y0 + 0.27; y < y0 + ht - 0.1; y += 0.36) f(t0, y - 0.04, n, wd, 0.08, 0.12, c);
}

// Tikijhyal: latticed window with horned lintel and sill.
export function carvedWindow(w, s, t0, y0, wd, ht, o = {}) {
  opening(w, s, t0, y0, wd, ht);
  const f = face(w, s);
  lattice(f, t0, y0, wd, ht);
  frame(f, t0, y0, wd, ht, { horns: o.horns ?? true });
}

// Carved door: studded leaves, triple-moulded frame and a stepped torana (tympanum) above.
export function carvedDoor(w, s, t0, y0, wd, ht, { gold = false, stone = false } = {}) {
  const C = stone ? STONE : TIMBER;
  opening(w, s, t0, y0, wd, ht, { sill: false, fill: stone ? P.lattice : P.woodMid, frame: stone ? P.stoneDark : P.woodMid });
  const f = face(w, s), t1 = t0 + wd, y1 = y0 + ht, mid = t0 + wd / 2;
  if (!stone) {
    f(t0 + 0.06, y0, -1, wd / 2 - 0.09, ht - 0.05, 0.12, WM);
    f(mid + 0.03, y0, -1, wd / 2 - 0.09, ht - 0.05, 0.12, WM);
    for (let y = y0 + 0.6; y < y1 - 0.3; y += 0.75) for (const x of [mid - 0.42, mid + 0.28]) f(x, y, -0.88, 0.14, 0.14, 0.08, BRASS);
  }
  f(t0 - 0.85, y0, 0, 0.3, ht + 0.4, 0.14, C.d);
  f(t1 + 0.55, y0, 0, 0.3, ht + 0.4, 0.14, C.d);
  frame(f, t0, y0, wd, ht, { sill: false, C });
  const G = gold ? [P.gold[1], P.gold[0]] : [C.d, C.m];
  for (let i = 0; i < 4; i++) {
    const ww = wd + 1.1 - i * 0.6;
    f(mid - ww / 2, y1 + 0.67 + i * 0.32, 0, ww, 0.32, 0.18 + (i % 2) * 0.06, G[i % 2]);
  }
  f(mid - 0.26, y1 + 0.8, 0.22, 0.52, 0.7, 0.14, gold ? P.gold[2] : C.l);
  f(t0 - 0.4, y0, 0, wd + 0.8, 0.16, 0.4, C.d);
}

// Sanjhya: projecting bay of alternating posts and latticed lights, under a carved hood.
export function bay(w, s, t0, y0, wd, ht) {
  for (let t = t0; t < t0 + wd; t++)
    for (let y = y0; y < y0 + ht; y++) put(w, s, t, 1, y, (t - t0) % 2 === 0 ? P.wood : P.lattice);
  for (let t = t0 - 1; t <= t0 + wd; t++) {
    put(w, s, t, 1, y0 + ht, P.wood);
    put(w, s, t, 1, y0 - 1, P.woodMid);
  }
  const f = face(w, s), t1 = t0 + wd, y1 = y0 + ht;
  for (let t = t0 + 1; t < t1; t += 2) lattice(f, t, y0, 1, ht, 1, WL);
  for (let t = t0; t < t1; t += 2) f(t + 0.3, y0 + ht - 0.5, 1, 0.4, 0.4, 0.12, WL); // carved post capitals
  f(t0 - 1.5, y1 + 1, 0, wd + 3, 0.3, 2.2, WD);
  for (let x = t0 - 1.3; x < t1 + 1.2; x += 0.45) f(x, y1 + 0.75, 1.95, 0.22, 0.25, 0.22, WL);
  f(t0 - 1, y0 - 1.35, 0, wd + 2, 0.35, 1.4, WM);
  for (let x = t0 - 0.8; x < t1 + 0.8; x += 0.5) f(x, y0 - 1.65, 1.1, 0.25, 0.3, 0.25, WL);
}

// Peacock window (mayur jhyal): a fan of carved feathers around a peacock, in a deep moulded frame.
export function peacockWindow(w, s, t0, y0) {
  const wd = 4, ht = 4;
  opening(w, s, t0, y0, wd, ht);
  const f = face(w, s), cu = t0 + wd / 2, cy = y0 + 0.55;
  for (const r of [0.75, 1.25, 1.75]) {
    const n = Math.round(r * 6);
    for (let i = 0; i <= n; i++) {
      const a = (Math.PI * i) / n;
      f(cu + r * Math.cos(a) - 0.13, cy + r * Math.sin(a) * 1.6 - 0.13, -0.45, 0.26, 0.26, 0.22, r > 1.5 ? 0xc89058 : r > 1 ? 0xa8713f : WL);
    }
  }
  f(cu - 0.22, cy, -0.5, 0.44, 0.95, 0.4, 0xa8713f);
  f(cu - 0.13, cy + 0.95, -0.5, 0.26, 0.4, 0.35, 0xa8713f);
  f(cu - 0.04, cy + 1.35, -0.6, 0.08, 0.25, 0.2, BRASS);
  frame(f, t0, y0, wd, ht);
  f(t0 - 0.85, y0 - 0.2, 0, 0.3, ht + 0.4, 0.2, WM);
  f(t0 + wd + 0.55, y0 - 0.2, 0, 0.3, ht + 0.4, 0.2, WM);
}

// Carved eave struts (tunal) with a figure panel, leaning out from the wall to the eave.
export function eaveStruts(w, s, yEave, step = 2) {
  const f = face(w, s);
  for (let t = s.a + 0.5; t <= s.b + 0.5; t += step) {
    const x = t - 0.18;
    f(x, yEave - 3, 0, 0.36, 1.0, 0.3, WM);
    f(x, yEave - 2.1, 0.3, 0.36, 0.95, 0.35, WM);
    f(x, yEave - 1.2, 0.65, 0.36, 1.2, 0.45, WM);
    f(x - 0.06, yEave - 2.35, 0.6, 0.48, 0.55, 0.16, WL);
  }
}

// Row of small carved blocks along a cornice.
export function dentils(w, s, y) {
  const f = face(w, s);
  for (let x = s.a + 0.15; x < s.b + 0.85; x += 0.5) f(x, y, 0, 0.25, 0.3, 0.18, WL);
}
export function carvedFrame(w, s, t0, y0, wd, ht, o) {
  frame(face(w, s), t0, y0, wd, ht, o);
}
