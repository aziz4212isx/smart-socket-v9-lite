const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Fix Gemini model
code = code.replace(
    /models\/gemini-1\.5-flash:generateContent/g,
    'models/gemini-flash-latest:generateContent'
);

// 2. Fix Groq model
code = code.replace(
    /model:\s*'llama3-70b-8192'/g,
    "model: 'llama-3.1-70b-versatile'"
);

// 3. Fix OpenRouter model
code = code.replace(
    /model:\s*'meta-llama\/llama-3-8b-instruct:free'/g,
    "model: 'meta-llama/llama-3.1-8b-instruct:free'"
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Semua model AI telah di-update!');
