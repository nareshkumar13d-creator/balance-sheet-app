@echo off
REM ===== Run on a Windows PC that has Node.js (LTS) installed =====
REM Needs internet ONLY on this build PC (not on client PCs).
where node >nul 2>nul || (echo Node.js not found. Install from https://nodejs.org then run again. & pause & exit /b 1)
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm install
if errorlevel 1 (echo npm install failed & pause & exit /b 1)
call npm run dist
if errorlevel 1 (echo Build failed & pause & exit /b 1)
echo.
echo ================================================
echo  DONE. Installer is here:  dist\BalanceSheet_Setup.exe
echo  (Run THIS file to install. Do not run files inside win-unpacked.)
echo ================================================
start "" explorer dist
pause
