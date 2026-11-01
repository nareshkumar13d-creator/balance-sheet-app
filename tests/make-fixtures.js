/* Creates the sample data files in tests/fixtures from the live app:  npm run fixtures
 * Only needed when the data layout changes on purpose. Review the diff before committing the new files. */
const fs = require('fs');
const path = require('path');
const { launch, openApp } = require('./helpers');
const OUT = path.join(__dirname, 'fixtures');

(async () => {
  const browser = await launch();
  const expected = {};
  for (const fmt of ['h', 'v']) {
    const app = await openApp(browser, fmt);
    await app.frame.evaluate(() => {
      const row = (n) => S.find((s) => s.n === n).g[0].r[0];
      M.firm = 'Sample Traders'; M.addr = 'Main Market'; M.caFirm = 'ABC & Associates'; M.caFrn = '123456N'; M.caName = 'ABC'; M.caNo = '123456';
      M.caUdin = '26123456ABCDEFGH12'; M.place = 'ABC'; M.dsign = '15.09.2026';
      row(1).v = [500000, 400000];     // capital - opening balance
      row(4).v = [80000, 60000];       // sundry creditors
      row(11).v = [900000, 800000];    // sales
      row(14).v = [300000, 250000];    // direct expenses
      row(8).v = [150000, 100000];     // sundry debtors
      refresh();
    });
    // cash is whatever makes both years balance
    await app.frame.evaluate(() => {
      for (let c = 0; c < 2; c++) { const t = bsApi.totals()[c]; S.find((s) => s.n === 9).g[0].r[0].v[c] = t.l - t.a; }
      refresh();
    });
    const obj = await app.get();
    fs.writeFileSync(path.join(OUT, fmt + '_balanced.json'), JSON.stringify(obj, null, 1));
    const t = await app.totals();
    // an unbalanced copy: 1,000 extra in cash
    const bad = JSON.parse(JSON.stringify(obj)); bad.S.find((s) => s.n === 9).g[0].r[0].v[0] += 1000;
    fs.writeFileSync(path.join(OUT, fmt + '_unbalanced.json'), JSON.stringify(bad, null, 1));
    expected[fmt] = { totals: t };
    await app.page.close();
  }
  { // annexure
    const app = await openApp(browser, 'a');
    await app.frame.evaluate(() => {
      D.firm = 'Sample Traders'; D.addr = 'Main Market'; D.caFirm = 'ABC & Associates'; D.caFrn = '123456N'; D.caName = 'ABC'; D.caNo = '123456';
      D.caUdin = '26123456ABCDEFGH12'; D.place = 'ABC'; D.dsign = '15.09.2026';
      Object.assign(D.tb[0], { n: 'Goods', os: 0, pur: 400000, sale: 900000, cs: 100000 });   // stock / trading table
      D.L.exp[0].v = 300000; D.caps[0].ob = 500000; D.L.G[0].v = 150000;
      refresh();
      const t = bsApi.totals()[0]; D.L.cash[0].v = t.l - t.a; refresh();
    });
    const obj = await app.get();
    fs.writeFileSync(path.join(OUT, 'a_balanced.json'), JSON.stringify(obj, null, 1));
    expected.a = { totals: await app.totals() };
    const bad = JSON.parse(JSON.stringify(obj)); bad.L.cash[0].v = +bad.L.cash[0].v + 1000;
    fs.writeFileSync(path.join(OUT, 'a_unbalanced.json'), JSON.stringify(bad, null, 1));
    await app.page.close();
  }
  // old data files (made before the Auditor / Signature box existed) - used to test that loading them still works
  const h = JSON.parse(fs.readFileSync(path.join(OUT, 'h_balanced.json'), 'utf8'));
  const oldKeys = { ca: 'Old CA Firm', frn: '654321N', can: 'Old Name', mno: '111222', plc: 'Kaithal', cdt: '01.04.2026', sig: 'OLD SIGNATORY' };
  for (const k of ['show', 'caFirm', 'caType', 'caName', 'caDesig', 'caNo', 'caUdin', 'caFrn', 'place', 'dsign', 'sg', 'sg1']) delete h.M[k];
  fs.writeFileSync(path.join(OUT, 'h_legacy.json'), JSON.stringify(Object.assign(h, { M: Object.assign(h.M, oldKeys) }), null, 1));
  const a = JSON.parse(fs.readFileSync(path.join(OUT, 'a_balanced.json'), 'utf8'));
  for (const k of ['show', 'caFirm', 'caType', 'caName', 'caDesig', 'caNo', 'caUdin', 'caFrn', 'place', 'dsign', 'sg', 'sg1']) delete a[k];
  fs.writeFileSync(path.join(OUT, 'a_legacy.json'), JSON.stringify(Object.assign(a, oldKeys), null, 1));
  fs.writeFileSync(path.join(OUT, 'expected.json'), JSON.stringify(expected, null, 1));
  console.log('fixtures written:', fs.readdirSync(OUT).join(', '));
  console.log(JSON.stringify(expected));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
