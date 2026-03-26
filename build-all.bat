@echo off
REM ================================================================
REM  SiteVoice — Build iOS + Android in parallelo
REM ================================================================
cd /d "%~dp0"

echo.
echo ================================================================
echo  BUILD COMPLETA — iOS + Android Production
echo  Le build vengono eseguite in parallelo su cloud EAS
echo ================================================================
echo.

eas build --platform all --profile production

echo.
echo ================================================================
echo  Entrambe le build avviate su EAS Cloud!
echo  Monitora su: https://expo.dev
echo.
echo  Al termine:
echo   iOS:     npm run submit:ios
echo   Android: npm run submit:android
echo ================================================================
pause
