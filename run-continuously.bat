@echo off
:loop
echo Starting git-contributions script...
node gencode.js
echo Waiting 6 hours before next run...
timeout /t 21600 /nobreak
goto loop 