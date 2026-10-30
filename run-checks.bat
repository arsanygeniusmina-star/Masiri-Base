@echo off
REM Masiri: installs packages and runs type-check, security check and build.
REM Results are saved to check-results.txt next to this file.
cd /d "%~dp0"
set LOG=check-results.txt
echo Masiri checks started %DATE% %TIME% > %LOG%

echo [1/4] Installing packages (first time can take a few minutes)...
echo ===== NPM INSTALL ===== >> %LOG%
call npm install --legacy-peer-deps --no-fund --no-audit >> %LOG% 2>&1
echo INSTALL_EXIT=%ERRORLEVEL% >> %LOG%

echo [2/4] Type-checking (npm run lint)...
echo ===== LINT ===== >> %LOG%
call npm run lint >> %LOG% 2>&1
echo LINT_EXIT=%ERRORLEVEL% >> %LOG%

echo [3/4] Security checks...
echo ===== SECURITY ===== >> %LOG%
call npm run check:security >> %LOG% 2>&1
echo SECURITY_EXIT=%ERRORLEVEL% >> %LOG%

echo [4/4] Production build (npm run build)...
echo ===== BUILD ===== >> %LOG%
call npm run build >> %LOG% 2>&1
echo BUILD_EXIT=%ERRORLEVEL% >> %LOG%

echo ===== ALL DONE ===== >> %LOG%
echo.
echo Done! Results saved to check-results.txt
echo You can close this window and tell Claude "done".
pause
