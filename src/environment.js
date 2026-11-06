// Platform, paving, water, vegetation and the small traces of everyday life.
import { P, pick } from './palette.js';
import { hash } from './voxels.js';

// Basket-weave brick paving (2x1 pavers alternating direction per 2x2 cell).
export function paveMat(x, z) {
  const horiz = ((x >> 1) + (z >> 1)) % 2 === 0;
  return pick(P.pave, horiz ? hash(x >> 1, 1, z, 3) : hash(x, 2, z >> 1, 3));
}

// The diorama base: paved top, kerb, brick retaining wall, stone course, earth.
// inside(x, z) shapes the footprint (default: the full W × D rectangle).
export function platform(w, W, D, G, inside = () => true) {
  const ins = (x, z) => x >= 0 && z >= 0 && x < W && z < D && inside(x, z);
  for (let z = 0; z < D; z++)
    for (let x = 0; x < W; x++) {
      if (!ins(x, z)) continue;
      const edge = !ins(x - 1, z) || !ins(x + 1, z) || !ins(x, z - 1) || !ins(x, z + 1);
      for (let y = 0; y < G; y++) {
        let m;
        if (y === G - 1) m = edge ? P.stoneDark : paveMat(x, z);
        else if (y >= G - 6) m = edge ? (y === G - 6 ? P.stone : P.brickOld) : P.earth;
        else if (y === G - 7) m = P.stoneDark;
        else m = y < 2 ? P.earthDark : P.earth;
        w.set(x, y, z, m);
      }
    }
}

// Re-pave an area with large stone slabs (temple forecourts).
export function stonePaving(w, x0, z0, x1, z1, G) {
  for (let z = z0; z <= z1; z++)
    for (let x = x0; x <= x1; x++) if (w.get(x, G - 1, z)) w.set(x, G - 1, z, pick(P.stone, hash(x >> 1, 9, z >> 1)));
}

// Stair cut into the +z face of the platform, descending in +x from the top down to the ground.
export function sideStair(w, x0, D, G) {
  for (let i = 0; i < G; i++) {
    const x = x0 + i, top = G - 1 - i;
    for (let z = D - 3; z < D; z++) {
      for (let y = top + 1; y < G; y++) w.set(x, y, z, null);
      w.set(x, top, z, P.stone);
    }
  }
  for (let x = x0; x < x0 + G; x++) w.set(x, G, D - 4, P.stoneDark);
  w.box(x0 + G, 0, D - 3, x0 + G, G, D - 1, P.stoneDark);
}

// Dhunge dhara: sunken stone water conduit with steps down and spouts in the back wall.
export function dhara(w, x0, z0, sx, sz, depth, G) {
  const x1 = x0 + sx - 1, z1 = z0 + sz - 1, yb = G - 1 - depth;
  for (let z = z0 - 1; z <= z1 + 1; z++)
    for (let x = x0 - 1; x <= x1 + 1; x++)
      for (let y = yb; y < G; y++) {
        const wall = x < x0 || x > x1 || z < z0 || z > z1;
        w.set(x, y, z, wall ? P.stoneDark : y === yb ? P.stone : null);
      }
  for (let x = x0; x <= x1; x++) for (let z = z0; z < z0 + 2; z++) w.set(x, yb, z, P.water);
  for (let i = 0; i < depth; i++) w.box(x1 - 3, yb + 1, z1 - i, x1, G - 2 - i, z1 - i, P.stone);
  for (const s of [Math.floor(x0 + sx * 0.25), Math.floor(x0 + sx * 0.55)]) {
    w.detail(s + 0.2, yb + 2.2, z0 - 0.1, 0.6, 0.7, 0.9, P.stoneDark[0]);
    w.detail(s + 0.35, yb + 2.4, z0 + 0.7, 0.3, 0.25, 0.6, P.gold[1]);
    w.detail(s + 0.42, yb + 1, z0 + 1.15, 0.16, 1.45, 0.16, 0x9fc4c6);
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    w.set(x, G, z0 - 1, P.stoneDark);
    if (x < x1 - 3) w.set(x, G, z1 + 1, P.stoneDark);
  }
  for (let z = z0; z <= z1; z++) w.set(x0 - 1, G, z, P.stoneDark), w.set(x1 + 1, G, z, P.stoneDark);
}

// Blocky tree: trunk plus a canopy of 2x2x2 leaf chunks with a darker underside.
export function tree(w, x, g, z, { r = 4, trunk = 6, seed = 0 } = {}) {
  const t2 = r >= 6;
  w.box(x, g, z, x + (t2 ? 1 : 0), g + trunk, z + (t2 ? 1 : 0), P.trunk);
  const cy = g + trunk + Math.round(r * 0.4);
  const n = Math.ceil(r / 2) + 1;
  for (let k = -n; k <= n; k++)
    for (let j = -n; j <= n; j++)
      for (let i = -n; i <= n; i++) {
        const d = (i * i * 4) / (r * r) + (k * k * 4) / (r * r * 0.6) + (j * j * 4) / (r * r);
        const rr = hash(i, k, j, seed);
        if (d + (rr - 0.5) * 0.55 > 1) continue;
        const m = k * 2 < -r * 0.3 ? pick(P.leafDark, rr) : k * 2 > r * 0.4 && rr < 0.5 ? P.leaf[2] : pick(P.leaf, rr);
        w.box(x + i * 2, cy + k * 2, z + j * 2, x + i * 2 + 1, cy + k * 2 + 1, z + j * 2 + 1, m);
      }
}

// Chautara: stepped resting platform around a pipal tree.
export function chautara(w, x, g, z, seed, r = 7) {
  w.box(x - 4, g, z - 4, x + 5, g, z + 5, P.stoneDark);
  w.box(x - 3, g + 1, z - 3, x + 4, g + 1, z + 4, P.brickOld);
  w.box(x - 3, g + 1, z - 3, x + 4, g + 1, z - 3, P.stone);
  tree(w, x, g + 2, z, { r, trunk: 7, seed });
}

// Tiny townsperson. Women in haku patasi (black sari with red border), men in daura-suruwal or modern dress.
export function person(w, x, y, z, seed = 0) {
  const r = (i) => hash(seed, i, 11, 5);
  const rot = r(9) < 0.5;
  const b = (dx, dy, dz, sx, sy, sz, c) =>
    rot ? w.detailC(x + dz, y + dy, z + dx, sz, sy, sx, c) : w.detailC(x + dx, y + dy, z + dz, sx, sy, sz, c);
  const skin = pick(P.skin, r(1));
  if (r(0) < 0.45) {
    b(0, 0, 0, 0.9, 1.7, 0.7, 0x221c1c);
    b(0, 0.02, 0, 0.94, 0.22, 0.74, 0xa02c25);
    b(0, 1.7, 0, 0.82, 1.0, 0.55, pick([0xc4612f, 0x6d3f7d, 0x2e5f87, 0xd6a03a, 0xb83a2e], r(3)));
    b(0, 2.7, 0, 0.62, 0.62, 0.62, skin);
    b(0, 3.2, -0.02, 0.66, 0.18, 0.68, 0x17120f);
    b(0, 2.9, -0.4, 0.32, 0.32, 0.18, 0x17120f);
  } else {
    const trad = r(2) < 0.5;
    const legs = trad ? 0xd6ccb4 : pick([0x2f3b52, 0x3a3a3a, 0x4a4036], r(4));
    const shirt = trad ? 0xe2d9c4 : pick([0xb83a2e, 0x2e5f87, 0x3d7a52, 0xd6a03a, 0xe6dccb], r(5));
    b(-0.2, 0, 0, 0.32, 1.5, 0.4, legs);
    b(0.2, 0, 0, 0.32, 1.5, 0.4, legs);
    b(0, 1.5, 0, 0.85, 1.25, 0.5, shirt);
    if (trad) b(0, 1.55, 0, 0.88, 0.9, 0.53, 0x2d2a33);
    b(-0.54, 1.6, 0, 0.22, 1.1, 0.36, shirt);
    b(0.54, 1.6, 0, 0.22, 1.1, 0.36, shirt);
    b(0, 2.75, 0, 0.62, 0.62, 0.62, skin);
    if (r(3) < 0.6) b(0, 3.37, 0, 0.64, 0.32, 0.64, pick([0x7a1f2b, 0x2d2a4a, 0x1e1e1e, 0x5a3a7a], r(6)));
    else b(0, 3.3, 0, 0.66, 0.15, 0.66, 0x17120f);
  }
}

// A crowd scattered over a rectangle, skipping occupied ground.
export function crowd(w, x0, z0, x1, z1, n, g, seed) {
  for (let i = 0, placed = 0; i < n * 6 && placed < n; i++) {
    const x = x0 + hash(i, seed, 1) * (x1 - x0), z = z0 + hash(i, seed, 2) * (z1 - z0);
    if (w.get(Math.floor(x), g, Math.floor(z)) || w.get(Math.floor(x), g + 2, Math.floor(z))) continue;
    person(w, x, g, z, seed * 100 + i);
    placed++;
  }
}

// Market stall: timber posts, a table of goods and a striped cloth canopy. (x, z) is the min corner.
export function stall(w, x, y, z, sx, sz, seed) {
  const cloth = pick([0xb8352b, 0x2e5f87, 0xc98a2a, 0x3d7a52], hash(seed, 0, 0, 3));
  for (const [px, pz] of [[0, 0], [sx, 0], [0, sz], [sx, sz]]) w.detail(x + px - 0.1, y, z + pz - 0.1, 0.2, 3.3, 0.2, P.woodMid[0]);
  w.detail(x + 0.15, y + 1.1, z + 0.15, sx - 0.3, 0.25, sz - 0.3, P.woodMid[1]);
  w.detail(x + 0.3, y, z + 0.3, sx - 0.6, 1.1, sz - 0.6, P.wood[0]);
  const goods = [0x6f9a3a, 0xc23b2e, 0xe88a1e, 0xa0603c, 0xe6c34a, 0x8a3a6a, 0xe6dccb];
  for (let gx = 0; gx < Math.floor(sx / 0.7); gx++)
    for (let gz = 0; gz < Math.floor(sz / 0.7) - 1; gz++) {
      const r = hash(seed, gx, gz, 6);
      w.detail(x + 0.35 + gx * 0.7, y + 1.35, z + 0.4 + gz * 0.7, 0.55, 0.25 + r * 0.3, 0.55, pick(goods, r));
    }
  const n = Math.round(sx / 0.5);
  for (let i = 0; i < n; i++) w.detail(x - 0.3 + (i * (sx + 0.6)) / n, y + 3.3, z - 0.4, (sx + 0.6) / n, 0.16, sz + 0.8, i % 2 ? 0xe9dfcc : cloth);
}

// Bhaktapur's pottery: rows of drying clay pots, with a potter's wheel.
export function pottery(w, x0, y, z0, nx, nz, seed) {
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const r = hash(i, j, seed, 8);
      if (j % 3 === 2 || r < 0.08) continue; // aisles every third row keep the yard ordered
      const s = 0.7 + r * 0.15, px = x0 + i * 1.15 + 0.5, pz = z0 + j * 1.15 + 0.5;
      w.detailC(px, y, pz, s, s * 0.85, s, pick(P.clay, r));
      w.detailC(px, y + s * 0.85, pz, s * 0.6, 0.14, s * 0.6, 0x6e3a22);
    }
}
export function potterWheel(w, x, y, z, seed) {
  w.detailC(x, y, z, 1.4, 0.35, 1.4, 0x3b2a20);
  w.detailC(x, y + 0.35, z, 0.6, 0.45, 0.6, P.clay[0]);
  person(w, x, y, z - 1.3, seed);
}

// Little potted plants (sub-voxel), common on steps and window sills.
export function plant(w, x, y, z, seed) {
  const r = hash(seed, 3, 7);
  w.detailC(x, y, z, 0.55, 0.5, 0.55, pick(P.clay, r));
  w.detailC(x, y + 0.5, z, 0.8, 0.7, 0.8, pick(P.leaf, r));
  if (r < 0.4) w.detailC(x, y + 1.2, z, 0.3, 0.2, 0.3, 0xe88a1e);
}

// Festive bunting strung between two points, sagging in the middle.
export function bunting(w, a, b, n, sag = 2) {
  const cols = [0xb8352b, 0xd6a03a, 0x2e5f87, 0x3d7a52, 0xe6dccb];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), z = a[2] + (b[2] - a[2]) * t;
    w.detailC(x, y - 0.55, z, 0.38, 0.5, 0.38, cols[i % cols.length]);
    w.detailC(x, y - 0.05, z, 0.5, 0.06, 0.5, 0x3a2a20);
  }
}

// Wayside stone shrine (e.g. a Ganesh shrine) daubed with vermilion.
export function wayShrine(w, x, g, z) {
  w.box(x - 1, g, z - 1, x + 1, g, z + 1, P.stoneDark);
  w.box(x - 1, g + 1, z - 1, x + 1, g + 2, z + 1, P.stone);
  w.set(x, g + 1, z + 1, 0xa8322a);
  w.box(x - 1, g + 3, z - 1, x + 1, g + 3, z + 1, P.stoneDark);
  w.set(x, g + 4, z, P.stone);
  w.detailC(x + 0.5, g + 5, z + 0.5, 0.3, 0.6, 0.3, P.gold[0]);
}

// Grass on the platform rim, in a few patches rather than scattered single cubes.
export function overgrowth(w, W, D, G) {
  const rim = [];
  for (let x = 0; x < W; x++) rim.push([x, 0], [x, D - 1]);
  for (let z = 1; z < D - 1; z++) rim.push([0, z], [W - 1, z]);
  for (const [x, z] of rim) {
    if (!w.get(x, G - 1, z) || w.get(x, G, z)) continue;
    if (hash(x >> 3, z >> 3, 5, 1) < 0.3 && hash(x, z, 6) < 0.6) w.set(x, G, z, P.grass);
  }
}
