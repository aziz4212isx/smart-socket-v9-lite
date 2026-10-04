const fs = require('fs');
let code = fs.readFileSync('D:/v9_lite/ai_memory.js', 'utf8');
code = code.replace(
    /model: 'meta-llama\/llama-3\.1-8b-instruct:free'/g,
    "model: 'google/gemma-4-26b-a4b-it:free'"
);
fs.writeFileSync('D:/v9_lite/ai_memory.js', code, 'utf8');
console.log('Fixed OpenRouter model in v9_lite to Gemma 4');
