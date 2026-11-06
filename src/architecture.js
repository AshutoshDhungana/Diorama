// Newar architectural components. All builders write into a VoxelWorld (1 voxel ≈ 0.4 m).
import { P, pick } from './palette.js';
import { hash } from './voxels.js';
import { carvedDoor, carvedWindow, carvedFrame, bay, peacockWindow, eaveStruts, dentils, face } from './woodwork.js';

// Roof pitch: inset 1,2,1,2… voxels per layer (~34°), the stepped silhouette of a tiled Newar roof.
export const inset = (k) => Math.floor(k * 1.5);
// Temple roofs pitch steeper (1,1,2… ~37°) so each tier reads as a distinct sloped mass.
const pinset = (k) => k + Math.floor(k / 3);

// The four outer faces of an inclusive rectangle. at(t) -> outer [x, z] cell at position t along the face.
export function rectSides(x0, z0, x1, z1) {
  return [
    { out: [0, 1], a: x0, b: x1, at: (t) => [t, z1] },
    { out: [0, -1], a: x0, b: x1, at: (t) => [t, z0] },
    { out: [1, 0], a: z0, b: z1, at: (t) => [x1, t] },
    { out: [-1, 0], a: z0, b: z1, at: (t) => [x0, t] },
  ];
}
// k = 0 is the wall voxel, k = 1 one step outside, k = -1 one step inside.
export function put(w, s, t, k, y, mat) {
  const [x, z] = s.at(t);
  w.set(x + s.out[0] * k, y, z + s.out[1] * k, mat);
}

// Recessed opening with a dark timber frame; lintel and sill run past the jambs (tikijhyal horns).
export function opening(w, s, t0, y0, wd, ht, { fill = P.lattice, frame = P.woodMid, sill = true, torana = false } = {}) {
  const inRange = (t) => t > s.a && t < s.b;
  for (let t = t0; t < t0 + wd; t++)
    for (let y = y0; y < y0 + ht; y++) {
      put(w, s, t, 0, y, null);
      put(w, s, t, -1, y, fill);
    }
  for (let y = y0; y < y0 + ht; y++) {
    if (inRange(t0 - 1)) put(w, s, t0 - 1, 0, y, frame);
    if (inRange(t0 + wd)) put(w, s, t0 + wd, 0, y, frame);
  }
  for (let t = t0 - 2; t <= t0 + wd + 1; t++) {
    if (!inRange(t)) continue;
    put(w, s, t, 0, y0 + ht, frame);
    if (sill) put(w, s, t, 0, y0 - 1, frame);
  }
  if (torana) {
    for (let t = t0; t < t0 + wd; t++) put(w, s, t, 0, y0 + ht + 1, P.gold);
    put(w, s, t0 + (wd >> 1), 0, y0 + ht + 2, P.gold);
  }
}

// Evenly spaced positions for openings of width wd along a face.
function spread(s, wd, gap, margin = 2) {
  const len = s.b - s.a + 1;
  const room = len - margin * 2;
  if (room < wd) return [];
  const n = Math.max(1, Math.floor((room + gap) / (wd + gap)));
  if (n === 1) return [s.a + Math.floor((len - wd) / 2)];
  return Array.from({ length: n }, (_, i) => s.a + margin + Math.round((i * (room - wd)) / (n - 1)));
}

// Hip roof centred on (cx, cz), eave half-widths ex/ez, built upward until it meets the next tier.
export function hipRoof(w, cx, y, cz, ex, ez, stopX = -1, stopZ = -1, pitch = pinset, rim = P.eave) {
  let k = 0;
  for (; ; k++) {
    const hx = ex - pitch(k), hz = ez - pitch(k);
    if (hx <= stopX || hz <= stopZ || hx < 0 || hz < 0) break;
    const top = ez - pitch(k + 1) < 0 || ex - pitch(k + 1) <= stopX || ez - pitch(k + 1) <= stopZ;
    for (let dz = -hz; dz <= hz; dz++)
      for (let dx = -hx; dx <= hx; dx++) {
        const edge = Math.abs(dx) === hx || Math.abs(dz) === hz;
        // no dark hip voxels: on stepped layers they read as a dotted checker, not a ridge line
        let m = k % 2 ? P.tileAlt : P.tile;
        if (top && stopX < 0) m = P.ridge;
        if (k === 0 && edge) m = rim;
        w.set(cx + dx, y + k, cz + dz, m);
      }
  }
  return y + k;
}

// Diagonal carved struts (tunal) from the wall up to the underside of the eave.
function struts(w, x0, z0, x1, z1, yEave, overhang, step = 2) {
  const L = overhang;
  for (const s of rectSides(x0, z0, x1, z1))
    for (let t = s.a; t <= s.b; t += step)
      for (let j = 1; j < L; j++) put(w, s, t, j, yEave - 1 - Math.round((L - 1 - j) * 0.7), P.wood);
}

// Gilded pinnacle (gajur), sub-voxel detail.
export function finial(w, x, y, z, s = 1) {
  const parts = [[2.4, 0.5], [1.8, 0.8], [1.3, 1.1], [1.9, 0.35], [1.1, 1.0], [0.7, 1.0], [0.35, 1.4]];
  let yy = y;
  parts.forEach(([d, h], i) => {
    w.detailC(x + 0.5, yy, z + 0.5, d * s, h * s, d * s, P.gold[i % 3]);
    yy += h * s;
  });
  return yy;
}

function tierBody(w, cx, y, cz, t) {
  const { hx, hz, h } = t;
  const x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
  if (t.colonnade) {
    // open ambulatory of timber posts around a brick sanctum with gilded doors
    w.box(x0 + 2, y, z0 + 2, x1 - 2, y + h - 2, z1 - 2, P.brick);
    for (const s of rectSides(x0, z0, x1, z1))
      for (let p = s.a; p <= s.b; p += 2) for (let yy = y; yy < y + h - 1; yy++) put(w, s, p, 0, yy, P.wood);
    w.box(x0, y + h - 1, z0, x1, y + h - 1, z1, P.wood);
    for (const s of rectSides(x0 + 2, z0 + 2, x1 - 2, z1 - 2)) {
      const len = s.b - s.a + 1, wd = len >= 7 ? 3 : 1;
      carvedDoor(w, s, s.a + ((len - wd) >> 1), y, wd, Math.min(4, h - 4), { gold: true });
    }
    return;
  }
  w.box(x0, y, z0, x1, y + h - 1, z1, t.mat || P.brick);
  w.box(x0, y + h - 1, z0, x1, y + h - 1, z1, P.wood);
  w.box(x0, y, z0, x1, y, z1, t.ground ? P.stoneDark : P.wood);
  const front = t.front ?? [0, 1];
  for (const s of rectSides(x0, z0, x1, z1)) {
    const len = s.b - s.a + 1;
    if (t.ground) {
      const doors = spread(s, 3, 3);
      const isFront = s.out[0] === front[0] && s.out[1] === front[1];
      doors.forEach((p, i) => carvedDoor(w, s, p, y + 1, 3, Math.min(4, h - 4), { gold: isFront && i === doors.length >> 1 }));
    } else if (h >= 4) {
      const wd = len >= 9 ? 3 : 1;
      carvedWindow(w, s, s.a + ((len - wd) >> 1), y + 1, wd, h - 3, { horns: wd > 1 });
    }
  }
}

// Multi-tier pagoda. tiers: [{hx, hz, h, ex, ez?, colonnade?, ground?}], bottom to top.
export function pagoda(w, cx, y, cz, tiers, { finials = [[0, 0]], finialScale = 1, pitch = pinset, rim = P.eave } = {}) {
  tiers.forEach((t, i) => {
    const ez = t.ez ?? t.hz + (t.ex - t.hx);
    tierBody(w, cx, y, cz, t);
    const top = y + t.h;
    struts(w, cx - t.hx, cz - t.hz, cx + t.hx, cz + t.hz, top, t.ex - t.hx);
    // small bells hanging from the eave corners
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) w.detailC(cx + 0.5 + sx * (t.ex + 0.2), top - 0.7, cz + 0.5 + sz * (ez + 0.2), 0.35, 0.6, 0.35, P.gold[1]);
    const n = tiers[i + 1];
    y = hipRoof(w, cx, top, cz, t.ex, ez, n ? n.hx : -1, n ? n.hz : -1, pitch, rim);
  });
  for (const [fx, fz] of finials) finial(w, cx + fx, y, cz + fz, finialScale);
  return y;
}

// Stepped platform. stages: [{hx, hz, h}] bottom to top; each stage capped with stone.
export function plinth(w, cx, y, cz, stages, { mat = P.brick, cap = P.stone } = {}) {
  for (const s of stages) {
    w.box(cx - s.hx, y, cz - s.hz, cx + s.hx, y + s.h - 1, cz + s.hz, mat);
    w.box(cx - s.hx, y + s.h - 1, cz - s.hz, cx + s.hx, y + s.h - 1, cz + s.hz, cap);
    y += s.h;
  }
  return y;
}

// Straight stair descending from yTop along dir, starting at cell (x, z). Low parapets on both sides.
export function stair(w, x, z, yTop, yBase, dir, hw, { mat = P.stone, wall = P.stoneDark } = {}) {
  const [dx, dz] = dir;
  const px = Math.abs(dz), pz = Math.abs(dx);
  for (let k = 0; yTop - 1 - k >= yBase; k++) {
    const sx = x + dx * k, sz = z + dz * k, top = yTop - 1 - k;
    for (let i = -hw; i <= hw; i++) w.box(sx + px * i, yBase, sz + pz * i, sx + px * i, top, sz + pz * i, mat);
    for (const i of [-hw - 1, hw + 1]) w.box(sx + px * i, yBase, sz + pz * i, sx + px * i, top + 1, sz + pz * i, wall);
  }
}

// Stone guardian statues (sub-voxel), facing f. Vermilion smear on the head, as on real shrines.
export function guardian(w, x, y, z, kind, s = 1, f = [0, 1]) {
  const st = P.stoneDark[(Math.abs(Math.floor(x * 7 + z)) % 3)], dk = 0x6d665a, red = 0xa8322a;
  const R = [f[1], -f[0]], swap = f[0] !== 0;
  const b = (dx, dy, dz, sx, sy, sz, c = st) =>
    w.detailC(x + (dx * R[0] + dz * f[0]) * s, y + dy * s, z + (dx * R[1] + dz * f[1]) * s, (swap ? sz : sx) * s, sy * s, (swap ? sx : sz) * s, c);
  b(0, 0, 0, 1.7, 0.45, 1.7, dk);
  const y0 = 0.45;
  if (kind === 'human') {
    b(-0.22, y0, 0, 0.36, 1.2, 0.5); b(0.22, y0, 0, 0.36, 1.2, 0.5);
    b(0, y0 + 1.2, 0, 1.0, 1.1, 0.65); b(0, y0 + 2.3, 0, 0.62, 0.62, 0.62);
    b(0.65, y0 + 1.2, 0.1, 0.25, 1.4, 0.25, dk);
    b(0, y0 + 2.85, 0.05, 0.3, 0.12, 0.62, red);
  } else if (kind === 'elephant') {
    for (const [lx, lz] of [[-0.4, -0.5], [0.4, -0.5], [-0.4, 0.5], [0.4, 0.5]]) b(lx, y0, lz, 0.4, 0.75, 0.4);
    b(0, y0 + 0.7, 0, 1.25, 0.95, 1.55); b(0, y0 + 1.1, 0.85, 0.95, 0.9, 0.6);
    b(0, y0 + 0.3, 1.18, 0.3, 1.0, 0.25); b(-0.6, y0 + 1.15, 0.75, 0.15, 0.7, 0.5); b(0.6, y0 + 1.15, 0.75, 0.15, 0.7, 0.5);
    b(0, y0 + 1.65, 0, 0.9, 0.18, 0.9, red);
  } else if (kind === 'goddess') {
    b(0, y0, 0, 1.0, 0.8, 0.9); b(0, y0 + 0.8, -0.05, 0.75, 1.0, 0.5); b(0, y0 + 1.8, 0, 0.55, 0.55, 0.55);
    b(0, y0 + 2.35, 0, 0.4, 0.3, 0.4, P.gold[0]);
  } else {
    // lion / griffin (sardul): seated haunch, upright chest, maned head
    b(0, y0, -0.2, 1.05, 0.65, 1.3); b(0, y0 + 0.4, 0.35, 0.95, 1.15, 0.7);
    b(0, y0 + 1.45, 0.45, 1.0, 0.85, 0.8, dk); b(0, y0 + 1.55, 0.85, 0.6, 0.5, 0.25);
    if (kind === 'griffin') { b(-0.35, y0 + 2.25, 0.4, 0.15, 0.45, 0.15); b(0.35, y0 + 2.25, 0.4, 0.15, 0.45, 0.15); }
    b(0, y0 + 2.28, 0.45, 0.5, 0.12, 0.5, red);
  }
}

// Nyatapola: five-tiered temple on a five-stage plinth, guardian pairs flanking a steep west stair.
export function nyatapola(w, cx, g, cz) {
  // Proportions as in the first iteration: compact plinth, low-pitched broad roofs, dark timber eave rims.
  const stages = [14, 12, 10, 8, 7].map((hw) => ({ hx: hw, hz: hw, h: 3 }));
  // brick terraces with dull brick copings: stone caps striped the plinth like a layer cake
  const top = plinth(w, cx, g, cz, stages, { mat: P.brick, cap: P.brickOld });
  w.box(cx - 14, g, cz - 14, cx + 14, g, cz + 14, P.stoneDark);
  // a thin stone coping line on each terrace edge, broken where the stair (cx±3) climbs through
  let yc = g;
  for (const s of stages) {
    yc += s.h;
    const o = s.hx + 0.3, L = 2 * s.hx + 1.1, seg = s.hx - 2.95, c = P.stone[1];
    w.detailC(cx + 0.5, yc - 0.25, cz + 0.5 - o, L, 0.3, 0.5, c);
    for (const sx of [-1, 1]) w.detailC(cx + 0.5 + sx * o, yc - 0.25, cz + 0.5, 0.5, 0.3, L, c);
    for (const sx of [-1, 1]) w.detailC(cx + 0.5 + sx * (3.5 + seg / 2), yc - 0.25, cz + 0.5 + o, seg, 0.3, 0.5, c);
  }
  stair(w, cx, cz + 8, top, g, [0, 1], 2);
  const kinds = ['human', 'elephant', 'lion', 'griffin', 'goddess'];
  stages.forEach((s, i) => {
    for (const sx of [-1, 1]) guardian(w, cx + 0.5 + sx * 4.6, g + 3 * (i + 1), cz + s.hz, kinds[i], 1.05 - i * 0.07);
  });
  return pagoda(w, cx, top, cz, [
    { hx: 6, hz: 6, h: 7, ex: 11, colonnade: true },
    { hx: 5, hz: 5, h: 4, ex: 9 },
    { hx: 4, hz: 4, h: 4, ex: 8 },
    { hx: 3, hz: 3, h: 3, ex: 6 },
    { hx: 2, hz: 2, h: 3, ex: 5 },
  ], { finialScale: 1.15, pitch: inset, rim: P.wood });
}

// Bhairavnath: rectangular three-tier temple with a row of finials along its ridge. dir = the way it faces.
export function bhairavnath(w, cx, g, cz, dir = [0, 1]) {
  const rx = dir[0] !== 0; // facing along x → long axis runs along z
  const R = (long, short) => (rx ? { hx: short, hz: long } : { hx: long, hz: short });
  const tier = (long, short, h, eLong, eShort, extra = {}) => {
    const r = R(long, short);
    return { ...r, h, ex: rx ? eShort : eLong, ez: rx ? eLong : eShort, ...extra };
  };
  const top = plinth(w, cx, g, cz, [{ ...R(13, 8), h: 2 }, { ...R(12, 7), h: 2 }], { mat: P.brickOld, cap: P.stone });
  stair(w, cx + dir[0] * 8, cz + dir[1] * 8, top, g, dir, 3);
  for (const side of [-1, 1]) {
    const px = cx + 0.5 + dir[0] * 8 + dir[1] * side * 5, pz = cz + 0.5 + dir[1] * 8 + dir[0] * side * 5;
    guardian(w, px, g + 2, pz, 'lion', 0.85, dir);
  }
  return pagoda(w, cx, top, cz, [
    tier(10, 5, 8, 13, 8, { ground: true, front: dir }),
    tier(8, 3, 4, 11, 6),
    tier(7, 2, 3, 9, 4),
  ], { finials: [-4, 0, 4].map((o) => (rx ? [0, o] : [o, 0])), finialScale: 0.85 });
}

// Small two-tier shrine temple on a brick plinth (in the spirit of Til Mahadev Narayan).
export function shrineTemple(w, cx, g, cz, dir = [0, 1]) {
  const top = plinth(w, cx, g, cz, [{ hx: 6, hz: 6, h: 2 }, { hx: 5, hz: 5, h: 2 }], { mat: P.brickOld, cap: P.stone });
  stair(w, cx + dir[0] * 6, cz + dir[1] * 6, top, g, dir, 1);
  return pagoda(w, cx, top, cz, [
    { hx: 3, hz: 3, h: 6, ex: 6, colonnade: true },
    { hx: 2, hz: 2, h: 3, ex: 4 },
  ], { finialScale: 0.75 });
}

const STONE_D = 0x7d7567, STONE_L = 0xc2b8a3;

// Stack of centred sub-voxel discs/bulbs from y upward: parts = [[width, height, colour], ...]. Returns top y.
function stack(w, x, y, z, parts) {
  for (const [d, h, c] of parts) {
    w.detailC(x, y, z, d, h, d, c);
    y += h;
  }
  return y;
}

// Vatsala Durga (Bhaktapur Durbar Square): stone shikhara on a stepped plinth with beasts beside the
// stair; an arcade of stone pillars round the sanctum under a heavy frieze; at the foot of the tower,
// tiered spirelets on the corners and an arched niche shrine on every face; a gently tapering spire
// with projecting griffins; then an overhanging collar, a drum, stacked discs and a gilt ringed pinnacle.
export function vatsala(w, cx, g, cz, dir = [1, 0]) {
  const stages = [9, 8, 7].map((hw) => ({ hx: hw, hz: hw, h: 2 }));
  const top = plinth(w, cx, g, cz, stages, { mat: P.stone, cap: P.stoneDark });
  stair(w, cx + dir[0] * 8, cz + dir[1] * 8, top, g, dir, 1);
  const perp = [Math.abs(dir[1]), Math.abs(dir[0])];
  const kinds = ['lion', 'griffin', 'lion'];
  stages.forEach((s, i) => {
    for (const side of [-1, 1]) {
      const px = cx + 0.5 + dir[0] * s.hx + perp[0] * side * 3.3, pz = cz + 0.5 + dir[1] * s.hx + perp[1] * side * 3.3;
      guardian(w, px, g + 2 * (i + 1), pz, kinds[i], 0.7, dir);
    }
  });

  // arcade of pillars round the sanctum
  const h = 6, y1 = top + h;
  w.box(cx - 3, top, cz - 3, cx + 3, y1 - 1, cz + 3, P.stone);
  for (const s of rectSides(cx - 5, cz - 5, cx + 5, cz + 5)) {
    const f = face(w, s);
    for (let p = s.a; p <= s.b; p++) {
      if ((p - s.a) % 2) {
        f(p + 0.05, y1 - 1.75, -0.6, 0.9, 0.3, 0.5, STONE_L); // cusped arch head between pillars
        f(p + 0.3, y1 - 2.05, -0.6, 0.4, 0.3, 0.5, STONE_L);
        continue;
      }
      for (let y = top; y < y1 - 1; y++) put(w, s, p, 0, y, P.stone);
      f(p - 0.15, top, 0, 1.3, 0.4, 0.15, STONE_D);
      f(p - 0.2, y1 - 1.6, 0, 1.4, 0.35, 0.2, STONE_D);
    }
  }
  w.box(cx - 5, y1 - 1, cz - 5, cx + 5, y1 - 1, cz + 5, P.stoneDark);
  for (const s of rectSides(cx - 3, cz - 3, cx + 3, cz + 3))
    carvedDoor(w, s, s.a + 2, top, 3, 3, { stone: true, gold: s.out[0] === dir[0] && s.out[1] === dir[1] });
  // heavy carved frieze
  w.box(cx - 6, y1, cz - 6, cx + 6, y1, cz + 6, P.stoneDark);
  w.box(cx - 6, y1 + 1, cz - 6, cx + 6, y1 + 1, cz + 6, P.stone);
  for (const s of rectSides(cx - 6, cz - 6, cx + 6, cz + 6)) {
    const f = face(w, s);
    for (let u = s.a + 0.1; u < s.b + 0.9; u += 0.5) f(u, y1 + 0.2, 0, 0.25, 0.35, 0.2, STONE_L);
    f(s.a, y1 + 1.35, 0, s.b - s.a + 1, 0.2, 0.15, STONE_D);
  }

  // main spire: nearly straight taper, darker arrises
  const yb = y1 + 2, T = 16;
  // Half-steps: when the profile sits between two widths, take the wider one with its corners
  // chamfered, so the taper reads as a smooth cone rather than three stacked boxes.
  for (let t = 0; t < T; t++) {
    const R = Math.max(1, 4.2 * Math.pow(1 - t / T, 0.6)), lo = Math.floor(R), fr = R - lo;
    const hw = fr > 0.3 ? lo + 1 : lo, chamfer = fr > 0.3 && fr < 0.75;
    w.box(cx - hw, yb + t, cz - hw, cx + hw, yb + t, cz + hw, P.stone);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        w.set(cx + sx * hw, yb + t, cz + sz * hw, chamfer ? null : P.stoneDark);
        if (chamfer) w.set(cx + sx * (hw - 1), yb + t, cz + sz * (hw - 1), P.stoneDark);
      }
  }
  // griffins springing from the faces, a medallion niche on the front
  const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const tg = 9, hg = Math.round(4.2 * Math.pow(1 - tg / T, 0.6));
  for (const [ax, az] of faces) {
    w.set(cx + ax * (hg + 1), yb + tg - 1, cz + az * (hg + 1), P.stoneDark);
    guardian(w, cx + 0.5 + ax * (hg + 1), yb + tg, cz + 0.5 + az * (hg + 1), 'griffin', 0.5, [ax, az]);
  }
  const hm = Math.round(4.2 * Math.pow(1 - 12 / T, 0.6));
  w.set(cx + dir[0] * hm, yb + 12, cz + dir[1] * hm, P.lattice);
  w.detailC(cx + 0.5 + dir[0] * (hm + 0.6), yb + 12.1, cz + 0.5 + dir[1] * (hm + 0.6), 0.5, 0.8, 0.5, P.gold[0]);

  // niche shrines on each face at the foot of the tower
  for (const [ax, az] of faces) {
    const at = (d, k, y, m) => w.set(cx + ax * k + az * d, y, cz + az * k + ax * d, m);
    for (let d = -1; d <= 1; d++)
      for (let k = 4; k <= 5; k++) {
        for (let y = yb; y < yb + 5; y++) at(d, k, y, P.stone);
        at(d, k, yb + 5, P.stoneDark);
      }
    at(0, 4, yb + 6, P.stone);
    at(0, 5, yb + 6, P.stone);
    for (let y = yb + 1; y < yb + 4; y++) at(0, 5, y, P.lattice);
    const nx = cx + 0.5 + ax * 5.6, nz = cz + 0.5 + az * 5.6;
    w.detailC(nx, yb + 1, nz, 0.5, 1.2, 0.5, P.stone[2]);
    w.detailC(nx, yb + 2.2, nz, 0.36, 0.36, 0.36, P.stone[2]);
    w.detailC(cx + 0.5 + ax * 6.05, yb + 4, cz + 0.5 + az * 6.05, ax ? 0.2 : 2.6, 0.35, az ? 0.2 : 2.6, STONE_D);
    w.detailC(cx + 0.5 + ax * 5, yb + 7, cz + 0.5 + az * 5, 0.45, 0.7, 0.45, P.gold[1]);
  }
  // tiered spirelets on the corners
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * 5, z = cz + sz * 5;
      w.box(x - 1, yb, z - 1, x + 1, yb + 2, z + 1, P.stone);
      w.set(x + sx, yb + 1, z, P.lattice);
      w.set(x, yb + 1, z + sz, P.lattice);
      w.box(x - 1, yb + 3, z - 1, x + 1, yb + 3, z + 1, P.stoneDark);
      w.box(x, yb + 4, z, x, yb + 5, z, P.stone);
      const yy = stack(w, x + 0.5, yb + 4.3, z + 0.5, [[1.7, 0.3, STONE_D], [0.9, 0.5, STONE_L], [1.35, 0.3, STONE_D], [0.8, 0.5, STONE_L], [1.0, 0.3, STONE_D]]);
      stack(w, x + 0.5, Math.max(yy, yb + 6), z + 0.5, [[0.5, 0.5, P.gold[0]], [0.25, 0.6, P.gold[1]]]);
    }

  // a thin line marking the spire top, a low disc and a short gilt pinnacle
  const yt = yb + T;
  w.detailC(cx + 0.5, yt - 0.3, cz + 0.5, 3.3, 0.25, 3.3, STONE_D);
  const yd = stack(w, cx + 0.5, yt, cz + 0.5, [[2.2, 0.3, STONE_D], [1.7, 0.35, STONE_L], [1.2, 0.25, STONE_D]]);
  const G = P.gold;
  stack(w, cx + 0.5, yd, cz + 0.5, [
    [1.0, 0.35, G[1]], [1.3, 0.45, G[0]], [1.0, 0.35, G[1]], [1.1, 0.4, G[0]],
    [0.75, 0.35, G[1]], [0.85, 0.4, G[0]], [0.5, 0.5, G[2]], [0.25, 0.8, G[0]],
  ]);
}


// The Taleju bell ("bell of barking dogs") hung in a stone frame. along = axis of the beam.
export function taleBell(w, x, g, z, along = [0, 1]) {
  const [ax, az] = along;
  for (let i = -3; i <= 3; i++) w.box(x + ax * i - az, g, z + az * i - ax, x + ax * i + az, g, z + az * i + ax, P.stoneDark);
  for (const i of [-3, 3]) w.box(x + ax * i, g + 1, z + az * i, x + ax * i, g + 7, z + az * i, P.stone);
  for (let i = -3; i <= 3; i++) w.set(x + ax * i, g + 8, z + az * i, P.stoneDark);
  const bx = x + 0.5, bz = z + 0.5;
  w.detailC(bx, g + 6.6, bz, 0.15, 1.4, 0.15, 0x3a3020);
  w.detailC(bx, g + 4.4, bz, 1.6, 0.3, 1.6, 0x5e4a2c);
  w.detailC(bx, g + 4.7, bz, 1.3, 1.3, 1.3, 0x6e5833);
  w.detailC(bx, g + 6.0, bz, 0.85, 0.6, 0.85, 0x6e5833);
  w.detailC(bx, g + 9, bz, 0.5, 0.9, 0.5, P.gold[0]);
}


// Bhupatindra Malla's column: stone shaft topped by the gilded kneeling king beneath a parasol.
export function royalColumn(w, cx, g, cz) {
  const top = plinth(w, cx, g, cz, [{ hx: 3, hz: 3, h: 1 }, { hx: 2, hz: 2, h: 2 }, { hx: 1, hz: 1, h: 2 }], { mat: P.stone, cap: P.stoneDark });
  w.box(cx, top, cz, cx, top + 10, cz, P.stone);
  w.box(cx - 1, top + 11, cz - 1, cx + 1, top + 11, cz + 1, P.stoneDark);
  const x = cx + 0.5, z = cz + 0.5, y = top + 12, G = P.gold;
  w.detailC(x, y, z, 1.6, 0.3, 1.6, G[1]);
  w.detailC(x, y + 0.3, z - 0.1, 1.1, 0.7, 1.1, G[0]);
  w.detailC(x, y + 1.0, z - 0.1, 0.9, 1.0, 0.6, G[2]);
  w.detailC(x, y + 1.25, z + 0.3, 0.5, 0.4, 0.3, G[0]);
  w.detailC(x, y + 2.0, z - 0.1, 0.6, 0.6, 0.6, G[0]);
  w.detailC(x, y + 2.6, z - 0.1, 0.4, 0.35, 0.4, G[1]);
  w.detailC(x, y + 0.3, z - 0.75, 0.15, 3.4, 0.15, G[1]);
  w.detailC(x, y + 3.7, z - 0.4, 1.8, 0.18, 1.8, G[2]);
  w.detailC(x, y + 3.88, z - 0.4, 0.8, 0.3, 0.8, G[0]);
}

// Newar townhouse: brick, timber string courses, carved doors, tikijhyal windows, a sanjhya bay,
// optionally a peacock window; carved struts under the eaves and a dentil cornice.
export function house(w, x0, g, z0, sx, sz, o = {}) {
  const floors = o.floors ?? 3, brick = o.brick ?? P.brick;
  const fh = [6, 5, 5, 5, 5].slice(0, floors);
  const H = fh.reduce((a, b) => a + b, 0);
  const x1 = x0 + sx - 1, z1 = z0 + sz - 1;
  const ridge = o.ridge ?? (sx >= sz ? 'x' : 'z');
  w.box(x0, g, z0, x1, g + H - 1, z1, brick);
  if (o.plaster) w.box(x0, g, z0, x1, g + fh[0] - 1, z1, o.plaster);
  w.box(x0, g, z0, x1, g, z1, P.brickDark);
  const sides = rectSides(x0, z0, x1, z1);
  const facade = (s) => (o.facade ?? [[0, 1], [1, 0]]).some(([a, b]) => s.out[0] === a && s.out[1] === b);
  let y = g, peacock = o.peacock; // [dx, dz] of the facade that gets the peacock window
  fh.forEach((h, f) => {
    if (f > 0) w.box(x0, y, z0, x1, y, z1, f === 1 ? P.wood : P.brickDark);
    for (const s of sides) {
      const fac = facade(s), len = s.b - s.a + 1, top = f === floors - 1;
      if (f === 0) {
        if (!fac) continue;
        spread(s, 3, 4).forEach((p, i) => {
          if (o.shops && hash(p, y, x0 + z0, 5) < 0.7) {
            opening(w, s, p, g + 1, 3, 4, { sill: false });
            carvedFrame(w, s, p, g + 1, 3, 4, { sill: false, horns: false });
            for (let t = p; t < p + 3; t++) put(w, s, t, -1, g + 1, pick(P.cloth, hash(t, i, z0, 9)));
            if (o.awning) awning(w, s, p, g + 5.9);
          } else carvedDoor(w, s, p, g + 1, 2, 4);
        });
        continue;
      }
      if (!fac) {
        spread(s, 2, 3).forEach((p) => opening(w, s, p, y + 1, 2, 2));
        continue;
      }
      if (f === 1) dentils(w, s, y + 0.3);
      if (f === 1 && peacock && s.out[0] === peacock[0] && s.out[1] === peacock[1] && len >= 10) {
        peacock = null;
        const p = s.a + ((len - 4) >> 1);
        peacockWindow(w, s, p, y + 1);
        if (len >= 16) for (const q of [p - 5, p + 7]) carvedWindow(w, s, q, y + 1, 2, 3);
      } else if (f === 2 && len >= 11) {
        const wd = len >= 13 ? 7 : 5;
        bay(w, s, s.a + ((len - wd) >> 1), y + 1, wd, top ? 2 : 3);
      } else {
        const wd = f === 1 && !top ? 3 : 2;
        spread(s, wd, 4).forEach((p) => carvedWindow(w, s, p, y + 1, wd, top ? 2 : 3));
      }
    }
    y += h;
  });
  for (const s of sides) for (let t = s.a; t <= s.b; t++) put(w, s, t, 0, y - 1, P.wood);
  for (const s of sides) if (facade(s)) dentils(w, s, y - 0.75);
  if (o.roof === 'terrace') terrace(w, x0, y, z0, x1, z1, brick);
  else {
    gableRoof(w, x0, y, z0, x1, z1, ridge, brick);
    for (const s of sides) if (facade(s) && (ridge === 'x' ? s.out[0] === 0 : s.out[1] === 0)) eaveStruts(w, s, y);
  }
  return y;
}


// Striped cloth awning projecting over a shopfront.
function awning(w, s, t0, y) {
  const [x, z] = s.at(t0);
  const along = s.out[0] === 0 ? [1, 0] : [0, 1];
  for (let i = 0; i < 6; i++) {
    const ox = x + along[0] * (i * 0.5 - 0.25) + s.out[0] * 1.2 + 0.5 * along[1];
    const oz = z + along[1] * (i * 0.5 - 0.25) + s.out[1] * 1.2 + 0.5 * along[0];
    const sx = along[0] ? 0.5 : 1.6, sz = along[1] ? 0.5 : 1.6;
    w.detail(ox - (along[0] ? 0 : 0.3), y - (i % 2) * 0.02, oz - (along[1] ? 0 : 0.3), sx, 0.18, sz, i % 2 ? 0xe9dfcc : 0xb8352b);
  }
}

// Gable roof with eave overhang 2, verge overhang 1, brick gable triangles at the ends.
export function gableRoof(w, x0, y, z0, x1, z1, ridge, brick = P.brick, tiles = [P.roofOld, P.roofOldAlt]) {
  const rx = ridge === 'x';
  const [a0, a1] = rx ? [z0, z1] : [x0, x1]; // across the ridge
  const [b0, b1] = rx ? [x0, x1] : [z0, z1]; // along the ridge
  const set = (along, across, yy, m) => (rx ? w.set(along, yy, across, m) : w.set(across, yy, along, m));
  for (let k = 0; ; k++) {
    const lo = a0 - 2 + inset(k), hi = a1 + 2 - inset(k);
    if (lo > hi) break;
    const nlo = a0 - 2 + inset(k + 1), nhi = a1 + 2 - inset(k + 1);
    for (let b = b0 - 1; b <= b1 + 1; b++)
      for (let a = lo; a <= hi; a++) {
        const skin = a < nlo || a > nhi;
        const end = b === b0 - 1 || b === b1 + 1;
        if (end && !skin) continue;
        let m = tiles[k % 2];
        if (nlo > nhi) m = P.ridge;
        if (k === 0 && (a === lo || a === hi)) m = P.wood;
        if ((b === b0 || b === b1) && !skin) m = brick;
        set(b, a, y + k, m);
      }
  }
}

// Flat roof terrace with parapet, a small stair shed and potted plants.
function terrace(w, x0, y, z0, x1, z1, brick) {
  w.box(x0, y - 1, z0, x1, y - 1, z1, P.pave);
  for (const s of rectSides(x0, z0, x1, z1)) for (let t = s.a; t <= s.b; t++) put(w, s, t, 0, y, P.brickDark);
  const sx = x0 + 1, sz = z0 + 1;
  w.box(sx, y, sz, sx + 3, y + 3, sz + 3, brick);
  opening(w, rectSides(sx, sz, sx + 3, sz + 3)[0], sx + 1, y, 2, 2, { sill: false, fill: P.woodMid });
  gableRoof(w, sx, y + 4, sz, sx + 3, sz + 3, 'x', brick);
  for (let x = x0 + 1; x <= x1 - 1; x += 2) {
    if (hash(x, y, z1, 4) < 0.5) continue;
    w.detailC(x + 0.5, y + 1, z1 + 0.5, 0.6, 0.5, 0.6, P.clay[1]);
    w.detailC(x + 0.5, y + 1.5, z1 + 0.5, 0.8, 0.6, 0.8, pick(P.leaf, hash(x, 1, z1, 2)));
  }
}

// Pati: open timber rest-house on a raised brick plinth.
export function pati(w, x0, g, z0, sx, sz) {
  const x1 = x0 + sx - 1, z1 = z0 + sz - 1;
  w.box(x0, g, z0, x1, g + 1, z1, P.brickOld);
  w.box(x0, g + 1, z0, x1, g + 1, z1, P.stone);
  for (const s of rectSides(x0, z0, x1, z1))
    for (let t = s.a; t <= s.b; t += 3) for (let y = g + 2; y <= g + 6; y++) put(w, s, t, 0, y, P.wood);
  for (const s of rectSides(x0, z0, x1, z1)) for (let t = s.a; t <= s.b; t++) put(w, s, t, 0, g + 7, P.woodMid);
  w.box(x0 + 1, g + 7, z0 + 1, x1 - 1, g + 7, z1 - 1, P.wood);
  gableRoof(w, x0, g + 8, z0, x1, z1, sx >= sz ? 'x' : 'z', P.brickOld);
  return g + 2;
}
