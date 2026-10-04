const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');

// Find the AI call section - look for Gemini/Groq API call
lines.forEach((l, i) => {
    if (l.includes('generativelanguage') || l.includes('groq') || l.includes('openrouter') || 
        l.includes('contents:') || l.includes('messages:') || l.includes('callAI') ||
        l.includes('AI_KEY') || l.includes('GEMINI') || l.includes('fetch(')) {
        console.log('L'+(i+1)+':', l.trim().substring(0,120));
    }
});
