BALANCE SHEET - DESKTOP APP (Electron)
======================================
Same app as your HTML file, plus:
  * Save data  -> saves everything (firm, dates, amounts, added schedules/sections) to a .json file
  * Load data  -> opens a saved .json file and restores everything
  * Export to Excel / Import Excel / Clear amounts / Reset all  (as before)
  * Works fully offline (Excel library is bundled by the build)
  * App icon, Start Menu + Desktop shortcut, uninstaller

HOW TO MAKE BalanceSheet_Setup.exe  (once, on a Windows PC with internet)
  1. Install Node.js LTS from nodejs.org
  2. Extract this folder, double-click build_app.bat
  3. Wait (first time downloads ~200 MB). Installer appears in dist\BalanceSheet_Setup.exe
  4. Give clients only BalanceSheet_Setup.exe

Quick test without building: double-click run_without_installing.bat

USING THE APP
  Open app -> enter data -> click "Save data" -> choose where to keep the file.
  Next time: open app -> click "Load data" -> pick that file -> continue.

To change the icon: replace build\icon.ico (256x256 .ico) and rebuild.

TRADING A/c - COMBINED OR SEPARATE
  By default everything (Sale, Purchase, Opening & Closing Stock) comes in ONE Trading A/c.
  To make a separate A/c for a product: in Schedules tab, every Sale / Opening Stock / Purchase / Closing Stock row
  has a small box 'A/c group (optional)'. Type the same group name (e.g. 5) in all rows of that product.
  Rows with that group name form their own '<group> A/c'; rows with no group stay in 'Trading A/c'.

QUANTITY & UNIT (new)
  In Schedules tab, every Sale / Opening Stock / Purchase / Closing Stock row now has a Quantity box and a Unit list (KGS, QTL, PCS, NOS, MTS, LTR ... as per Income Tax / ITR unit codes).
  Quantity shows in Trading A/c and Closing Stock, and a new tab "Quantity Details" gives Opening + Purchase - Sale - Closing = Shortage/(Excess). Excel export gets a "Quantity" sheet.

ALL-IN-ONE (new)
  app/index.html now holds three formats (Vertical Schedule III, Horizontal, Annexure). Choose the format from the bar at the top.

NEW IN v4
  * All "e.g." hints replaced by simple placeholders (abc, 123456N, 12345, dd.mm.yyyy).
  * Annexure format: "Add a new schedule" and "Add a new section" (like Horizontal) - new schedules get their own Annexure letter, show in the Balance Sheet and Excel.
  * Annexure format: default row names (Sale 1, Purchase 1, Party 1, Bank OD Limit ...) like Vertical / Horizontal.
  * Horizontal and Annexure: C.A. details (Signatory, CA firm, FRN, CA name, Membership No., Place, Date) on screen and in the Excel Balance Sheet / Trading & P&L sheets - same as Vertical.


NEW IN v5
  * Annexure format: more than one Capital Account (+ Add capital account, profit shared by % , Annexure A, B, C ... per account). Old saved files still load.
  * Save data / Load data (JSON) now in Vertical and Annexure formats too (same as Horizontal).

NEW IN v6 (Annexure format - Excel export)
  * Firm name, address and heading are centred in the Excel.
  * One blank row after every liability / asset group and before Total (Balance Sheet);
    blank row before and after Gross Profit / Net Profit / Closing Balance and before Total
    (Trading A/c, P&L, Capital A/c, Fixed asset accounts) - same as Horizontal export.
  * Lines with 0 amount are not exported.
  * Live formulas: change any party amount in an Annexure (or any amount in Trading / P&L) inside Excel and
    Gross Profit, Net Profit, Capital closing balance, Balance Sheet and Totals update automatically.
  * (v6b) Excel now has a separate 'Schedule' sheet (all Annexure party lists), thin borders on all tables like the
    Horizontal export, and zero amounts are hidden.
  * (v6c) Closing Balance in Capital A/c comes one blank row after the last left-side entry; Cash & Bank Balances now shown as an Annexure;
    Fixed asset names and group headings centred in Balance Sheet; blank row before Total in every Schedule list.
  * (v6d) CA signature box (like Vertical, blank space for CA to fill) added to Horizontal and Annexure Excel export; Car/Furniture account titles centred.
