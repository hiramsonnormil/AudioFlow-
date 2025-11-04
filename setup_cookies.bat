@echo off
REM Script para configurar cookies do YouTube para yt-dlp no Windows

echo 🍪 Configurador de Cookies do YouTube para yt-dlp
echo ==================================================
echo.

REM Verificar se yt-dlp está instalado
where yt-dlp >nul 2>nul
if errorlevel 1 (
    echo ❌ yt-dlp não encontrado. Instalando...
    pip install yt-dlp
)

echo Escolha seu navegador:
echo 1. Firefox
echo 2. Chrome/Chromium (Edge, Brave, etc)
echo 3. Safari (se usando Windows 11 com WSL)
echo.
set /p choice="Digite o número (1-3): "

if "%choice%"=="1" (
    echo 📦 Extraindo cookies do Firefox...
    yt-dlp --cookies-from-browser firefox --cookies cookies.txt https://www.youtube.com
) else if "%choice%"=="2" (
    echo 📦 Extraindo cookies do Chrome/Chromium...
    yt-dlp --cookies-from-browser chrome --cookies cookies.txt https://www.youtube.com
) else if "%choice%"=="3" (
    echo 📦 Extraindo cookies do Safari...
    yt-dlp --cookies-from-browser safari --cookies cookies.txt https://www.youtube.com
) else (
    echo ❌ Opção inválida
    exit /b 1
)

if exist cookies.txt (
    echo.
    echo ✅ Arquivo cookies.txt criado com sucesso!
    echo 📍 Localização: %CD%\cookies.txt
    echo.
    echo 💡 Teste com:
    echo    yt-dlp --cookies cookies.txt "https://www.youtube.com/watch?v=VIDEO_ID"
) else (
    echo ❌ Falha ao criar cookies.txt
    exit /b 1
)

pause
