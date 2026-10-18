// Copies the Excel library next to index.html so the app works fully offline.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'xlsx-js-style', 'dist', 'xlsx.bundle.js');
const dst = path.join(__dirname, '..', 'app', 'xlsx.bundle.js');
if (!fs.existsSync(src)) { console.error('xlsx-js-style not found. Run: npm install'); process.exit(1); }
fs.copyFileSync(src, dst);
console.log('Copied xlsx.bundle.js into app/');

const jsrc = path.join(__dirname, '..', 'node_modules', 'jszip', 'dist', 'jszip.min.js');
if (fs.existsSync(jsrc)) { fs.copyFileSync(jsrc, path.join(__dirname, '..', 'app', 'jszip.min.js')); console.log('Copied jszip.min.js into app/'); }
else console.warn('jszip not found - Excel print setup will be skipped. Run: npm install');
