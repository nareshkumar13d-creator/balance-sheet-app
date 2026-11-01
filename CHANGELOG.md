# Changelog

All notable changes to Balance Sheet. The newest version is first.
The version number is the one in `package.json`; a release on GitHub is made by pushing a tag with the same number (`v2.0.0`).

## [Unreleased]

### Changed (Horizontal / Annexure)
- **Build check** (`node build.js --check`) no longer fails because of Windows / Linux line endings.
- **Horizontal, Balance Sheet**: group heads (Secured Loan, Unsecured Loans, Sundry Creditors, ...) are bold and underlined on screen, in the PDF and in Excel.
- **Horizontal**: *Cash and Cash equivalents* is now **Cash & Bank Balance** (older files are renamed when opened).
- **Horizontal, Excel**: in the Trading, P&L and Annexures sheets the *Particulars* heading is left aligned and *Amount (Rs)* right aligned.
- **Horizontal / Annexure, Trading**: when there is more than one Trading A/c, the unnamed one is called *Trading 1* (the others keep their own names, e.g. *Trading 2*).

### Changed
- **Horizontal**: the Balance Sheet has a second amount column - the total of each group (Secured Loan, Unsecured Loans, Sundry Creditors, ...) is shown in the next column, on both the Liabilities and the Assets side (screen, PDF and Excel).
- **Horizontal, Excel**: the *Schedules* sheet is no longer exported; amounts that pointed to it are plain numbers.
- **Annexure**: annexure letters now run Capital (A...), then the Liabilities (Secured, Unsecured, Creditors, Provisions, own schedules), then the Assets in Balance Sheet order (Loans & Advances, Debtors, Closing Stock, Cash & Bank, Duties & Taxes, own schedules).

### New
- **Annexure, Import Excel** also reads a Balance Sheet workbook made outside this program (sheets with Liabilities / Assets, Trading, P & L, Capital and the Annexure lists, in .xls or .xlsx): capital account, Trading A/c blocks, expenses and income, fixed assets with depreciation, party lists, and extra lists (such as Deposits) as own schedules. Sheets of another year are ignored.

## [2.0.0]

### New
- **Auditor / Signature details** box in all three formats (Vertical, Horizontal, Annexure): firm, FRN, partner, membership number, UDIN, place, date, signature text. Shown under the Balance Sheet and the P&L on screen, in Excel and in the PDF.
- **Header** with the product name and logo, the firm name, the file name, an *Unsaved* mark and Open / Save / Logo / Export Excel / Export PDF in one place.
- **Firm logo** (PNG or JPG): shown in the header, saved with the data file and added to every sheet of the Excel export.
- **PDF export and print preview** (A4, page numbers, always black on white).
- **Help** (F1), a **quick tour** on first start, and a **User Guide (PDF)** (`docs/User_Guide.pdf`, installed with the program).
- **Real Save / Open windows**, `.bsdata` data files (old `.json` files still open), Open Recent, double-click to open, `.bak` copy of the previous version on every save.
- **Auto-save** every 15 seconds with *Restore unsaved work* after a crash, and a **Save / Don't save / Cancel** question when closing with unsaved changes.
- **Checks bar**: red when the Balance Sheet does not tally, yellow for an empty firm name, wrong dates or capital shares not adding to 100%.
- **Start next year** (Vertical): the *Next year* button / File menu moves this year's figures to the Previous Year column and carries closing capital, depreciation WDV, opening stock and quantities; the new year is blank and has to be saved under a new name. (The same happens when the Balance sheet date is moved one year forward - now with the program's own question box instead of a browser pop-up.)
- **Keyboard**: Ctrl+S / O / E / P, Ctrl+Shift+S / E, F1; Enter or the Up / Down arrows move between cells in the entry grids.
- **Auto-update** from GitHub Releases (asks before downloading and before installing); optional code signing through repository secrets.
- Multi-size Windows icon (16 to 256 px).

### Changed
- Excel export no longer prints a "Page 1 of N" footer.
- Vertical format, Excel: a line that has a note number is kept even when it has no amount - it shows "-" with the same note number as on screen (no more renumbering) - but its schedule is not written to the *Schedules* sheet.
- The code is split into readable sources (`src/`) with the shared parts in one place; `node build.js` makes `app/index.html` and a single-file browser version. See `README.md`.
- Messages (restore, errors, unsaved changes) use the program's own dialogs.
- Documentation: `README.txt` was replaced by `README.md` (developers), `CHANGELOG.md` (this file) and the User Guide (clients).

### Fixed
- Horizontal format loaded its Excel library from the internet, so Excel export failed offline. All formats now use the bundled copy.

### Security
- Content-Security-Policy on the page, sandboxed window, restricted bridge (`preload.js`), only http/https links open outside, device permissions refused.

### Tests
- `npm test` opens the real app and checks totals, the Balance Sheet tally, old data files, save/load round trips, the Auditor block, PDF content, logo, tour and the build itself.

## Format updates before the desktop app got a version number

### v6d - Annexure Excel
- CA signature box (blank space for the CA) added to the Horizontal and Annexure Excel export; Car / Furniture account titles centred.

### v6c - Annexure Excel
- Closing Balance in the Capital A/c comes one blank row after the last left-side entry; Cash & Bank balances shown as an Annexure; fixed-asset names and group headings centred in the Balance Sheet; blank row before Total in every Schedule list.

### v6b - Annexure Excel
- Separate *Schedule* sheet with all Annexure party lists, thin borders on all tables (like Horizontal), zero amounts hidden.

### v6 - Annexure Excel export
- Firm name, address and heading centred.
- One blank row after every liability / asset group and before Total; blank rows around Gross Profit, Net Profit and Closing Balance.
- Lines with a zero amount are not exported.
- Live formulas: change a party amount or any Trading / P&L amount in Excel and Gross Profit, Net Profit, Capital closing balance, Balance Sheet and totals update.

### v5
- Annexure: more than one Capital Account (profit shared by %, Annexure A, B, C ... per account). Old saved files still load.
- Save data / Load data (JSON) in Vertical and Annexure as in Horizontal.

### v4
- Hints replaced by simple placeholders (abc, 123456N, 12345, dd.mm.yyyy).
- Annexure: *Add a new schedule* and *Add a new section*; default row names like the other formats.
- Horizontal and Annexure: C.A. details (signatory, firm, FRN, name, membership number, place, date) on screen and in the Excel Balance Sheet and Trading & P&L sheets.

### Earlier
- **All-in-one**: three formats (Vertical Schedule III, Horizontal, Annexure) in one app, chosen from the bar at the top.
- **Quantity and Unit** on every Sale / Opening Stock / Purchase / Closing Stock row (KGS, QTL, PCS, NOS, MTS, LTR ... as per Income Tax / ITR unit codes); a *Quantity Details* statement (Opening + Purchase - Sale - Closing = Shortage / (Excess)) and a *Quantity* sheet in Excel.
- **Trading A/c - combined or separate**: by default one Trading A/c; type the same *A/c group* in all rows of a product to give it its own Trading A/c.
- Save data / Load data (JSON), Export to Excel / Import Excel, Clear amounts, Reset all; works offline; icon, Start Menu and Desktop shortcut, uninstaller.
