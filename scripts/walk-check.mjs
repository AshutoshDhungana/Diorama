// Collision self-check: node scripts/walk-check.mjs
import assert from 'node:assert/strict';
import { buildDiorama, W, D, G } from '../src/layout.js';
import { solidGrid, makeBody, walk, hits, RADIUS } from '../src/collision.js';

const solid = solidGrid(buildDiorama());
const dt = 1 / 60;

// spawn stands on the paving
const b = makeBody(solid, 46.5, G, 70.5);
assert.equal(b.y, G);

// Nyatapola: walking north from the forecourt climbs the stair to the top terrace and stops at the temple
const n = makeBody(solid, 52.5, G, 42.5);
for (let i = 0; i < 600; i++) walk(solid, n, 0, -0.1, dt);
assert.equal(n.y, G + 15, `stair top, got y=${n.y}`);
assert.ok(n.z > 26, 'stopped by the temple, not through it');

// fuzz: a long random walk never ends inside geometry or off the platform
let s = 1;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
let a = 0;
for (let i = 0; i < 40000; i++) {
  if (i % 40 === 0) a = rnd() * Math.PI * 2;
  walk(solid, b, Math.cos(a) * 0.12, Math.sin(a) * 0.12, dt);
  assert.ok(!hits(solid, b.x, b.y, b.z), `inside geometry at ${b.x},${b.y},${b.z}`);
  assert.ok(b.x >= RADIUS && b.z >= RADIUS && b.x <= W - RADIUS && b.z <= D - RADIUS && b.y >= 1, 'left the platform');
}
console.log('walk-check ok; fuzz ended at', b.x.toFixed(1), b.y.toFixed(1), b.z.toFixed(1));

// Khwopa campus: spawn on the fountain plaza, and the same fuzz never ends inside geometry
const K = await import('../src/khwopa.js');
const ks = solidGrid(K.buildDiorama());
const kb = makeBody(ks, K.START[0], K.G, K.START[1]);
assert.equal(kb.y, K.G);
for (let i = 0; i < 40000; i++) {
  if (i % 40 === 0) a = rnd() * Math.PI * 2;
  walk(ks, kb, Math.cos(a) * 0.12, Math.sin(a) * 0.12, dt);
  assert.ok(!hits(ks, kb.x, kb.y, kb.z), `campus: inside geometry at ${kb.x},${kb.y},${kb.z}`);
}
console.log('campus walk-check ok; fuzz ended at', kb.x.toFixed(1), kb.y.toFixed(1), kb.z.toFixed(1));
