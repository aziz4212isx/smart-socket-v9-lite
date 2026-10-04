const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

code = code.replace(
    /\{ type: 'gemini', key: process\.env\.GEMINI_API_KEY_2 \},/g,
    "{ type: 'gemini', key: process.env.GEMINI_API_KEY_2 },\n                { type: 'gemini', key: process.env.GEMINI_API_KEY_3 },"
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Berhasil menambahkan GEMINI_API_KEY_3 ke array apis');
