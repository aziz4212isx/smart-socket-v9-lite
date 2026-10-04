const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');

// Find /vc handler - how it detects user's active channel
lines.forEach((l, i) => {
    if (l.includes("cmd === 'vc'") || l.includes('vcId') || l.includes('tempChannels.get') || l.includes('tempChannels.entries')) {
        console.log('L' + (i+1) + ':', l.trim().substring(0, 120));
    }
});
