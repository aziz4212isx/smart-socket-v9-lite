const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

code = code.replace(/}\\n\\n    if \\(\\!interaction\\.isButton\\(\\)\\) return;/g, '}    if (!interaction.isButton()) return;');

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Syntax error fixed!');
