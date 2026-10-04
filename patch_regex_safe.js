const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const target1 = `    if (baseName.includes('|')) {
        baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
    }`;

const replace1 = `    let oldName = '';
    while (oldName !== baseName) {
        oldName = baseName;
        if (baseName.includes('|')) baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
        baseName = baseName.replace(/^\\[(?!AFK\\]).*?\\]\\s*/i, '').trim();
    }`;

const target2 = `            if (baseName.includes('|')) {
                baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
            }`;

const replace2 = `            let oldName = '';
            while (oldName !== baseName) {
                oldName = baseName;
                if (baseName.includes('|')) baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
                baseName = baseName.replace(/^\\[(?!AFK\\]).*?\\]\\s*/i, '').trim();
            }`;

code = code.replace(target1, replace1);
code = code.replace(target2, replace2);
code = code.replace(target2, replace2);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Saved bot.js');
