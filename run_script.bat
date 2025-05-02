@echo off
cd /d "C:\Users\admin\Desktop\PROJECTS\my-project\ALARDS\gitpush"
node gencode.js
git add .
git commit -m "Daily code update: %date%"
git push origin master 