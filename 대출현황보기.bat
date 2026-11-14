@echo off
chcp 65001 >nul
cd /d "%~dp0"
node fetch-loans.js
pause
