// Render the diorama headlessly and save a PNG.  node scripts/shot.mjs [out.png] [query] [WxH]
import { createServer } from 'vite';
import { chromium } from 'playwright';

const [out = 'shots/shot.png', query = '', size = '1600x1200'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.goto(`http://localhost:5199/?${query}`);
  const failed = new Promise((_, rej) => page.on('pageerror', rej));
  await Promise.race([page.waitForFunction(() => window.__ready, null, { timeout: 120000 }), failed]);
  await page.screenshot({ path: out, timeout: 300000 }); // software GL is slow at 2x sizes
  console.log('saved', out);
} finally {
  await browser.close();
  await server.close();
}
