@echo off
setlocal

if /I "%~1"=="dev" goto dev
if /I "%~1"=="build" goto build

echo Use: vite dev ou vite build
exit /b 1

:dev
docker compose -f "%~dp0..\..\infra\docker-compose.yml" --profile dev run --rm --no-deps --service-ports minhas-financas-node npm run dev
exit /b %errorlevel%

:build
docker compose -f "%~dp0..\..\infra\docker-compose.yml" --profile dev run --rm --no-deps minhas-financas-node npm run build
exit /b %errorlevel%