const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Ganti model ke gemini-flash-latest
code = code.replace(
    /getGenerativeModel\(\s*\{[^}]*model:\s*['"]gemini-1\.5-flash['"]\s*\}\s*\)/g,
    "getGenerativeModel({ model: 'gemini-flash-latest' })"
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Model diganti ke gemini-flash-latest!');
