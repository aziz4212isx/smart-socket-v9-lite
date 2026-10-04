const fs = require('fs');

let bot = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const targetStr = `    if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();\r\n    // Bersihkan semua bracket prefix sisa yang lama\r\n    baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();\r\n    // Bersihkan emoji sisa\r\n    baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();`;

const replacementStr = `    if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();\r\n    // Bersihkan semua prefix sisa yang lama secara berulang\r\n    let oldName = '';\r\n    while (oldName !== baseName) {\r\n        oldName = baseName;\r\n        baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();\r\n        baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();\r\n    }`;

const targetStrLF = targetStr.replace(/\r\n/g, '\n');
const replacementStrLF = replacementStr.replace(/\r\n/g, '\n');

if (bot.includes(targetStr)) {
    bot = bot.replace(targetStr, replacementStr);
    console.log("Bug fixed (CRLF)!");
} else if (bot.includes(targetStrLF)) {
    bot = bot.replace(targetStrLF, replacementStrLF);
    console.log("Bug fixed (LF)!");
} else {
    console.log("Bug target string NOT FOUND! Please check manually.");
}

fs.writeFileSync('D:/discord_bot/bot.js', bot, 'utf8');
console.log("bot.js saved.");
