const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');

// Find the actual command handlers and check their delete logic
const cmds = ['!updateaturan', '!setuproles', '!setuptiket', '!updatepanduan'];
cmds.forEach(cmd => {
    lines.forEach((line, i) => {
        if (line.includes("msg === '" + cmd + "'")) {
            console.log('=== ' + cmd + ' handler at L' + (i+1) + ' ===');
            console.log(lines.slice(i, i+18).join('\n'));
            console.log();
        }
    });
});
