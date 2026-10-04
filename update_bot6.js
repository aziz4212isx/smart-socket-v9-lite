const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const botPath = path.join(targetDir, 'bot.js');

let botContent = fs.readFileSync(botPath, 'utf8');

// Replace model name from gemini-2.5-flash to gemini-3.6-flash
botContent = botContent.replace('model: "gemini-2.5-flash"', 'model: "gemini-3.6-flash"');

fs.writeFileSync(botPath, botContent);
console.log('Bot code updated to use gemini-3.6-flash');
