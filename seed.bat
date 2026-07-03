@echo off
title Cargar datos iniciales
color 0B
echo.
echo  ==========================================
echo    CARGA DE DATOS INICIALES
echo  ==========================================
echo.

cd /d "%~dp0"

REM ── Verificar Node.js ──
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado.
    pause
    exit /b 1
)

REM ── Verificar dependencias ──
if not exist "node_modules" (
    echo [..] Instalando dependencias...
    call npm install --legacy-peer-deps
)

REM ── Verificar que MySQL este corriendo ──
netstat -ano | findstr ":3306 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MySQL no esta corriendo.
    echo         Ejecuta primero iniciar.bat y luego este archivo en otra ventana.
    pause
    exit /b 1
)

REM ── Variables de entorno ──
set DATABASE_URL=mysql://root@localhost:3306/gestion_produccion
set NODE_ENV=development

echo [..] Cargando productos, insumos y recetas...
echo.
node_modules\.bin\tsx.cmd server\seed.ts

echo.
pause
