const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const batPath = path.join(targetDir, 'Start_Bot.bat');

const batContent = `@echo off
title Asisten AI - Discord Bot
color 0B
echo ==============================================
echo       Menjalankan Bot Discord Asisten AI
echo ==============================================
echo.
echo Sedang menyalakan sistem bot...
echo.
cd /d "D:\\discord_bot"
node bot.js
pause
`;

fs.writeFileSync(batPath, batContent);
console.log('Start_Bot.bat created successfully.');
