/* Automated checks:  npm test
 * They open the real app in a browser engine (Edge / Chrome that is already on the PC) and use the sample data files in tests/fixtures.
 * Purpose: a new version must not break old data files, the totals, or the Balance Sheet tally. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { launch, openApp, FORMATS } = require('./helpers');

const FX = path.join(__dirname, 'fixtures');
const fx = (n) => JSON.parse(fs.readFileSync(path.join(FX, n + '.json'), 'utf8'));
const expected = fx('expected');
let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { if (browser) await browser.close(); });

test('app/index.html and web/ file are up to date with src/', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'build.js'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || 'run: node build.js');
});

test('desktop page has a Content-Security-Policy and uses local libraries only', () => {
  const kit = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8');
  assert.match(kit, /http-equiv="Content-Security-Policy"/);
  assert.match(kit, /object-src 'none'/);
  assert.equal(kit.includes('cdn.jsdelivr.net'), false, 'desktop app must not load libraries from the internet');
  assert.equal((kit.match(/<script src=\\"xlsx\.bundle\.js\\">/g) || []).length, 3, 'all three formats need the local Excel library');
});

for (const fmt of Object.keys(FORMATS)) {
  const name = FORMATS[fmt];

  test(`${name}: balanced sample loads, tallies and gives the expected totals`, async () => {
    const app = await openApp(browser, fmt);
    assert.equal(await app.load(fx(fmt + '_balanced')), true, 'file did not load');
    const t = await app.totals();
    assert.deepEqual(t, expected[fmt].totals);
    t.forEach((c) => assert.equal(c.l, c.a, 'liabilities and assets differ'));
    assert.deepEqual((await app.check()).filter((x) => x.lv === 'e'), [], 'unexpected error');
    assert.deepEqual(app.problems, []);
    await app.page.close();
  });

  test(`${name}: unbalanced sample is reported`, async () => {
    const app = await openApp(browser, fmt);
    await app.load(fx(fmt + '_unbalanced'));
    const errs = (await app.check()).filter((x) => x.lv === 'e');
    assert.equal(errs.length, 1);
    assert.match(errs[0].t, /not balanced/);
    await app.page.close();
  });

  test(`${name}: save -> load -> save gives identical data`, async () => {
    const a = await openApp(browser, fmt);
    await a.load(fx(fmt + '_balanced'));
    const first = await a.get();
    const b = await openApp(browser, fmt);
    await b.load(JSON.parse(JSON.stringify(first)));
    assert.deepEqual(await b.get(), first);
    assert.deepEqual(await b.totals(), expected[fmt].totals);
    await a.page.close(); await b.page.close();
  });

  test(`${name}: old data file (before the Auditor box) still loads and is migrated`, async () => {
    if (fmt === 'v') return;                       // vertical uses the same data layout as horizontal
    const app = await openApp(browser, fmt);
    assert.equal(await app.load(fx(fmt + '_legacy')), true);
    const o = await app.get();
    const m = fmt === 'a' ? o : o.M;
    assert.equal(m.caFirm, 'Old CA Firm'); assert.equal(m.caFrn, '654321N'); assert.equal(m.caName, 'Old Name');
    assert.equal(m.caNo, '111222'); assert.equal(m.place, 'Kaithal'); assert.equal(m.dsign, '01.04.2026');
    for (const k of ['ca', 'frn', 'can', 'mno', 'plc', 'cdt', 'sig']) assert.equal(k in m, false, 'old key left: ' + k);
    assert.deepEqual(await app.totals(), expected[fmt].totals);
    await app.page.close();
  });

  test(`${name}: Auditor / Signature block appears on the statements, and hides with "No"`, async () => {
    const app = await openApp(browser, fmt);
    await app.load(fx(fmt + '_balanced'));
    let txt = await app.paneText('^Balance Sheet$');
    for (const s of ["AUDITORS' REPORT", 'ABC & Associates', 'FRN : 123456N', 'M. No. : 123456', 'UDIN : 26123456ABCDEFGH12', 'PLACE : ABC', 'DATE : 15.09.2026']) assert.ok(txt.includes(s), 'missing: ' + s);
    const o = await app.get(); (fmt === 'a' ? o : o.M).show = 'N';
    await app.load(o);
    txt = await app.paneText('^Balance Sheet$');
    assert.equal(txt.includes("AUDITORS' REPORT"), false);
    await app.page.close();
  });

  test(`${name}: PDF content is prepared (statements only, firm name present)`, async () => {
    const app = await openApp(browser, fmt);
    await app.load(fx(fmt + '_balanced'));
    const d = await app.api(() => window.bsApi.printDoc());
    assert.equal(d.parts.length, fmt === 'v' ? 2 : 3);
    assert.ok(d.parts.every((p) => p.includes('Sample Traders')));
    assert.ok(d.parts.every((p) => !/<input/.test(p)), 'statements must not contain entry boxes');
    await app.page.close();
  });
}

test('Excel export has no printed page-number footer', () => {
  for (const f of ['app/index.html', 'web/BalanceSheet_AllInOne.html']) {
    assert.equal(fs.readFileSync(path.join(__dirname, '..', f), 'utf8').includes('oddFooter'), false, f);
  }
});

test('browser build (web/BalanceSheet_AllInOne.html) opens all three formats with the header and checks', async () => {
  const { pathToFileURL } = require('url');
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(pathToFileURL(path.join(__dirname, '..', 'web', 'BalanceSheet_AllInOne.html')).href);
  for (const fmt of ['v', 'h', 'a']) {
    await page.click('#b_' + fmt);
    const frame = await (await page.waitForSelector('#f_' + fmt)).contentFrame();
    await frame.waitForFunction(() => !!window.bsApi);
  }
  assert.equal(await page.locator('#hPdf').isHidden(), true, 'PDF button is for the desktop app only');
  assert.equal(await page.locator('#hOpen').isVisible(), true);
  assert.equal(await page.locator('#hXl').isVisible(), true);
  assert.deepEqual(problems, []);
  await page.close();
});

test('window icon contains every Windows size (16 to 256)', () => {
  const d = fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico'));
  const n = d.readUInt16LE(4), sizes = [];
  for (let i = 0; i < n; i++) sizes.push(d[6 + 16 * i] || 256);
  for (const s of [16, 24, 32, 48, 64, 128, 256]) assert.ok(sizes.includes(s), 'missing icon size ' + s);
});

test('documents: user guide PDF, README.md and CHANGELOG.md exist; the installer carries the guide', () => {
  const root = path.join(__dirname, '..');
  assert.equal(fs.readFileSync(path.join(root, 'docs', 'User_Guide.pdf')).slice(0, 4).toString(), '%PDF');
  for (const f of ['README.md', 'CHANGELOG.md']) assert.ok(fs.statSync(path.join(root, f)).size > 500, f);
  assert.equal(fs.existsSync(path.join(root, 'README.txt')), false, 'README.txt was replaced by README.md');
  const pk = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pk.build.extraResources.some((r) => r.from === 'docs/User_Guide.pdf'));
  assert.match(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), new RegExp('\\[' + pk.version.replace(/\./g, '\\.') + '\\]'), 'CHANGELOG needs an entry for the current version');
});

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test('header shows the product name and logo; firm logo can be added, is saved with the data and can be removed', async () => {
  const app = await openApp(browser, 'h');
  assert.match(await app.page.locator('#bar .brand img').getAttribute('src'), /^data:image\/png;base64,/);
  assert.match(await app.page.locator('#bar .brand b').innerText(), /Balance Sheet/);
  assert.equal(await app.page.locator('#hlogo').isHidden(), true);
  await app.page.setInputFiles('#hLogoF', { name: 'logo.png', mimeType: 'image/png', buffer: PNG });
  await app.page.waitForSelector('#hlogo:not([hidden])');
  const o = await app.get();
  assert.match(o.M.logo, /^data:image\/png;base64,/);
  assert.equal(await app.page.locator('#hLogoX').isVisible(), true);
  // a data file without logo must not keep the old one
  await app.load(fx('h_balanced'));
  assert.equal((await app.get()).M.logo, '');
  await app.load(o);
  assert.match((await app.get()).M.logo, /^data:image/);
  await app.page.click('#hLogoX');
  assert.equal((await app.get()).M.logo, '');
  assert.deepEqual(app.problems, []);
  await app.page.close();
});

test('first start shows the quick tour once; F1 opens Help', async () => {
  const app = await openApp(browser, 'h', { tour: true });
  await app.page.waitForSelector('#mo h4');
  assert.match(await app.page.locator('#mo h4').innerText(), /Welcome/);
  await app.page.click('#mo button:has-text("Next")');
  assert.match(await app.page.locator('#mo h4').innerText(), /Choose the format/);
  assert.equal(await app.page.locator('#bar.tourhl').count(), 1, 'the format buttons are highlighted');
  await app.page.click('#mo button:has-text("Skip")');
  assert.equal(await app.page.locator('#mo').count(), 0);
  assert.equal(await app.page.locator('.tourhl').count(), 0);
  assert.equal(await app.page.evaluate(() => localStorage.getItem('bsTour')), '1');
  await app.page.keyboard.press('F1');
  await app.page.waitForSelector('#mo');
  assert.match(await app.page.locator('#mo').innerText(), /Quick start/);
  await app.page.keyboard.press('Escape');
  assert.equal(await app.page.locator('#mo').count(), 0);
  assert.deepEqual(app.problems, []);
  await app.page.close();
});

test('Excel logo: the picture is added to every sheet except AppData', async () => {
  const jszipFile = require.resolve('jszip/dist/jszip.min.js');
  const partial = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'xlsx-pagesetup.html'), 'utf8');
  const code = /<script>([\s\S]*)<\/script>/.exec(partial)[1];
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ path: jszipFile });
  await page.addScriptTag({ content: code });
  const sheet = '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/><pageMargins left="0.3"/><pageSetup paperSize="9"/></worksheet>';
  const r = await page.evaluate(async ([sheet, png]) => {
    const z = new JSZip();
    z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="x"/></Types>');
    for (const n of [1, 2, 3]) z.file('xl/worksheets/sheet' + n + '.xml', sheet);
    z.file('xl/worksheets/_rels/sheet2.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="t" Target="x"/></Relationships>');
    await addLogoToXlsx(z, ['Balance Sheet', 'Profit & Loss', 'AppData'], 'data:image/png;base64,' + png);
    const out = {};
    for (const n of Object.keys(z.files)) out[n] = z.files[n].dir ? null : await z.file(n).async('string').then((s) => (n.endsWith('.png') ? s.length : s));
    return out;
  }, [sheet, PNG.toString('base64')]);
  assert.ok(r['xl/media/firmlogo.png'] > 0);
  assert.ok(r['xl/drawings/drawing1.xml'] && r['xl/drawings/drawing2.xml']);
  assert.equal('xl/drawings/drawing3.xml' in r, false, 'AppData must not get a picture');
  assert.match(r['xl/worksheets/sheet1.xml'], /<pageSetup[^>]*\/><drawing r:id="rIdLogo1"\/><\/worksheet>/);
  assert.equal(r['xl/worksheets/sheet3.xml'].includes('<drawing'), false);
  assert.match(r['xl/worksheets/_rels/sheet2.xml.rels'], /rId1[\s\S]*rIdLogo1/, 'existing relationships are kept');
  assert.match(r['[Content_Types].xml'], /Extension="png"/);
  assert.equal((r['[Content_Types].xml'].match(/drawing\+xml/g) || []).length, 2);
  await page.close();
});

test('Vertical Excel: a line with a note number but no amount stays (shown as "-"), only its schedule is not made', async () => {
  const app = await openApp(browser, 'v');
  await app.load(fx('v_balanced'));
  const r = await app.frame.evaluate(() => {                      // the Excel library is replaced by a stub that just keeps the sheets
    window.XLSX = { utils: { book_new: () => ({ Sheets: {}, SheetNames: [] }), book_append_sheet: (wb, ws, n) => { wb.SheetNames.push(n); wb.Sheets[n] = ws; } } };
    window.saveXlsx = (wb) => { window.__wb = wb; };
    document.getElementById('xl').click();
    const sh = window.__wb.Sheets;
    const line = (sheet, text) => { const s = sh[sheet], k = Object.keys(s).find((x) => /^A\d+$/.test(x) && s[x].v && String(s[x].v).includes(text)), n = k.slice(1);
      return { note: (s['B' + n] || {}).v, value: s['C' + n].v, formula: s['C' + n].f || '', fmt: s['C' + n].z || '' }; };
    const schedules = Object.keys(sh.Schedules).filter((k) => /^A\d+$/.test(k) && /^Schedule No/.test(sh.Schedules[k].v)).map((k) => sh.Schedules[k].v);
    return { empty: line('Balance Sheet', 'Secured Loan'), used: line('Balance Sheet', 'Trade Payables'), pl: line('Profit & Loss', 'Other Income'), schedules, sheets: window.__wb.SheetNames };
  });
  assert.equal(r.empty.note, 2); assert.equal(r.empty.value, 0); assert.equal(r.empty.formula, ''); assert.match(r.empty.fmt, /"-"/);
  assert.equal(r.used.note, 4); assert.match(r.used.formula, /Schedules/); assert.equal(r.used.value, 80000);
  assert.equal(r.pl.note, 12); assert.equal(r.pl.formula, '');
  assert.deepEqual(r.schedules.map((s) => +/\d+/.exec(s)[0]), [1, 4, 8, 9, 11, 14], 'only schedules with amounts are written');
  assert.ok(!r.schedules.some((s) => /No\. 2 /.test(s)));
  const screen = await app.paneText('^Balance Sheet$');
  assert.match(screen, /Trade Payables\t4\t/, 'the screen keeps its numbers after an export');
  assert.deepEqual(app.problems, []);
  await app.page.close();
});

test('Vertical: Start next year keeps last year as Previous Year and carries the closing capital', async () => {
  const app = await openApp(browser, 'v');
  await app.load(fx('v_balanced'));
  const before = await app.totals();
  const r = await app.api(() => window.bsApi.nextYear());
  assert.deepEqual(r, { from: '31.03.2026', to: '31.03.2027' });
  const o = await app.get();
  assert.equal(o.M.d1, '31.03.2027'); assert.equal(o.M.d0, '31.03.2026');
  assert.deepEqual((await app.totals())[1], before[0], 'previous year column must be last year as it was');
  assert.equal(o.S.find((s) => s.n === 1).g[0].r[0].v[0], 1100000, 'opening capital = last year closing capital');
  const blank = o.S.filter((s) => s.n !== 1).every((s) => s.g.every((g) => g.r.every((w) => w.k || w.v[0] === 0)));
  assert.ok(blank, 'every other figure of the new year starts blank');
  assert.deepEqual(app.problems, []);
  await app.page.close();
});

test('Start next year: date of 29 February, a wrong date, and the header button / question', async () => {
  const app = await openApp(browser, 'v');
  assert.deepEqual(await app.api(() => { M.d1 = '29.02.2024'; return window.bsApi.nextYear(); }), { from: '29.02.2024', to: '28.02.2025' });
  assert.match((await app.api(() => { M.d1 = '31.02.2024'; return window.bsApi.nextYear(); })).error, /dd\.mm\.yyyy/);
  await app.load(fx('v_balanced'));
  assert.equal(await app.page.locator('#hNext').isVisible(), true);
  await app.page.click('#hNext');
  await app.page.waitForSelector('#mo');
  assert.match(await app.page.locator('#mo h4').innerText(), /Start next year/);
  await app.page.click('#mo button:has-text("Cancel")');
  assert.equal((await app.get()).M.d1, '31.03.2026', 'Cancel changes nothing');
  await app.page.click('#hNext');
  await app.page.click('#mo button:has-text("Start next year")');
  await app.frame.waitForFunction(() => M.d1 === '31.03.2027');
  assert.equal((await app.get()).M.d1, '31.03.2027');
  const h = await openApp(browser, 'h');
  assert.equal(await h.page.locator('#hNext').isHidden(), true, 'not offered where it is not built yet');
  await app.page.close(); await h.page.close();
});

test('Vertical: moving the date one year forward asks in the program\'s own box (not a browser pop-up)', async () => {
  const app = await openApp(browser, 'v');
  await app.load(fx('v_balanced'));
  const f = app.frame;
  await f.evaluate(() => { document.querySelector('[data-m="d1"]').focus(); });
  await f.fill('[data-m="d1"]', '31.03.2027');
  await f.waitForSelector('text=Year changed from');
  assert.equal((await app.get()).M.d0, '31.03.2025', 'nothing moved before the answer');
  await f.click('button:has-text("OK")');
  await app.page.waitForTimeout(300);
  assert.equal((await app.get()).M.d0, '31.03.2026');
  assert.equal((await app.get()).S.find((s) => s.n === 1).g[0].r[0].v[0], 1100000);
  await app.page.close();
});
