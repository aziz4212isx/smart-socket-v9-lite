const fs = require('fs');
const lines = fs.readFileSync('D:/discord_bot/bot.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('interaction.isChatInputCommand()')) {
        console.log(`${i + 1}: ${lines[i].trim()}`);
    }
}
