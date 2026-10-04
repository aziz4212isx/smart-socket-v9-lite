const fs = require('fs');
let botCode = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

let lines = botCode.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('save(FILES.xp, xpData);')) {
        lines[i] = lines[i].replace('save(', 'saveAsync(');
    }
    if (lines[i].includes('save(FILES.economy, economyData);') && lines[i-1].includes('economyData[uid].coins +=')) {
        lines[i] = lines[i].replace('save(', 'saveAsync(');
    }
}
fs.writeFileSync('D:/discord_bot/bot.js', lines.join('\n'), 'utf8');
console.log('OK: Replaced with saveAsync');
