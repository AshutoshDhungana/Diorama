// Drive the explorer headlessly with real key/mouse input, assert on its state, save shots/x_*.png.
// node scripts/explore-check.mjs
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://localhost:5198/');
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  const st = () => page.evaluate(() => window.__explore.state);
  const until = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
  const shot = (n) => page.screenshot({ path: `shots/x_${n}.png` });
  const G = 12;

  const s0 = await st();
  assert.equal(s0.y, G);
  await shot('iso');

  // diorama view: W walks up the screen; stopping keeps position
  await page.keyboard.down('w');
  await until((x) => Math.hypot(window.__explore.state.x - x[0], window.__explore.state.z - x[1]) > 6, [s0.x, s0.z]);
  await page.keyboard.up('w');
  const s1 = await st();
  assert.ok(s1.x < s0.x && s1.z < s0.z, 'W moves toward the back of the screen');
  console.log('iso walk ok', s1.x.toFixed(1), s1.z.toFixed(1), 'place:', s1.place);

  // zoomed in, the camera follows the explorer
  await page.mouse.move(700, 500);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -300);
  await page.waitForTimeout(2500);
  await shot('iso_zoom');

  // first person in front of Nyatapola's stair, then walk up it
  await page.evaluate(() => Object.assign(window.__explore.body, { x: 52.5, z: 51.5 }));
  await page.keyboard.press('v');
  await page.waitForTimeout(500);
  await shot('blend');
  await until(() => window.__explore.state.s === 1);
  await page.evaluate(() => window.__explore.look(0, 0.05));
  await page.waitForTimeout(400);
  await shot('fp_stair');
  await page.keyboard.down('w');
  await until((g) => window.__explore.state.y === g + 15, G);
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  const s2 = await st();
  assert.equal(s2.y, G + 15);
  assert.ok(s2.z > 26, 'stopped at the temple');
  assert.equal(s2.place, 'Nyatapola');
  await page.evaluate(() => window.__explore.look(Math.PI, -0.25));
  await page.waitForTimeout(400);
  await shot('fp_top'); // from the top terrace, back down the stair over the square
  await page.evaluate(() => Object.assign(window.__explore.body, { x: 46.5, y: 12, z: 60.5 }));
  await page.evaluate(() => window.__explore.look(0.25, 0.42));
  await page.waitForTimeout(1500);
  await shot('fp_lookup'); // from the forecourt up at the pagoda roofs

  // switch back while moving, then rotate the platform and reset the framing
  await page.keyboard.down('s');
  await page.keyboard.press('v');
  await until(() => window.__explore.state.s === 0);
  await page.keyboard.up('s');
  const s3 = await st();
  assert.ok(s3.z > s2.z, 'kept walking through the switch');
  await shot('back_iso');
  await page.keyboard.down('q');
  await until((a) => Math.abs(window.__explore.state.az - a) > 1.2, s3.az);
  await page.keyboard.up('q');
  await shot('rotated');
  await page.keyboard.press('h');
  await until(() => Math.abs(window.__explore.state.zoom - 1) < 1e-6 && Math.abs(window.__explore.state.az - 0.698) < 0.01);
  await page.waitForTimeout(3000);
  await shot('reset');

  // changing your mind mid-blend reverses smoothly from where it is
  await page.keyboard.press('v');
  await until(() => window.__explore.state.s > 0.2);
  await page.keyboard.press('v');
  await until(() => window.__explore.state.s === 0 && !window.__explore.state.wantFp);

  // click-to-walk: a click on open paving sends the explorer there
  const before = await st();
  await page.mouse.click(820, 700);
  assert.ok((await st()).dest, 'click set a destination');
  await until(() => !window.__explore.state.dest);
  const s4 = await st();
  assert.ok(Math.hypot(s4.x - before.x, s4.z - before.z) > 3, 'click walked');
  console.log('click walk ok ->', s4.x.toFixed(1), s4.z.toFixed(1));
  await shot('click');
  assert.deepEqual(errors, []);
  console.log('explore-check ok');
} finally {
  await browser.close();
  await server.close();
}
