// Khwopa Engineering College, Libali, Bhaktapur. Grid: x → east, z → south, y up; 1 storey = 5 voxels.
// Site plan traced from the satellite view at 1 px ≈ 0.15 voxel (X = (px − 40)·0.15, Z = (py − 35)·0.15).
// North row, west to east: Block E (gable block between lower north and south wings), Block D, Block C
// (pediment on the garden axis), Block B (new terracotta roofs, solar panels). Block A and its annex hold
// the east side. The garden and badminton court run down the axis to the fountain roundabout; the west
// road leads out to the KhEC gate, the south road past the bike rows to the KhCE gate. South-west: Block
// F&G, its plaza and pavilion, the cafeteria on the slanted west boundary; south-east: field and football.
import { VoxelWorld } from './voxels.js';
import { P } from './palette.js';
import { rectSides, put, finial } from './architecture.js';
import { carvedWindow, face } from './woodwork.js';
import { tree, platform } from './environment.js';
import * as C from './campus.js';
import { K, FH } from './campus.js';

export const W = 180, D = 116, G = 10, H = 66;
// The compound's west wall runs on a slant; the platform keeps a strip of street outside it.
const wallX = (z) => Math.round(27.3 - 0.241 * z);
const STREET = 5;

export const PLACES = [
  [47, 31, 13, 'Block E', 'Its gable rising over the south wing'],
  [64, 13, 7, 'Block D', 'A low Newar-style hall'],
  [97, 14, 14, 'Block C', 'Open loggias under the central pediment'],
  [150, 12, 14, 'Block B', 'New terracotta roofs and solar panels'],
  [140, 39, 14, 'Block A', 'Six storeys under a hipped roof'],
  [167, 35, 8, 'Annex', 'Khwopa Engineering College'],
  [71, 41, 7, 'Badminton Court', ''],
  [97, 39, 9, 'Garden', 'Hedged lawns on the axis of Block C'],
  [98, 57, 9, 'Fountain', 'Tiered red tile in a round basin'],
  [44, 100, 16, 'Block F & G', 'Khwopa College of Engineering'],
  [56, 79, 8, 'Pavilion', 'Carved timber pati under a metal roof'],
  [12, 95, 7, 'Cafeteria', ''],
  [81, 99, 9, 'Basketball Court', ''],
  [113, 95, 9, 'Parking', ''],
  [140, 71, 14, 'Field', ''],
  [150, 96, 14, 'Football Court', ''],
  [16, 60, 8, 'West Gate', 'Khwopa Engineering College'],
  [98, 110, 7, 'South Gate', 'Khwopa College of Engineering'],
];
export const START = [98.5, 64.5]; // on the roundabout, south of the fountain
export const VIEW = {
  fit: 90, az: 34, el: 38, ty: 4, shadow: 150,
  title: 'Khwopa Engineering College · Voxel Diorama',
  caption: '<b>Khwopa Engineering College</b>Libali · Bhaktapur · Kathmandu Valley',
};

// Timber pati with a dark standing-seam metal roof, on a brick plinth (in front of Block F&G).
function pavilion(w, x0, g, z0, x1, z1) {
  w.box(x0, g, z0, x1, g, z1, K.plinth);
  w.box(x0, g + 1, z0, x1, g + 1, z1, P.stoneDark);
  for (const s of rectSides(x0 + 1, z0 + 1, x1 - 1, z1 - 1)) {
    for (let t = s.a; t <= s.b; t += 2) for (let y = g + 2; y <= g + 6; y++) put(w, s, t, 0, y, P.wood);
    for (let t = s.a; t <= s.b; t++) put(w, s, t, 0, g + 7, P.woodMid);
    // lattice balustrade between the posts
    const [ox, oz] = s.out;
    for (let t = s.a + 1; t < s.b; t += 2) {
      const [x, z] = s.at(t);
      const px = x + 0.5 + ox * 0.35, pz = z + 0.5 + oz * 0.35;
      w.detailC(px, g + 2, pz, ox ? 0.15 : 1, 1.3, oz ? 0.15 : 1, 0x3a2418);
      for (let i = 0; i < 3; i++) w.detailC(px + ox * 0.05, g + 2.2 + i * 0.35, pz + oz * 0.05, ox ? 0.12 : 0.95, 0.08, oz ? 0.12 : 0.95, 0x6a4a34);
    }
  }
  const metal = [K.metal, [0x4f555a, 0x565c61]];
  const top = C.roof(w, x0 + 1, g + 8, z0 + 1, x1 - 1, z1 - 1, { tiles: metal, rim: P.wood, ridgeMat: [0x464b50] });
  for (const [x, z] of [[x0 - 2, z0 - 2], [x1 + 2, z0 - 2], [x0 - 2, z1 + 2], [x1 + 2, z1 + 2]]) w.detailC(x + 0.5, g + 8.6, z + 0.5, 0.6, 0.7, 0.6, 0x464b50); // upturned corners
  const cx = (x0 + x1 + 1) / 2, cz = (z0 + z1 + 1) / 2;
  let y = top;
  for (const [d, h] of [[2.2, 0.5], [1.4, 0.7], [1.8, 0.3], [1.0, 0.8], [0.6, 0.9], [0.3, 0.8]]) (w.detailC(cx, y, cz, d, h, d, 0x3c4045), (y += h));
}

// Octagonal brick guardhouse with a stepped tiled roof and pinnacle, inside the west gate.
function guardhouse(w, cx, g, cz, r = 3) {
  const oct = (rr, dx, dz) => Math.abs(dx) <= rr && Math.abs(dz) <= rr && Math.abs(dx) + Math.abs(dz) <= rr * 1.45;
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++) if (oct(r, dx, dz)) w.box(cx + dx, g, cz + dz, cx + dx, g + 5, cz + dz, K.brick);
  for (let y = g + 2; y <= g + 3; y++) for (const [dx, dz] of [[0, r], [0, -r], [r, 0], [-r, 0]]) w.set(cx + dx, y, cz + dz, K.glass);
  for (let y = g + 1; y <= g + 4; y++) w.set(cx - r, y, cz + 1, K.frame);
  const R = r + 2;
  for (let k = 0; k <= R; k++) {
    const rr = R - k;
    for (let dz = -rr; dz <= rr; dz++)
      for (let dx = -rr; dx <= rr; dx++) if (oct(rr, dx, dz)) w.set(cx + dx, g + 6 + k, cz + dz, k === 0 && !oct(rr - 1, dx, dz) ? K.rim : rr <= 1 ? K.ridge : C.TILES[k % 2]);
  }
  finial(w, cx, g + 7 + R, cz, 0.4);
}

// Gate: two tall brick piers carrying a tiled beam with three pinnacles and the college's name over the
// carriageway, pedestrian gates under small roofs either side. Laid along x (facing +z) or along z
// (facing −x). a = position along the gate line, b = the 2-voxel-thick line itself.
function gate(w, a0, g, b0, { alongZ = false, text, leaf }) {
  const box = (a, y0, b, a1, y1, b1, m) => (alongZ ? w.box(b, g + y0, a, b1, g + y1, a1, m) : w.box(a, g + y0, b, a1, g + y1, b1, m));
  const det = (a, y, b, sa, sy, sb, c) => (alongZ ? w.detail(b, g + y, a, sb, sy, sa, c) : w.detail(a, g + y, b, sa, sy, sb, c));
  const rect = (a, b, a1, b1) => (alongZ ? [b, a, b1, a1] : [a, b, a1, b1]);
  const ridge = alongZ ? 'z' : 'x';
  const pier = (a, h) => (box(a, 0, b0, a + 1, h, b0 + 1, K.brick), box(a, h - 1, b0, a + 1, h - 1, b0 + 1, K.band));
  pier(a0, 9), pier(a0 + 12, 9), pier(a0 - 5, 6), pier(a0 + 17, 6);
  box(a0, 10, b0, a0 + 13, 11, b0 + 1, K.brick);
  box(a0 + 2, 9, b0, a0 + 11, 9, b0 + 1, K.frame);
  const [rx0, rz0, rx1, rz1] = rect(a0, b0, a0 + 13, b0 + 1);
  const top = C.roof(w, rx0, g + 12, rz0, rx1, rz1, { kind: 'gable', ridge, ov: 2, verge: 2 });
  for (const da of [4, 7, 10]) det(a0 + da - 0.45, top - g - 0.4, b0 + 0.55, 0.9, 1.2, 0.9, K.brick[0]), det(a0 + da - 0.2, top - g + 0.8, b0 + 0.8, 0.4, 0.7, 0.4, K.brick[2]);
  const front = rectSides(rx0, rz0, rx1, rz1)[alongZ ? 3 : 0];
  C.lettering(w, front, a0 + 7, g + 10.4, text, 0.105);
  for (const [s0, s1] of [[a0 - 5, a0 - 1], [a0 + 14, a0 + 18]]) {
    const [x0, z0, x1, z1] = rect(s0, b0, s1, b0 + 1);
    C.roof(w, x0, g + 7, z0, x1, z1, { kind: 'gable', ridge, ov: 1, verge: 1 });
  }
  const bo = alongZ ? 0 : 0.8; // leaves sit on the outer face
  for (const [l0, l1] of [[a0 + 2, a0 + 7], [a0 + 7, a0 + 12], [a0 - 3, a0], [a0 + 14, a0 + 17]]) {
    det(l0, 0, b0 + bo, l1 - l0, 4.2, 0.25, leaf.c);
    det(l0 + 0.3, 3.9, b0 + bo - 0.05, l1 - l0 - 0.6, 0.15, 0.35, leaf.rail);
    const m = (l0 + l1) / 2, rr = Math.min(1.8, (l1 - l0) * 0.55);
    det(m - rr / 2, 1.9 - rr / 2, b0 + bo - 0.06, rr, rr, 0.1, leaf.disc);
    det(m - rr * 0.32, 1.9 - rr * 0.32, b0 + bo - 0.1, rr * 0.64, rr * 0.64, 0.1, leaf.c);
  }
}

// Dormer on the north slope of a roof whose eave wall is at z0 and wall top at y.
function dormer(w, x, y, z0) {
  w.box(x - 2, y + 2, z0 + 1, x + 2, y + 5, z0 + 8, K.brick);
  C.win(w, rectSides(x - 2, z0 + 1, x + 2, z0 + 8)[1], x - 1, y + 3, 3, 2);
  C.roof(w, x - 2, y + 6, z0 + 1, x + 2, z0 + 8, { kind: 'gable', ridge: 'z', ov: 1, verge: 1 });
}

// Solar panels laid on the south slope (layers 1..n) of a roof built by C.roof with ov 3 over z1 at height y.
function solar(w, x0, x1, y, z1, n = 4) {
  const ins = (k) => Math.floor(k * 1.5);
  for (let k = 1; k <= n; k++) w.detail(x0, y + k + 1, z1 + 4 - ins(k + 1), x1 - x0, 0.12, ins(k + 1) - ins(k), 0x2b3f63);
}

// Lines painted on a court (sub-voxel strips lying on the ground).
function lines(w, x0, z0, x1, z1, y, c = 0xeeeae0) {
  const t = 0.18;
  w.detail(x0, y, z0, x1 - x0, 0.03, t, c);
  w.detail(x0, y, z1 - t, x1 - x0, 0.03, t, c);
  w.detail(x0, y, z0, t, 0.03, z1 - z0, c);
  w.detail(x1 - t, y, z0, t, 0.03, z1 - z0, c);
}
function goal(w, x, g, cz, depth) {
  const c = 0xf2f0ea;
  w.detail(x, g, cz - 3, 0.25, 2.6, 0.25, c);
  w.detail(x, g, cz + 2.75, 0.25, 2.6, 0.25, c);
  w.detail(x, g + 2.35, cz - 3, 0.25, 0.25, 6, c);
  w.detail(Math.min(x, x + depth), g + 0.05, cz - 3, Math.abs(depth), 0.12, 6, 0xcfd2d0);
}
function hoop(w, cx, g, z, dir) {
  w.detail(cx - 0.15, g, z, 0.3, 6.5, 0.3, 0x3c3f44);
  w.detail(cx - 1.2, g + 5.4, z + dir * 0.3, 2.4, 1.6, 0.15, 0xf2f0ea);
  w.detail(cx - 0.4, g + 5.4, Math.min(z + dir * 0.45, z + dir * 1.25), 0.8, 0.08, 0.8, 0xc2502e);
}
// Tall mesh fence: posts and rails (the cage round the courts).
function fence(w, x0, z0, x1, z1, g, h = 7) {
  const c = 0x34383c, along = x1 - x0 > z1 - z0;
  const n = Math.max(1, Math.round((along ? x1 - x0 : z1 - z0) / 4));
  for (let i = 0; i <= n; i++) w.detail(x0 + ((x1 - x0) * i) / n, g, z0 + ((z1 - z0) * i) / n, 0.2, h, 0.2, c);
  for (const y of [h - 0.1, h * 0.5]) w.detail(x0, g + y, z0, along ? x1 - x0 : 0.12, 0.1, along ? 0.12 : z1 - z0, c);
}

export function buildDiorama() {
  const w = new VoxelWorld(W, H, D);
  platform(w, W, D, G, (x, z) => x >= wallX(z) - STREET);

  // ---- ground --------------------------------------------------------------------------------------
  for (let z = 1; z < D - 1; z++)
    for (let x = Math.max(1, wallX(z) - STREET + 1); x < W - 1; x++) w.set(x, G - 1, z, x < wallX(z) ? K.road : C.herring(x, z));
  const turf = (x, z) => K.turf[(x * 7 + z * 13 + ((x >> 3) ^ (z >> 2))) % 5];
  C.ground(w, 77, 29, 94, 50, K.lawn, G); // garden, west of the axis
  C.ground(w, 101, 29, 119, 50, K.lawn, G); // garden, east of the axis
  C.ground(w, 66, 30, 76, 52, [0x93463a, 0x8c4236], G); // badminton court
  C.ground(w, 35, 71, 72, 88, C.flags, G); // F&G plaza
  C.ground(w, 73, 87, 89, 111, C.hexPave, G); // basketball court
  C.ground(w, 104, 85, 123, 107, C.hexPave, G); // main parking
  C.ground(w, 106, 62, 176, 80, (x, z) => ((x + z) % 9 === 0 ? K.lawn[1] : turf(x, z)), G); // field
  C.ground(w, 125, 83, 176, 111, turf, G); // football court
  C.ground(w, 102, 54, 177, 58, K.road, G); // east road (asphalt)
  C.disc(w, 98, 57, 0, 8.5, G - 1, C.herring);
  C.disc(w, 98, 57, 8.5, 9.5, G - 1, K.band);

  // ---- north row --------------------------------------------------------------------------------
  // Block D: low Newar-style hall with lattice windows, between E and C (built first: E's walls win where they meet).
  const dTop = C.block(w, 57, G, 8, 71, 18, { floors: 2, win: 3, pier: 3, window: carvedWindow, blank: [[-1, 0]] });
  C.roof(w, 57, dTop, 8, 71, 18, { kind: 'gable', ridge: 'x', ov: 2 });

  // Block E: the five-storey gabled core, lower wings north and south; porch onto the garden lane.
  const eN = C.block(w, 35, G, 8, 56, 18, { floors: 4, skirts: [1], blank: [[0, 1]] });
  C.roof(w, 35, eN, 8, 56, 18);
  const eTop = C.block(w, 35, G, 19, 59, 41, { floors: 5, skirts: [1, 3] });
  C.roof(w, 35, eTop, 19, 59, 41, { kind: 'gable', ridge: 'z' });
  for (const s of rectSides(35, 19, 59, 41).slice(0, 2)) {
    C.win(w, s, 45, eTop + 1, 4, 3);
    C.win(w, s, 40, eTop + 1, 2, 2);
    C.win(w, s, 53, eTop + 1, 2, 2);
    C.win(w, s, 46, eTop + 6, 2, 1);
  }
  C.porch(w, rectSides(35, 19, 59, 41)[2], 30, 4, 3, G, { steps: 1 });
  const eS = C.block(w, 37, G, 42, 57, 54, { floors: 4, skirts: [0], blank: [[0, -1]], loggia: (s, i, n, f) => s.out[1] === 1 && f > 0 && i % 2 === 1 });
  const eSides = rectSides(37, 42, 57, 54).filter((s) => s.out[1] !== -1);
  C.skirt(w, 37, 42, 57, 54, eS - 1, { sides: eSides });
  w.box(37, eS - 1, 42, 57, eS - 1, 54, [0x8f8a81, 0x948f86]);
  for (const s of eSides) for (let t = s.a; t <= s.b; t++) put(w, s, t, 0, eS - 1, K.band), put(w, s, t, 0, eS, K.band);

  // Block C: hipped core with low end wings; the pedimented centre steps forward on the garden axis.
  const c3 = C.block(w, 77, G, 8, 82, 23, { floors: 3, blank: [[1, 0]] });
  C.roof(w, 77, c3, 8, 82, 23);
  C.block(w, 112, G, 8, 122, 23, { floors: 3, blank: [[-1, 0]] });
  C.roof(w, 112, c3, 8, 122, 23);
  const cCore = C.block(w, 83, G, 5, 111, 19, { floors: 4, skirts: [0], blank: [[1, 0], [-1, 0]] });
  C.roof(w, 83, cCore, 5, 111, 19);
  const cTop = C.block(w, 89, G, 5, 105, 25, {
    floors: 4, extra: 2, win: 7, pier: 6, skirts: [0], blank: [[1, 0], [-1, 0]], loggia: (s) => s.out[1] === 1,
  });
  C.roof(w, 89, cTop, 5, 105, 25, { kind: 'gable', ridge: 'z' });
  C.seal(w, rectSides(89, 5, 105, 25)[0], 97.5, cTop + 3.2);

  // Block B: four storeys, newer terracotta hip roof with a cross gable to the south, solar panels.
  const bTop = C.block(w, 127, G, 5, 174, 19, { floors: 4, skirts: [1] });
  C.roof(w, 127, bTop, 5, 174, 19, { tiles: C.TILES_NEW });
  C.block(w, 145, G, 5, 156, 24, { floors: 4, blank: [[1, 0], [-1, 0]] });
  C.roof(w, 145, bTop, 5, 156, 24, { kind: 'gable', ridge: 'z', tiles: C.TILES_NEW });
  solar(w, 130, 142, bTop, 19), solar(w, 159, 171, bTop, 19);

  // Block A: six storeys, one skirt, a hipped roof stopping at a broad flat deck. The entrance porch
  // stands at its east end where it meets the annex, steps down to the road (as in the aerials).
  const aTop = C.block(w, 122, G, 28, 158, 50, { floors: 6, skirts: [2], blank: [[1, 0]] });
  C.roof(w, 122, aTop, 28, 158, 50, { flat: 16 });
  C.porch(w, rectSides(122, 28, 158, 50)[0], 153, 4, 3, G, { steps: 1 });
  // Annex: four storeys, flat roof behind a parapet, the college name across its front, and an open
  // balcony gallery (thin timber posts, a railing over the brick parapet) along the top floor under the eave.
  const xTop = C.block(w, 159, G, 28, 176, 42, { floors: 4, win: 3, pier: 3, blank: [[-1, 0]] });
  const yb = G + 1 + 3 * FH; // top-floor base
  for (const s of rectSides(159, 28, 176, 42).filter((s) => s.out[1] === 1 || s.out[0] === 1)) {
    for (let t = s.a + 1; t < s.b; t++)
      for (let y = yb + 1; y <= yb + 3; y++) put(w, s, t, 0, y, null), put(w, s, t, -1, y, null), put(w, s, t, -2, y, K.void);
    for (let t = s.a + 1; t < s.b; t++) put(w, s, t, 0, yb, K.brick);
    const f = face(w, s);
    for (let t = s.a + 3; t < s.b - 1; t += 3) f(t + 0.35, yb + 1, -0.6, 0.3, 3, 0.3, K.frame[0]);
    f(s.a + 1, yb + 1.35, -0.15, s.b - s.a - 1, 0.14, 0.14, K.frame[1]);
    for (let u = s.a + 1.2; u < s.b - 0.1; u += 0.4) f(u, yb + 1, -0.12, 0.09, 0.35, 0.09, K.frame[1]);
  }
  C.skirt(w, 159, 28, 176, 42, xTop - 1, { o: 2, sides: rectSides(159, 28, 176, 42).filter((s) => s.out[0] !== -1) });
  w.box(159, xTop, 28, 176, xTop, 42, [0x8f8a81, 0x948f86]);
  for (const s of rectSides(159, 28, 176, 42)) for (let t = s.a; t <= s.b; t++) put(w, s, t, 0, xTop + 1, K.brick), put(w, s, t, 0, xTop + 2, K.band);
  C.lettering(w, rectSides(159, 28, 176, 42)[0], 167.5, xTop + 1.15, 'KHWOPA ENGINEERING COLLEGE', 0.165, 0xf1ead8, 0.05);

  // ---- south-west --------------------------------------------------------------------------------
  // Block F&G: five storeys with three dormers, lower south range, west wing to the plaza, east wing.
  guardhouse(w, 21, G, 67);
  const fW = C.block(w, 23, G, 72, 34, 88, { floors: 4, skirts: [1], blank: [[0, 1]] });
  C.roof(w, 23, fW, 72, 34, 88);
  const fTop = C.block(w, 26, G, 89, 61, 104, { floors: 5, skirts: [0, 3] });
  C.roof(w, 26, fTop, 89, 61, 104, { kind: 'gable', ridge: 'x' });
  for (const x of [39, 46, 53]) dormer(w, x, fTop, 89);
  const fS = C.block(w, 27, G, 105, 60, 112, { floors: 3, blank: [[0, -1]] });
  C.roof(w, 27, fS, 105, 60, 112);
  const fE = C.block(w, 62, G, 89, 72, 112, { floors: 4, skirts: [1], blank: [[-1, 0]] });
  C.roof(w, 62, fE, 89, 72, 112);
  C.porch(w, rectSides(26, 89, 61, 104)[1], 44, 5, 3, G, { emblem: false, steps: 1 });
  pavilion(w, 51, G, 73, 63, 84);
  // the cafeteria along the slanted west wall
  const kTop = C.block(w, 9, G, 82, 16, 108, { floors: 2, win: 3, pier: 4 });
  C.roof(w, 9, kTop, 82, 16, 108, { kind: 'gable', ridge: 'z', tiles: C.TILES_NEW });

  // ---- garden and fountain ---------------------------------------------------------------------------
  C.disc(w, 98, 57, 0, 4.5, G - 1, K.water);
  C.disc(w, 98, 57, 3.6, 4.5, G, K.tileRed);
  w.box(97, G - 1, 56, 98, G, 57, K.tileRed);
  w.box(96, G, 55, 99, G, 58, K.tileRed);
  w.box(96, G + 1, 55, 99, G + 1, 58, [0x3f6f9a, 0x46789f]);
  w.box(97, G + 2, 56, 98, G + 3, 57, K.tileRed);
  w.box(97, G + 4, 56, 98, G + 4, 57, [0x3f6f9a]);
  w.detailC(98, G + 5, 57, 1, 0.8, 1, K.tileRed[0]);
  w.detailC(98, G + 5.8, 57, 0.4, 0.5, 0.4, 0x9fc4d6);

  for (const [x0, x1] of [[77, 94], [101, 119]]) {
    C.hedge(w, x0, 29, x1, 29, G);
    C.hedge(w, x0, 50, x1, 50, G);
    C.hedge(w, x0, 29, x0, 50, G);
    C.hedge(w, x1, 29, x1, 50, G);
  }
  for (const z of [38, 39, 40]) for (const x of [77, 94, 101, 119]) w.set(x, G, z, null);
  for (let z = 32; z <= 47; z += 5) C.cypress(w, 92, G, z, 6, z), C.cypress(w, 103, G, z, 6, z + 1);
  C.hedge(w, 106, 33, 115, 34, G, 1, K.hedgeG);
  C.hedge(w, 106, 45, 115, 46, G, 1, K.hedgeG);
  C.shrub(w, 110, G, 40, 2, K.hedgeG, 3);
  C.shrub(w, 81, G, 33, 1, K.hedgeG, 4);
  C.shrub(w, 82, G, 46, 1, K.hedgeG, 5);
  tree(w, 85, G, 39, { r: 5, trunk: 7, seed: 21 });
  lines(w, 67, 33, 75, 49, G);
  w.detail(67, G + 2.3, 40.9, 8, 0.5, 0.06, 0xe8e4da);
  w.detail(66.9, G, 40.9, 0.15, 2.8, 0.15, 0x3c3f44);
  w.detail(75, G, 40.9, 0.15, 2.8, 0.15, 0x3c3f44);
  C.araucaria(w, 117, G, 52, 24, 1);

  // ---- roads, planting, props ---------------------------------------------------------------------
  // the west road: a line of trees on its south side, the small bike park behind
  for (let x = 36; x <= 64; x += 4) C.cypress(w, x, G, 63, 6 + (x % 3), x);
  for (const z of [66.5, 69]) C.bikes(w, 40, 63, G, z, z * 3);
  C.araucaria(w, 43, G, 75, 18, 3);
  // the grove between the bike park and the south road (dense canopy in the satellite view)
  for (const [x, z, r] of [[73, 68, 5], [84, 66, 4], [79, 78, 5], [88, 77, 4], [76, 86, 4]]) tree(w, x, G, z, { r, trunk: 7, seed: x * z });
  C.araucaria(w, 68, G, 78, 20, 5);
  // the south road: bike rows either side, the main parking with cars and buses
  C.bikes(w, 66, 86, G, 91.3, 1, true);
  C.bikes(w, 66, 106, G, 101.6, 2, true);
  for (let z = 88; z <= 103; z += 2.5) C.bikes(w, 90.5, 94.5, G, z, z);
  for (const [x, z, c] of [[105, 86, 0xe9e6de], [111, 86, 0xc23b2e], [117, 86, 0x3a3f46], [105, 90, 0x7e8a96], [117, 90, 0xe9e6de], [111, 90, 0x2e5f87]]) C.car(w, x, G, z, c);
  C.bus(w, 105, G, 95, 13, true);
  C.bus(w, 105, G, 101, 13, true, true);
  // along the east road: cars, a cypress row before the field, buses in the vehicle bay
  for (let x = 108; x <= 146; x += 6) C.car(w, x, G, 59, [0xe9e6de, 0xc23b2e, 0x3a3f46, 0x7e8a96, 0x2e5f87][(x / 6) % 5 | 0]);
  for (let x = 108; x <= 160; x += 5) C.cypress(w, x, G, 62, 6, x);
  C.bus(w, 165, G, 66, 12, false);
  C.bus(w, 170, G, 66, 12, false);
  // the field: thuja along its edges and dotted over the grass, as in the aerial
  for (let z = 65; z <= 79; z += 4) C.cypress(w, 108, G, z, 6, z + 50);
  for (let x = 112; x <= 160; x += 6) C.cypress(w, x, G, 79, 5 + (x % 2), x + 9);
  for (const [x, z] of [[118, 68], [128, 72], [136, 67], [146, 73], [154, 68], [176, 51], [176, 60], [176, 70]]) C.cypress(w, x, G, z, 6 + ((x + z) % 3), x * z);
  for (const [x, z] of [[123, 66], [141, 70], [151, 76]]) C.shrub(w, x, G, z, 1, K.hedgeG, x + z);
  // basketball court with its cage; football court with goals and trees round the south and east
  lines(w, 74, 88, 88, 110, G);
  w.detail(74, G, 98.9, 14, 0.03, 0.18, 0xeeeae0);
  hoop(w, 81, G, 87.3, 1);
  hoop(w, 81, G, 110.4, -1);
  fence(w, 73, 87, 89, 87, G), fence(w, 73, 111.6, 89, 111.6, G), fence(w, 89.6, 87, 89.6, 111.6, G);
  lines(w, 127, 84, 174, 110, G);
  w.detail(150.4, G, 84, 0.18, 0.03, 26, 0xeeeae0);
  goal(w, 127, G, 97, -1.3);
  goal(w, 173.8, G, 97, 1.3);
  fence(w, 124, 82, 177, 82, G);
  for (let x = 127; x <= 175; x += 4) C.cypress(w, x, G, 112, 6 + (x % 3), x);
  for (let z = 86; z <= 108; z += 4) C.cypress(w, 176, G, z, 6 + (z % 3), z);
  // solar street lamps
  for (const [x, z] of [[64, 28], [64, 50], [88, 52], [108, 52], [94, 70], [94, 84], [101, 72], [101, 90], [101, 106], [120, 53], [138, 53], [40, 56], [24, 56]]) C.lamp(w, x, G, z);

  // compound wall on the slanted west line, with the two gates
  const wall = (x0, z0, x1, z1) => (w.box(x0, G, z0, x1, G + 1, z1, K.brick), w.box(x0, G + 2, z0, x1, G + 2, z1, K.band));
  for (let z = 1; z < D - 1; z++) if (z < 48 || z > 71) wall(wallX(z), z, wallX(z), z);
  wall(wallX(1), 1, W - 2, 1);
  wall(W - 2, 1, W - 2, D - 2);
  for (let x = wallX(D - 2); x < W - 1; x++) if (x < 85 || x > 110) wall(x, D - 2, x, D - 2);
  gate(w, 53, G, 13, { alongZ: true, text: 'KHWOPA ENGINEERING COLLEGE', leaf: { c: 0x97482f, rail: 0x6f3420, disc: 0x7a3a24 } });
  gate(w, 91, G, D - 3, { text: 'KHWOPA COLLEGE OF ENGINEERING', leaf: { c: 0xe4dfd1, rail: 0xc9c3b3, disc: 0x2a2a2c } });

  // students
  C.students(w, 89, 48, 108, 67, 14, G, 1);
  C.students(w, 95, 27, 100, 47, 5, G, 2);
  C.students(w, 74, 88, 88, 110, 8, G, 3);
  C.students(w, 128, 85, 172, 109, 12, G, 4);
  C.students(w, 36, 72, 50, 88, 7, G, 5);
  C.students(w, 61, 26, 64, 56, 5, G, 6);
  C.students(w, 66, 32, 76, 50, 4, G, 7);
  C.students(w, 70, 56, 88, 61, 5, G, 8);
  C.students(w, 120, 52, 160, 57, 5, G, 9);
  return w;
}
