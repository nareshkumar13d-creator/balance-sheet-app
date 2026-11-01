/* Shared test helpers: opens app/index.html in a real browser engine (installed Edge / Chrome, or Playwright's Chromium). */
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright-core');

const APP = path.join(__dirname, '..', 'app', 'index.html');
const FORMATS = { v: 'Vertical', h: 'Horizontal', a: 'Annexure' };

async function launch() {
  const tries = process.env.BS_BROWSER ? [{ channel: process.env.BS_BROWSER }] : [{ channel: 'msedge' }, { channel: 'chrome' }, {}];
  let last;
  for (const o of tries) { try { return await chromium.launch(o); } catch (e) { last = e; } }
  throw new Error('No browser found. Install Edge or Chrome, or set BS_BROWSER (msedge / chrome). ' + (last && last.message));
}

/* Opens the app in the given format and returns helpers to talk to the format's window.bsApi */
async function openApp(browser, fmt, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  if (!opts.tour) await page.addInitScript(() => { try { localStorage.setItem('bsTour', '1'); } catch (e) { /* ignore */ } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) problems.push(m.text().slice(0, 200)); });
  await page.goto(pathToFileURL(APP).href);
  await page.click('#b_' + fmt);
  const handle = await page.waitForSelector('#f_' + fmt);
  const frame = await handle.contentFrame();
  await frame.waitForFunction(() => !!window.bsApi);
  return {
    page, frame, problems,
    api: (fn, arg) => frame.evaluate(fn, arg),
    load: (obj) => frame.evaluate((o) => new Promise((res) => { window.bsApi.load(o, 'test.bsdata', true, () => res(true)); setTimeout(() => res(false), 3000); }), obj),
    get: () => frame.evaluate(() => window.bsApi.get()),
    check: () => frame.evaluate(() => window.bsApi.check()),
    totals: () => frame.evaluate(() => window.bsApi.totals()),
    paneText: (labelRe) => frame.evaluate((re) => {
      const b = [...document.querySelectorAll('#tabs button')].find((x) => new RegExp(re).test(x.textContent.trim()));
      b.click(); return document.querySelector('.pn.on').innerText;
    }, labelRe)
  };
}
module.exports = { launch, openApp, FORMATS, APP };
