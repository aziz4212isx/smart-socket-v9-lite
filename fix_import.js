const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

if (!code.includes("require('./ai_memory.js')")) {
    code = code.replace("const fs = require('fs');", "const fs = require('fs');\nconst { callAIWithMemory, resetMemory } = require('./ai_memory.js');");
    fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
    console.log('Added require for ai_memory.js');
} else {
    console.log('require already exists');
}
