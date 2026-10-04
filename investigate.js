const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');

// Count updateaturan handlers
let aturanCount = 0;
lines.forEach((l, i) => {
    if (l.includes("msg === '!updateaturan'")) {
        aturanCount++;
        console.log('=== !updateaturan HANDLER #' + aturanCount + ' AT L' + (i+1) + ' ===');
        console.log(lines.slice(i, i+8).join('\n'));
        console.log();
    }
});

// Find buka_tiket interaction handler
lines.forEach((l, i) => {
    if (l.includes('buka_tiket')) {
        console.log('=== buka_tiket AT L' + (i+1) + ' ===');
        console.log(lines.slice(i, i+25).join('\n'));
        console.log();
    }
});
