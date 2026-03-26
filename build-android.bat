@echo off
REM ================================================================
REM  SiteVoice — Build Android per Google Play
REM  Prerequisiti: eas-cli installato, account Expo, Google Play Console
REM ================================================================
cd /d "%~dp0"

echo.
echo ================================================================
echo  BUILD Android — Google Play Production
echo ================================================================
echo.
echo  Questo comando:
echo  1. Compila l'app per Android (AAB - Android App Bundle)
echo  2. Firma il bundle con il keystore EAS
echo  3. Genera un .aab pronto per Google Play Console
echo.
echo  Prima volta? Esegui: eas build:configure
echo ================================================================
echo.

eas build --platform android --profile production

echo.
echo ================================================================
echo  Build completata! Per pubblicare su Google Play:
echo  npm run submit:android
echo ================================================================
pause
