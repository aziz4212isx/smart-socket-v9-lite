const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const botPath = path.join(targetDir, 'bot.js');

let botContent = fs.readFileSync(botPath, 'utf8');

// Ubah model dari gemini-1.5-flash ke gemini-pro atau gemini-1.5-pro-latest
botContent = botContent.replace('model: "gemini-1.5-flash"', 'model: "gemini-pro"');

fs.writeFileSync(botPath, botContent);
console.log('Bot code updated to use gemini-pro');
