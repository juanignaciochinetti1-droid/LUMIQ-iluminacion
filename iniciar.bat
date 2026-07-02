@echo off
title Gestion de Produccion
color 0A
echo.
echo  ==========================================
echo    GESTION DE PRODUCCION
echo  ==========================================
echo.

cd /d "%~dp0"

REM ── Verificar Node.js ──
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado.
    echo         Descargalo desde https://nodejs.org
    pause
    exit /b 1
)

REM ── Verificar si MySQL ya esta corriendo ──
netstat -ano | findstr ":3306 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [OK] MySQL ya esta corriendo.
    goto :instalar_deps
)

REM ── Buscar MySQL en rutas comunes ──
echo [..] Buscando MySQL...
set MYSQL_BIN=
set MYSQL_DIR=

for %%V in (8.4 8.3 8.2 8.1 8.0 9.0) do (
    if exist "C:\Program Files\MySQL\MySQL Server %%V\bin\mysqld.exe" (
        set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server %%V\bin\mysqld.exe
        set MYSQL_DIR=C:\Program Files\MySQL\MySQL Server %%V\bin
        goto :mysql_encontrado
    )
)
if exist "C:\xampp\mysql\bin\mysqld.exe" (
    set MYSQL_BIN=C:\xampp\mysql\bin\mysqld.exe
    set MYSQL_DIR=C:\xampp\mysql\bin
    goto :mysql_encontrado
)

echo [ERROR] No se encontro MySQL Server.
echo         Instala MySQL desde https://dev.mysql.com/downloads/mysql/
echo         o desde winget: winget install Oracle.MySQL --source winget
pause
exit /b 1

:mysql_encontrado
echo [OK] MySQL encontrado.

REM ── Inicializar datos si es la primera vez ──
set DATA_DIR=%USERPROFILE%\mysql-data
if not exist "%DATA_DIR%\mysql" (
    echo [..] Inicializando base de datos por primera vez...
    "%MYSQL_BIN%" --initialize-insecure --datadir="%DATA_DIR%"
    if errorlevel 1 (
        echo [ERROR] No se pudo inicializar MySQL.
        pause
        exit /b 1
    )
    echo [OK] Base de datos inicializada.
)

REM ── Iniciar MySQL ──
echo [..] Iniciando MySQL...
start "" /B "%MYSQL_BIN%" --datadir="%DATA_DIR%" --port=3306

REM ── Esperar hasta que MySQL este listo ──
echo [..] Esperando que MySQL este listo...
:esperar_mysql
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":3306 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 goto :esperar_mysql
echo [OK] MySQL listo.

REM ── Crear base de datos si no existe ──
"%MYSQL_DIR%\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS gestion_produccion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1

:instalar_deps
REM ── Instalar dependencias si faltan ──
if not exist "node_modules" (
    echo [..] Instalando dependencias ^(primera vez, puede tardar unos minutos^)...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas.
)

REM ── Variables de entorno ──
set DATABASE_URL=mysql://root@localhost:3306/gestion_produccion
set JWT_SECRET=gestion_produccion_secret_key_local
set NODE_ENV=development
set AUTO_OPEN_BROWSER=true

REM ── Ejecutar migraciones ──
echo [..] Verificando tablas de base de datos...
node_modules\.bin\drizzle-kit.cmd migrate >nul 2>&1
echo [OK] Base de datos lista.

REM ── Iniciar servidor ──
echo.
echo  Iniciando la aplicacion...
echo  Se abrira el navegador automaticamente en http://localhost:3000/
echo.
echo  Para cerrar la aplicacion, cierra esta ventana.
echo.

node_modules\.bin\tsx.cmd watch server\_core\index.ts
