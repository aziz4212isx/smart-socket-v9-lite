const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// The replacement logic:
// We want to replace:
// if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
// let oldName = '';
// while (oldName !== baseName) {
//     oldName = baseName;
//     baseName = baseName.replace(/^\[.*?\]\s*/, '').trim();
//     baseName = baseName.replace(/^[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uD83E][\uDC00-\uDFFF]\s*[A-Za-z0-9_]+\s*/, '').trim();
// }
//
// With:
// if (baseName.includes('|')) {
//     baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
// }

const target = `if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
            let oldName = '';
            while (oldName !== baseName) {
                oldName = baseName;
                baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();
                baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();
            }`;

const replacement = `if (baseName.includes('|')) {
                baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
            }`;

const target2 = `if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
    // Bersihkan semua prefix sisa yang lama secara berulang
    let oldName = '';
    while (oldName !== baseName) {
        oldName = baseName;
        baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();
        baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();
    }`;

const replacement2 = `if (baseName.includes('|')) {
        baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
    }`;

let newCode = code.replace(target, replacement);
newCode = newCode.replace(target, replacement); // twice for both clearrole
newCode = newCode.replace(target2, replacement2); // once for updateNickname

fs.writeFileSync('D:/discord_bot/bot.js', newCode, 'utf8');
console.log('Saved bot.js');
