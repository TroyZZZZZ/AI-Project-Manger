@echo off
REM Change to project root (this script lives in scripts\)
cd /d "%~dp0.."

REM Start frontend via the Node script that boots Vite
"C:\Users\51184\.trae\binaries\node\versions\22.20.0\node.exe" "scripts\start-frontend.mjs"