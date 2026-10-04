const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

code = code.replace(
    /model: 'llama-3\.1-70b-versatile'/g,
    "model: 'qwen/qwen3.6-27b'"
);

code = code.replace(
    /model: 'meta-llama\/llama-3\.1-8b-instruct:free'/g,
    "model: 'google/gemma-4-26b-a4b-it:free'"
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Model backup berhasil disesuaikan dengan versi aktif 2026!');
