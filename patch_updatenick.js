const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const target = `    let baseName = member.nickname || member.user.username;
    let oldName = '';
    while (oldName !== baseName) {
        oldName = baseName;
        if (baseName.includes('|')) baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
        baseName = baseName.replace(/^\\[(?!AFK\\]).*?\\]\\s*/i, '').trim();
    }`;

const replace = `    let baseName = member.nickname || member.user.username;
    if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
    baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();`;

if (!code.includes(target)) {
    console.error('ERROR: target not found in bot.js!');
    process.exit(1);
}

code = code.replace(target, replace);
fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('OK: updateNickname updated successfully');
