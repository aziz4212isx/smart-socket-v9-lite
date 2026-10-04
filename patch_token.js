const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

code = code.replace(
    /respText = await callAIWithMemory\(prompt, memoryId, process\.env\);/g,
    "const aiResult = await callAIWithMemory(prompt, memoryId, process.env);\n                    respText = aiResult.text + '\\n\\n`[💡 Token Dipakai: ' + aiResult.tokens + ' | Memori: ' + aiResult.historyLength + '/20]`';"
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('bot.js updated with token display');
