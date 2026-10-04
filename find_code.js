const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes("cmd === 'tanya'")) {
        console.log('=== TANYA L' + i + ' ===');
        console.log(lines.slice(i, i+60).join('\n'));
    }
    if (l.includes("msg.startsWith('!tanya ') || msg === '!tanya' || msg.startsWith('!ai ') || msg === '!ai'")) {
        console.log('=== MESSAGE L' + i + ' ===');
        console.log(lines.slice(i, i+60).join('\n'));
    }
}
