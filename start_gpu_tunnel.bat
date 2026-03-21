@echo off
title GPU Tunnel — Central AI
color 0A
setlocal

set VPS=YOUR_VPS_IP
set VPS_USER=YOUR_VPS_USER
set APP_DIR=/opt/central-ai

echo ╔══════════════════════════════════════════╗
echo ║   Central AI — GPU Tunnel Launcher       ║
echo ╚══════════════════════════════════════════╝
echo.

:: Check Ollama installed
where ollama >NUL 2>&1
if errorlevel 1 (
    echo [!] Ollama не найдена!
    echo     Скачай с https://ollama.com/download/windows
    pause
    exit /b 1
)

echo [1] Запускаем Ollama локально (GPU)...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if errorlevel 1 (
    echo     Запускаем ollama serve...
    start "Ollama GPU" /MIN cmd /c "set OLLAMA_HOST=0.0.0.0 && ollama serve"
    timeout /t 3 /nobreak >NUL
) else (
    :: Make sure it listens on 0.0.0.0, restart if needed
    echo     Ollama уже запущена — OK
)

echo.
echo [2] Переключаем VPS на GPU режим...
ssh -o "StrictHostKeyChecking=no" -o "ConnectTimeout=10" %VPS_USER%@%VPS% ^
    "cp %APP_DIR%/.env.gpu %APP_DIR%/.env && docker restart central-ai-backend-1" >NUL 2>&1
if errorlevel 1 (
    echo     [!] Не удалось переключить VPS. Туннель всё равно откроется.
) else (
    echo     VPS переключён на локальный GPU!
)

echo.
echo [3] Открываем SSH туннель...
echo     localhost:11434 --^> VPS:%VPS%:11434
echo.
echo ╔══════════════════════════════════════════╗
echo ║  Туннель активен! Не закрывай окно.     ║
echo ║  Закрой чтобы вернуться к VPS Ollama.  ║
echo ╚══════════════════════════════════════════╝
echo.

ssh -o "ServerAliveInterval=30" ^
    -o "ServerAliveCountMax=5" ^
    -o "StrictHostKeyChecking=no" ^
    -N ^
    -R 0.0.0.0:11434:localhost:11434 ^
    %VPS_USER%@%VPS%

:: On exit: revert VPS back to internal Ollama
echo.
echo [4] Туннель закрыт. Возвращаем VPS на внутреннюю Ollama...
ssh -o "StrictHostKeyChecking=no" -o "ConnectTimeout=10" %VPS_USER%@%VPS% ^
    "cp %APP_DIR%/.env.vps %APP_DIR%/.env && docker restart central-ai-backend-1" >NUL 2>&1
echo     VPS возвращён к своей Ollama.
echo.
pause
