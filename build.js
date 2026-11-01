#!/usr/bin/env node
/* Builds the app from the readable sources in src/:
 *   node build.js            ->  app/index.html (desktop app)  and  web/BalanceSheet_AllInOne.html (single file for a browser)
 *   node build.js --check    ->  exits with an error if those files are not up to date with src/
 * Edit the files in src/ only. Shared code for all three formats lives in src/shared/.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8').replace(/\r\n/g, '\n');   // same result on Windows (CRLF) and Linux (LF)

const APPS = [                                 // order = order of the format buttons
  ['v', 'Vertical (Schedule III)', 'apps/vertical.html'],
  ['h', 'Horizontal', 'apps/horizontal.html'],
  ['a', 'Annexure', 'apps/annexure.html']
];

const LIBS = {
  kit: '<script src="xlsx.bundle.js"></script>\n<script src="jszip.min.js"></script>',          // copied next to index.html by scripts/copy-lib.js
  web: '<script src="https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>'
};

// Desktop app only. Scripts and styles are inline, so 'unsafe-inline' is needed; everything else is limited to the app's own files.
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
            "font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

const INCLUDE = /(?:<!--|\/\*)@include\s+([^\s*>-][^\s*>]*?\.[a-z]+)([^*>]*?)(?:-->|\*\/)/g;

function expand(text, seen = []) {
  return text.replace(INCLUDE, (m, file, params) => {
    if (seen.includes(file)) throw new Error('include loop: ' + seen.concat(file).join(' > '));
    let part = read(file).replace(/\n$/, '');            // partial files end with a newline
    params.trim().split(/\s+/).filter(Boolean).forEach((kv) => {
      const [k, v] = kv.split('=');
      part = part.split('@' + k + '@').join(v);
    });
    return expand(part, seen.concat(file));
  });
}

// text -> JavaScript string literal (the "</" is split so it can sit inside a <script> tag)
const lit = (s) => JSON.stringify(s).replace(/<\//g, '<\\/');

function build(target) {
  const kit = target === 'kit';
  const docs = APPS.map(([id, label, file]) =>
    '[' + lit(id).replace(/"/g, "'") + ',' + lit(label).replace(/"/g, "'") + ',' + lit(expand(read(file).split('<!--@libs-->').join(LIBS[target]))) + ']');
  let page = read('shell/shell.html');
  page = page.split('<!--@csp-->').join(kit ? '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">' : '');
  page = page.split('@KIT@').join(String(kit));
  page = page.split('@LOGO@').join('data:image/png;base64,' + fs.readFileSync(path.join(SRC, 'shell', 'logo.png')).toString('base64'));
  page = expand(page);
  return page.split('/*@F*/').join(docs.join(',\n'));
}

const OUT = { kit: path.join(ROOT, 'app', 'index.html'), web: path.join(ROOT, 'web', 'BalanceSheet_AllInOne.html') };

if (require.main === module) {
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const target of Object.keys(OUT)) {
    const text = build(target);
    if (check) {
      const have = fs.existsSync(OUT[target]) ? fs.readFileSync(OUT[target], 'utf8').replace(/\r\n/g, '\n') : null;
      if (have !== text) { console.error('OUT OF DATE: ' + path.relative(ROOT, OUT[target]) + '  (run: node build.js)'); bad++; }
    } else {
      fs.mkdirSync(path.dirname(OUT[target]), { recursive: true });
      fs.writeFileSync(OUT[target], text);
      console.log('built ' + path.relative(ROOT, OUT[target]) + '  (' + Math.round(text.length / 1024) + ' KB)');
    }
  }
  process.exit(bad ? 1 : 0);
}
module.exports = { build, OUT };
