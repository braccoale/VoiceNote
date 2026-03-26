@echo off
REM ================================================================
REM  VoiceNote — Push rapido su GitHub
REM  Uso: push.bat "messaggio commit"
REM  Oppure senza argomenti per messaggio automatico con timestamp
REM ================================================================

cd /d "%~dp0"

REM Controlla se c'è un messaggio passato come argomento
IF "%~1"=="" (
    FOR /F "tokens=1-3 delims=/ " %%A IN ("%DATE%") DO SET D=%%A-%%B-%%C
    FOR /F "tokens=1-2 delims=: " %%A IN ("%TIME%") DO SET T=%%A:%%B
    SET MSG=update: %D% %T%
) ELSE (
    SET MSG=%~1
)

echo.
echo [VoiceNote] Staging tutti i file...
git add -A

echo [VoiceNote] Commit: %MSG%
git commit -m "%MSG%"

echo [VoiceNote] Push su GitHub...
git push

echo.
echo ================================================================
echo  Push completato!
echo  Repository: https://github.com/braccoale/VoiceNote
echo ================================================================
echo.
pause
