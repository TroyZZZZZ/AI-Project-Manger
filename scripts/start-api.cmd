@echo off
REM Change to project root (this script lives in scripts\)
cd /d "%~dp0.."

REM Start backend API with a fixed Node path
"C:\Users\51184\.trae\binaries\node\versions\22.20.0\node.exe" "api\index.cjs"