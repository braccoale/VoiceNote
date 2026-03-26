@echo off
REM ================================================================
REM  SiteVoice — Build iOS per App Store
REM  Prerequisiti: eas-cli installato, account Expo, Apple Developer
REM ================================================================
cd /d "%~dp0"

echo.
echo ================================================================
echo  BUILD iOS — App Store Production
echo ================================================================
echo.
echo  Questo comando:
echo  1. Compila l'app per iOS (richiede Apple Developer Account)
echo  2. Usa i certificati salvati su EAS
echo  3. Genera un file .ipa pronto per App Store Connect
echo.
echo  Prima volta? Esegui: eas build:configure
echo ================================================================
echo.

eas build --platform ios --profile production

echo.
echo ================================================================
echo  Build completata! Per pubblicare su App Store:
echo  npm run submit:ios
echo ================================================================
pause
