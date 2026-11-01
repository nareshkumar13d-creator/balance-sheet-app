# Balance Sheet - desktop app

Offline Windows program (Electron) that makes the Balance Sheet, Trading & Profit & Loss account and schedules in three formats
(Vertical - Schedule III, Horizontal, Annexure) from the amounts the user types. Exports to Excel (with live formulas) and PDF.

| For | Read |
|---|---|
| Clients / users | `docs/User_Guide.pdf` (also in the program: **Help > User Guide**) |
| What changed in each version | [`CHANGELOG.md`](CHANGELOG.md) |
| Developers | this file |

## Quick start (developer)

Needs [Node.js](https://nodejs.org) 18 or newer (LTS) and, for the tests, Microsoft Edge or Google Chrome.

```
npm install
npm start          # builds the page and opens the program (no installer)
npm test           # automated checks
npm run dist       # installer -> dist\BalanceSheet_Setup.exe   (or double-click build_app.bat)
```

## How the code is organised

```
src/apps/        vertical.html  horizontal.html  annexure.html     one readable file per format
src/shared/      code common to all three formats - fix a bug here once:
                   dialogs.html          in-app Alert / Ask boxes
                   xlsx-pagesetup.html   Excel page set-up, saveXlsx, firm logo in Excel
                   base.css              common look
                   auditor-form.html, sig.js   Auditor / Signature box
                   bsapi-common.html     helpers, grid keys, content for the PDF
                   file-io.html          Save / Load .json in a browser
src/shell/       the page around the formats: header, dialogs, help and tour, Save / Open, PDF, auto-save (shell.html .css .js, logo.png)
build.js         joins everything:  node build.js  ->  app/index.html (desktop)  +  web/BalanceSheet_AllInOne.html (one file for a browser)
main.js          Electron main process: window, menu, files, PDF, updates, security
preload.js       the only functions the page may call (window.bsNative)
build/           icon.ico (16-256 px), icon.png
docs/            User_Guide.pdf, make_user_guide.py (rebuilds the PDF), img/ (screenshots used in it)
tests/           automated checks and sample data (tests/fixtures)
.github/         workflows: tests + installer on every push; release when a tag is pushed
```

**Rule:** never edit `app/index.html` or `web/BalanceSheet_AllInOne.html` by hand. Edit `src/`, then `node build.js`
(`npm start` and `npm run dist` do it for you). `npm test` fails if the built files are out of date.

Each format exposes `window.bsApi` (`get`, `load`, `check`, `totals`, `printDoc`, `logo` ...). The shell, the tests and the PDF use only this interface.

## Data files

`.bsdata` (JSON text). Each save keeps the previous version as `.bak`. `get()` writes `_app`, `_fmt` and `_fn`; keys of older files are migrated on load
(`migSig` for the signature fields). If you change the data layout, keep old files loading and add a sample to `tests/fixtures`.

## Tests

`npm test` (Node's built-in runner + `playwright-core`, which uses the Edge or Chrome already on the PC; set `BS_BROWSER=chrome` to choose).
It loads the sample files in `tests/fixtures` in every format and checks the totals, the Balance Sheet tally, old-file migration,
save > load round trips, the Auditor block, PDF content, logo, tour and the build. `npm run fixtures` recreates the sample files from the app
(only when the layout changes on purpose - review the diff). The same tests run on GitHub for every push.

## Release

1. Change `"version"` in `package.json` (and add the entry to `CHANGELOG.md`).
2. `git commit` and `git push`.
3. `git tag v2.0.1` and `git push origin v2.0.1` (the tag must equal the version with a leading `v`).
4. GitHub Actions builds the installer and attaches `BalanceSheet_Setup.exe`, its `.blockmap` and `latest.yml` to the Release. Installed programs
   find `latest.yml` and offer the update (the repository must be public).
5. Give clients the installer from the GitHub Release (an installer made with `build_app.bat` has no update information).

Before the first release set your name in `package.json`: `author.name` and `build.copyright`.

### Code signing (optional, removes "Unknown publisher")
Needs a paid code-signing certificate that can be used from GitHub Actions (a `.pfx` file or a cloud-signing service).
Add the repository secrets `CSC_LINK` (the `.pfx` as base64) and `CSC_KEY_PASSWORD`; the release workflow then signs the installer.
Without the secrets the installer is built unsigned.

## Security

Content-Security-Policy (set in `build.js`), sandboxed window with `contextIsolation`, no Node access in the page, a small bridge in `preload.js`,
http/https links only, device permissions refused. If Excel export ever fails with a "Content Security Policy" message in the developer console,
look at the policy line in `build.js`.

## Branding and documents

- Icon: replace `build/icon.png` (512 px) and rebuild `build/icon.ico` with all sizes 16-256 px; header logo: `src/shell/logo.png` (64 px).
- User Guide: edit the text in `docs/make_user_guide.py`, run it (needs `pip install reportlab`), commit `docs/User_Guide.pdf`.
  Screenshots are in `docs/img`. The PDF is copied into the installer (`extraResources`).
