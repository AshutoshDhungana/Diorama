// Collision for the explorer, read straight from the voxel grid (units are voxels, y = feet).
// Sub-voxel props — people, statues, stall tables, pots — are rasterised coarsely into the same grid
// so they block too; thin trims, posts and canopies stay passable.
export const RADIUS = 0.3, HEIGHT = 3.4;

export function solidGrid(world) {
  const { w, h, d, data } = world;
  const s = new Uint8Array(data.length);
  for (let i = 0; i < s.length; i++) if (data[i]) s[i] = 1;
  // cells a detail box covers by at least a third along an axis
  const span = (a, n, lim) => {
    const r = [];
    for (let i = Math.max(0, Math.floor(a)); i < Math.min(lim, a + n); i++)
      if (Math.min(a + n, i + 1) - Math.max(a, i) >= 0.35) r.push(i);
    return r;
  };
  for (const [x, y, z, sx, sy, sz] of world.details)
    for (const cy of span(y, sy, h)) for (const cz of span(z, sz, d)) for (const cx of span(x, sx, w)) s[cx + w * (cz + d * cy)] = 1;
  // beyond the platform footprint is an invisible wall; below the ground is solid
  return (x, y, z) => x < 0 || z < 0 || y < 0 || x >= w || z >= d || (y < h && s[x + w * (z + d * y)] === 1);
}

export function hits(solid, x, y, z) {
  for (let cy = Math.floor(y + 0.01); cy <= Math.floor(y + HEIGHT - 0.01); cy++)
    for (let cz = Math.floor(z - RADIUS); cz <= Math.floor(z + RADIUS); cz++)
      for (let cx = Math.floor(x - RADIUS); cx <= Math.floor(x + RADIUS); cx++) if (solid(cx, cy, cz)) return true;
  return false;
}

export function makeBody(solid, x, y, z) {
  const b = { x, y, z, vy: 0, grounded: true };
  while (hits(solid, b.x, b.y, b.z)) b.y++; // never start inside geometry
  return b;
}

function tryMove(solid, b, nx, nz) {
  if (!hits(solid, nx, b.y, nz)) return void Object.assign(b, { x: nx, z: nz });
  // climb a single-voxel rise (stair treads, kerbs, low copings) — never a wall or a 2-voxel plinth
  if (b.grounded && !hits(solid, b.x, b.y + 1, b.z) && !hits(solid, nx, b.y + 1, nz)) Object.assign(b, { x: nx, z: nz, y: b.y + 1 });
}

// Walk by (dx, dz): slide along walls axis by axis, step up single voxels, settle down single steps
// (so stairs descend without hopping), otherwise fall under gravity onto whatever is below.
export function walk(solid, b, dx, dz, dt) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2)); // sub-steps: no tunnelling
  for (let i = 0; i < n; i++) {
    tryMove(solid, b, b.x + dx / n, b.z);
    tryMove(solid, b, b.x, b.z + dz / n);
  }
  if (hits(solid, b.x, b.y - 0.05, b.z)) return void Object.assign(b, { grounded: true, vy: 0 });
  if (b.grounded && hits(solid, b.x, b.y - 1.05, b.z)) return void (b.y -= 1);
  b.grounded = false;
  b.vy = Math.max(b.vy - 60 * dt, -40);
  const ny = b.y + Math.max(b.vy * dt, -0.9);
  if (hits(solid, b.x, ny, b.z)) Object.assign(b, { y: Math.floor(ny) + 1, vy: 0, grounded: true });
  else b.y = ny;
}
