// Khwopa campus components: Newar-revival brick teaching blocks (timber-framed windows with lattice
// aprons, tiled pent-roof skirts on carved struts, weathered tiled roofs with grass on them), and the
// landscaping and everyday props of the campus. Scale: one storey = 5 voxels (1 voxel ≈ 0.65 m).
import { P, pick } from './palette.js';
import { hash } from './voxels.js';
import { rectSides, put, inset } from './architecture.js';
import { eaveStruts, dentils, face } from './woodwork.js';

export const FH = 5;

// Campus palette: the salmon-red machine brick of the blocks is lighter and pinker than old Bhaktapur's.
export const K = {
  brick: [0xd27a58, 0xd67e5c, 0xcd7555, 0xd98262, 0xcf7857],
  band: [0xa95a3f, 0xb06043, 0xa2553b],
  plinth: [0x8a5240, 0x804a39],
  roof: [0x82604e, 0x7a5a49, 0x8a6853, 0x7e5d4a, 0x765644],
  roofAlt: [0x6f5141, 0x684c3d, 0x745645],
  moss: [0x7f7350, 0x786d4b, 0x857854],
  ridge: [0x6a3e2c, 0x633a29],
  rim: [0x4e3022, 0x553526],
  frame: [0x5e3c27, 0x65412a, 0x583824],
  lattice: [0x5a3b28, 0x543625],
  glass: [0x2f363c, 0x363e45, 0x2a3136],
  void: [0x241c18, 0x2a201b],
  pave: [0xb5674c, 0xad6046, 0xbc7055, 0xa75b42, 0xb86a4f], // red brick herringbone
  slab: [0xb9ad98, 0xaea38f, 0xc2b7a3, 0xa79c88, 0x9b9282], // F&G sandstone flags
  road: [0x86837c, 0x8d8a83, 0x7f7c75],
  hex: [0x9d9b93, 0xa6a49c, 0x93918a],
  lawn: [0x6d9a3d, 0x77a343, 0x679338, 0x72a040],
  turf: [0x8a9a4a, 0x96a352, 0x9b9a58, 0x85944a, 0xa39f62], // worn football ground
  hedge: [0xa3ae3e, 0xafb847, 0x96a338, 0xb7bd52], // golden duranta
  hedgeG: [0x557d2e, 0x5f8834, 0x4d7229],
  conifer: [0x34502a, 0x3c5a2f, 0x2f4825, 0x456333],
  metal: [0x5c6267, 0x545a5f, 0x63696e],
  tileRed: [0xc0563e, 0xb84f38, 0xc85f45],
  water: [0x4f86a8, 0x4a7fa0, 0x5890b0],
};

// Weathered tiles: grass and moss take hold on the campus roofs.
const mossy = (base) => (x, y, z) => (hash(x, y, z, 4) < 0.07 ? pick(K.moss, hash(x, z, y, 1)) : pick(base, hash(x, y, z, 2)));
export const TILES = [mossy(K.roof), mossy(K.roofAlt)];
// Block B and the cafeteria carry newer, brighter terracotta tiles.
export const TILES_NEW = [[0xc47650, 0xbd6f4a, 0xca7d57, 0xc0724c], [0xb0663f, 0xa9603b, 0xb46a44]];

// Centred run of n openings of width wd separated by gap, keeping `margin` clear of the corners.
function slots(s, wd, gap, margin = 3) {
  const len = s.b - s.a + 1;
  const n = Math.floor((len - 2 * margin + gap) / (wd + gap));
  if (n < 1) return [];
  const total = n * wd + (n - 1) * gap;
  const a = s.a + Math.floor((len - total) / 2);
  return Array.from({ length: n }, (_, i) => a + i * (wd + gap));
}

// The college window: timber lintel and sill with projecting horns, a latticed apron below
// and glazing above, mullioned into panes. Recessed one voxel.
export function win(w, s, t0, y0, wd, ht = 3) {
  for (let t = t0; t < t0 + wd; t++)
    for (let y = y0; y < y0 + ht; y++) {
      put(w, s, t, 0, y, null);
      put(w, s, t, -1, y, y === y0 ? K.lattice : K.glass);
    }
  for (let t = t0 - 1; t <= t0 + wd; t++) {
    put(w, s, t, 0, y0 + ht, K.frame);
    put(w, s, t, 0, y0 - 1, K.frame);
  }
  const f = face(w, s), fr = K.frame[0];
  f(t0, y0, -1, 0.2, ht, 1, fr);
  f(t0 + wd - 0.2, y0, -1, 0.2, ht, 1, fr);
  f(t0, y0 + 0.92, -1, wd, 0.16, 0.15, fr);
  for (let t = t0 + 1; t < t0 + wd; t++) f(t - 0.07, y0 + 1, -1, 0.14, ht - 1, 0.15, fr);
  for (let x = t0 + 0.25; x < t0 + wd - 0.1; x += 0.5) f(x, y0 + 0.2, -1, 0.12, 0.6, 0.1, 0x7c5539);
}

// Deep open loggia: the dark recessed balconies of Block C.
function loggia(w, s, t0, y0, wd, ht) {
  for (let t = t0; t < t0 + wd; t++)
    for (let y = y0; y < y0 + ht; y++) {
      put(w, s, t, 0, y, null);
      put(w, s, t, -1, y, null);
      put(w, s, t, -2, y, K.void);
    }
  for (let t = t0; t < t0 + wd; t++) put(w, s, t, 0, y0, K.brick);
  for (let t = t0 - 1; t <= t0 + wd; t++) put(w, s, t, 0, y0 + ht, K.frame);
  face(w, s)(t0, y0 + 1, -0.1, wd, 0.15, 0.1, K.frame[1]); // railing over the brick parapet
}

// Tiled pent roof (skirt) wrapping a block at height y, on carved struts.
export function skirt(w, x0, z0, x1, z1, y, { o = 3, sides = rectSides(x0, z0, x1, z1), struts = true } = {}) {
  const dy = o === 2 ? [1, 0] : o === 3 ? [1, 0, 0] : [1, 1, 0, 0];
  for (const s of sides)
    for (let k = 1; k <= o; k++)
      for (let t = s.a - k; t <= s.b + k; t++) put(w, s, t, k, y + dy[k - 1], k === o ? K.rim : TILES[k % 2]);
  if (struts) for (const s of sides) eaveStruts(w, s, y + 0.6, 4);
}

// Hip or gable roof over an inclusive rectangle, solid so that roofs can intersect cleanly.
// kind 'gable' keeps a brick gable triangle on the end walls; `flat` > 0 stops a hip into a flat deck.
export function roof(w, x0, y, z0, x1, z1, o = {}) {
  const { kind = 'hip', ov = 3, verge = 1, pitch = inset, flat = 0, tiles = TILES, wall = K.brick, rim = K.rim, ridgeMat = K.ridge, deck = [0x8a867e, 0x908b83] } = o;
  const ridge = o.ridge ?? (x1 - x0 >= z1 - z0 ? 'x' : 'z');
  const sx = kind === 'hip' || ridge === 'z', sz = kind === 'hip' || ridge === 'x';
  const R = (k) => {
    const i = pitch(k);
    return [sx ? x0 - ov + i : x0 - verge, sz ? z0 - ov + i : z0 - verge, sx ? x1 + ov - i : x1 + verge, sz ? z1 + ov - i : z1 + verge];
  };
  const empty = (r) => r[0] > r[2] || r[1] > r[3];
  let k = 0;
  for (; ; k++) {
    const r = R(k), n = R(k + 1);
    if (empty(r)) break;
    const stop = flat && Math.min(n[2] - n[0], n[3] - n[1]) < flat;
    const last = empty(n) || stop;
    for (let z = r[1]; z <= r[3]; z++)
      for (let x = r[0]; x <= r[2]; x++) {
        const skin = last || x < n[0] || x > n[2] || z < n[1] || z > n[3];
        const verging = kind === 'gable' && (ridge === 'x' ? x < x0 || x > x1 : z < z0 || z > z1);
        if (verging && !skin) continue;
        const end = kind === 'gable' && (ridge === 'x' ? (x === x0 || x === x1) && z >= z0 && z <= z1 : (z === z0 || z === z1) && x >= x0 && x <= x1);
        const edge = x === r[0] || x === r[2] || z === r[1] || z === r[3];
        let m = tiles[k % 2];
        if (!skin && end) m = wall;
        else if (last) m = stop ? deck : ridgeMat;
        else if (k === 0 && edge) m = rim;
        w.set(x, y + k, z, m);
      }
    if (last) return y + k + 1;
  }
  return y + k;
}

// Teaching block: brick box, string course at every floor, windows on every face.
// o: floors, win (window width), pier (gap), skirts (floor indices topped by a pent roof),
// loggia(s, i, n, f) → open balcony instead of a window, blank (out-dirs with no openings), extra (rows of attic wall),
// window (builder replacing the default college window)
export function block(w, x0, g, z0, x1, z1, o = {}) {
  const floors = o.floors ?? 5, wd = o.win ?? 4, gap = o.pier ?? 3;
  const top = g + 1 + floors * FH + (o.extra ?? 0);
  w.box(x0, g, z0, x1, top - 1, z1, K.brick);
  w.box(x0, g, z0, x1, g, z1, K.plinth);
  const blank = (s) => (o.blank ?? []).some(([a, b]) => s.out[0] === a && s.out[1] === b);
  const sides = rectSides(x0, z0, x1, z1).filter((s) => !blank(s));
  for (let f = 0; f < floors; f++) {
    const b = g + 1 + f * FH;
    for (const s of sides) {
      for (let t = s.a; t <= s.b; t++) put(w, s, t, 0, b + FH - 1, K.band);
      dentils(w, s, b + FH - 1.35);
      const ts = slots(s, wd, gap);
      ts.forEach((t, i) => (o.loggia?.(s, i, ts.length, f) ? loggia(w, s, t, b, wd, FH - 1) : (o.window ?? win)(w, s, t, b + 1, wd, 3)));
    }
    if (o.skirts?.includes(f)) skirt(w, x0, z0, x1, z1, b + FH - 1, { sides });
  }
  for (const s of sides) eaveStruts(w, s, top, 4);
  return top;
}

// Rectangle projecting from side s between t0..t1, from k0 to k1 voxels out from the wall.
export function outRect(s, t0, t1, k0, k1) {
  const [ax, az] = s.at(t0), [bx, bz] = s.at(t1);
  const [ox, oz] = s.out;
  const xs = [ax + ox * k0, bx + ox * k1], zs = [az + oz * k0, bz + oz * k1];
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}

// The college seal: a cream disc with the red-and-blue emblem, on face s centred at (tc, yc).
export function seal(w, s, tc, yc, n = 0) {
  const f = face(w, s);
  f(tc - 0.8, yc - 1.1, n, 1.6, 2.2, 0.12, 0xd8cdb8);
  f(tc - 1.1, yc - 0.8, n, 2.2, 1.6, 0.12, 0xd8cdb8);
  f(tc - 0.4, yc - 0.7, n + 0.1, 0.8, 1.4, 0.1, 0x9b3a2a);
  f(tc - 0.7, yc - 0.4, n + 0.1, 1.4, 0.8, 0.1, 0x9b3a2a);
  f(tc - 0.2, yc - 0.4, n + 0.18, 0.4, 0.8, 0.08, 0x2f3d58);
}
// Side s shifted k voxels outward (for placing detail on a projecting element's front).
const shifted = (s, k) => ({ ...s, at: (t) => { const [x, z] = s.at(t); return [x + s.out[0] * k, z + s.out[1] * k]; } });

// Entrance porch: brick piers carrying a tiled gable whose pediment faces out with the college seal
// in the tympanum, steps down to the ground and a glazed double door behind.
export function porch(w, s, tc, hw, depth, g, { h = 6, emblem = true, steps = 2 } = {}) {
  const [x0, z0, x1, z1] = outRect(s, tc - hw, tc + hw, 1, depth);
  w.box(x0, g, z0, x1, g, z1, P.stone);
  for (const t of [tc - hw, tc + hw - 1]) {
    const [a0, b0, a1, b1] = outRect(s, t, t + 1, depth - 1, depth);
    w.box(a0, g + 1, b0, a1, g + h - 1, b1, K.brick);
  }
  w.box(x0, g + h, z0, x1, g + h, z1, K.frame);
  const along = s.out[0] === 0;
  const top = roof(w, x0, g + h + 1, z0, x1, z1, { kind: 'gable', ridge: along ? 'z' : 'x', ov: 2, verge: 1 });
  if (emblem) seal(w, shifted(s, depth), tc + 0.5, g + h + 2.6);
  for (let t = tc - 2; t <= tc + 1; t++)
    for (let y = g + 1; y < g + 5; y++) {
      put(w, s, t, 0, y, null);
      put(w, s, t, -1, y, y === g + 4 ? K.frame : K.glass);
    }
  for (let i = 0; i < steps; i++) {
    const [a0, b0, a1, b1] = outRect(s, tc - hw + 1, tc + hw - 1, depth + 1 + i, depth + 1 + i);
    w.box(a0, g - 1, b0, a1, g - 1 + (steps - 1 - i), b1, P.stoneDark);
  }
  return top;
}

// ---- lettering ---------------------------------------------------------------------------------------
const FONT = {
  A: ['.1.', '1.1', '111', '1.1', '1.1'], C: ['.11', '1..', '1..', '1..', '.11'], E: ['111', '1..', '11.', '1..', '111'],
  F: ['111', '1..', '11.', '1..', '1..'], G: ['.11', '1..', '1.1', '1.1', '.11'], H: ['1.1', '1.1', '111', '1.1', '1.1'],
  I: ['111', '.1.', '.1.', '.1.', '111'], K: ['1.1', '1.1', '11.', '1.1', '1.1'], L: ['1..', '1..', '1..', '1..', '111'],
  N: ['1.1', '111', '111', '1.1', '1.1'], O: ['.1.', '1.1', '1.1', '1.1', '.1.'], P: ['11.', '1.1', '11.', '1..', '1..'],
  R: ['11.', '1.1', '11.', '1.1', '1.1'], W: ['1.1', '1.1', '1.1', '111', '1.1'], ' ': ['...', '...', '...', '...', '...'],
};
// Raised letters on face s, centred on u = uc, baseline y; px = size of one font pixel.
export function lettering(w, s, uc, y, text, px, colour = 0xe9e1cf, n = 0) {
  const f = face(w, s), adv = 4 * px;
  const flip = s.out[0] + s.out[1] < 0 !== (s.out[0] !== 0); // keep text reading left→right from outside
  let u = uc - (text.length * adv - px) / 2;
  for (const ch of text) {
    const g = FONT[ch];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++) {
        if (g[r][c] !== '1') continue;
        const cc = u + c * px;
        f(flip ? 2 * uc - cc - px : cc, y + (4 - r) * px, n, px * 0.92, px * 0.92, 0.08, colour);
      }
    u += adv;
  }
}

// ---- ground ------------------------------------------------------------------------------------------
// Herringbone brick paving, as on every campus path.
export const herring = (x, z) => {
  const u = (x + z) & 3, v = ((x - z) >> 1) & 1;
  return pick(K.pave, hash(x >> 1, u + v * 4, z >> 1, 3));
};
export const flags = (x, z) => pick(K.slab, hash(Math.floor(x / 3), Math.floor((z + (Math.floor(x / 3) & 1)) / 2), 7, 1));
export const hexPave = (x, z) => pick(K.hex, hash(x >> 1, z >> 1, 8));
export function ground(w, x0, z0, x1, z1, mat, G) {
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++) w.set(x, G - 1, z, typeof mat === 'function' ? mat(x, z) : mat);
}
export function disc(w, cx, cz, r0, r1, y, mat) {
  for (let z = Math.floor(cz - r1); z <= cz + r1; z++)
    for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      if (d >= r0 && d < r1) w.set(x, y, z, typeof mat === 'function' ? mat(x, z) : mat);
    }
}

// ---- vegetation --------------------------------------------------------------------------------------
// Clipped hedge along a line (inclusive rectangle), golden by default.
export function hedge(w, x0, z0, x1, z1, g, h = 1, mat = K.hedge) {
  w.box(x0, g, z0, x1, g + h - 1, z1, mat);
}
// Columnar cypress / thuja: a narrow dark-green spire.
export function cypress(w, x, g, z, h = 8, seed = 0) {
  w.set(x, g, z, P.trunk);
  for (let y = 1; y < h; y++) {
    const r = y < h - 2 && y > 1 ? 1 : 0;
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx && dz && hash(x + dx, y, z + dz, seed) < 0.75) continue;
        w.set(x + dx, g + y, z + dz, pick(K.conifer, hash(x + dx, g + y, z + dz, seed + 3)));
      }
  }
}
// Norfolk Island pine: tall straight trunk with flat star-shaped whorls of branches.
export function araucaria(w, x, g, z, h = 20, seed = 0) {
  w.box(x, g, z, x, g + h, z, P.trunk);
  const n = Math.floor((h - 4) / 3);
  for (let i = 0; i < n; i++) {
    const y = g + 4 + i * 3, r = Math.max(1, Math.round(5 * (1 - i / n) + 0.5));
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        const arm = dx === 0 || dz === 0 || Math.abs(dx) === Math.abs(dz);
        if (!arm || Math.hypot(dx, dz) > r + 0.3) continue;
        const droop = Math.hypot(dx, dz) > r * 0.6 ? -1 : 0;
        w.set(x + dx, y + droop, z + dz, pick(K.conifer, hash(dx, y, dz, seed)));
        if (!droop && hash(dx, dz, y, seed + 1) < 0.5) w.set(x + dx, y + 1, z + dz, pick(K.conifer, hash(dz, y, dx, seed)));
      }
  }
  w.box(x, g + h - 1, z, x, g + h + 1, z, K.conifer[3]);
}
// Rounded clipped shrub.
export function shrub(w, x, g, z, r = 1, mat = K.hedgeG, seed = 0) {
  for (let y = 0; y <= r; y++)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dz) + y > r + 1) continue;
        w.set(x + dx, g + y, z + dz, pick(mat, hash(x + dx, y, z + dz, seed)));
      }
}

// ---- props -------------------------------------------------------------------------------------------
// School bus (yellow) or staff minibus (white with a blue band), along x or z.
export function bus(w, x, g, z, len = 13, alongX = true, white = false) {
  const B = (a0, y0, b0, a1, y1, b1, m) => (alongX ? w.box(x + a0, g + y0, z + b0, x + a1, g + y1, z + b1, m) : w.box(x + b0, g + y0, z + a0, x + b1, g + y1, z + a1, m));
  const body = white ? [0xe8e6df, 0xdedcd4] : [0xe6a52a, 0xdc9b22, 0xeaae35];
  B(0, 1, 0, len - 1, 3, 3, body);
  B(1, 3, 0, len - 2, 3, 3, K.glass);
  B(0, 3, 0, 0, 3, 3, K.glass);
  B(0, 4, 0, len - 1, 4, 3, white ? [0xf2f0ea] : body);
  B(0, 1, 0, len - 1, 1, 3, white ? [0x2e4f8a] : [0x3a3532]);
  B(1, 0, 0, 2, 0, 3, 0x232323);
  B(len - 4, 0, 0, len - 3, 0, 3, 0x232323);
}
// Motorbikes parked side by side in a row along x (bikes point along z); alongZ swaps the axes.
export function bikes(w, x0, x1, y, z, seed, alongZ = false) {
  const d = (a, yy, b, sa, sy, sb, c) => (alongZ ? w.detail(b, yy, a, sb, sy, sa, c) : w.detail(a, yy, b, sa, sy, sb, c));
  for (let x = x0; x <= x1; x += 0.9) {
    if (hash(Math.round(x * 10), z, seed) < 0.18) continue;
    const c = pick([0xb8352b, 0x23262a, 0x2e5f87, 0x23262a, 0xd9d6cf, 0x23262a], hash(Math.round(x * 10), seed, z));
    d(x, y + 0.3, z, 0.36, 0.55, 1.7, 0x2a2a2c);
    d(x - 0.04, y + 0.8, z + 0.35, 0.44, 0.38, 0.9, c);
    d(x - 0.2, y + 1.2, z + 0.1, 0.76, 0.1, 0.12, 0x1c1c1c);
  }
}
// Car along x.
export function car(w, x, g, z, colour) {
  w.box(x, g, z, x + 4, g, z + 1, colour);
  w.box(x + 1, g + 1, z, x + 3, g + 1, z + 1, K.glass);
  w.detail(x + 0.4, g - 0.01, z - 0.05, 0.8, 0.5, 2.1, 0x1c1c1c);
  w.detail(x + 3.7, g - 0.01, z - 0.05, 0.8, 0.5, 2.1, 0x1c1c1c);
}
// Solar street lamp: slim post, tilted panel.
export function lamp(w, x, g, z) {
  w.detailC(x + 0.5, g, z + 0.5, 0.18, 6, 0.18, 0x5c6a62);
  w.detailC(x + 0.5, g + 6, z + 0.5, 1.6, 0.12, 1.0, 0x2c3e5a);
  w.detailC(x + 0.5, g + 5.2, z + 0.9, 0.3, 0.2, 0.7, 0xd9d6cc);
}
// A student in college uniform (white shirt, dark trousers), a little smaller than the townsfolk.
export function student(w, x, y, z, seed = 0) {
  const r = (i) => hash(seed, i, 13, 5), s = 0.8;
  const b = (dx, dy, dz, sx, sy, sz, c) => w.detailC(x + dx * s, y + dy * s, z + dz * s, sx * s, sy * s, sz * s, c);
  const legs = pick([0x23252b, 0x2b2d36, 0x1f2024], r(1));
  const shirt = pick([0xeeeae2, 0xe8eef3, 0xdfe7ef, 0x2a3550, 0xeeeae2], r(2));
  b(-0.2, 0, 0, 0.32, 1.5, 0.4, legs);
  b(0.2, 0, 0, 0.32, 1.5, 0.4, legs);
  b(0, 1.5, 0, 0.85, 1.25, 0.5, shirt);
  b(-0.54, 1.6, 0, 0.22, 1.1, 0.36, shirt);
  b(0.54, 1.6, 0, 0.22, 1.1, 0.36, shirt);
  b(0, 2.75, 0, 0.62, 0.62, 0.62, pick(P.skin, r(3)));
  b(0, 3.3, 0, 0.66, 0.16, 0.66, 0x17120f);
  if (r(4) < 0.4) b(0, 1.6, -0.35, 0.6, 0.8, 0.25, pick([0x2e5f87, 0x8a2a2a, 0x3a3a3a], r(5))); // backpack
}
export function students(w, x0, z0, x1, z1, n, g, seed) {
  for (let i = 0, placed = 0; i < n * 6 && placed < n; i++) {
    const x = x0 + hash(i, seed, 1) * (x1 - x0), z = z0 + hash(i, seed, 2) * (z1 - z0);
    if (w.get(Math.floor(x), g, Math.floor(z)) || w.get(Math.floor(x), g + 2, Math.floor(z))) continue;
    student(w, x, g, z, seed * 100 + i);
    placed++;
  }
}
