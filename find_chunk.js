const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Find the AI chunking while loop and add delay between bubbles
// Look for: await message.channel.send(chunk).catch(() => {});
// and wrap it with a delay

// The pattern from earlier should be:
// else { await message.channel.send(chunk).catch(() => {}); }
// We need to add a delay before the send

// Find the AI message chunking block
const lines = code.split('\n');
lines.forEach((line, i) => {
    if (line.includes('chunk') && line.includes('message.channel.send')) {
        console.log('L'+(i+1)+':', line.trim());
    }
    if (line.includes('isFirst') && line.includes('false')) {
        console.log('L'+(i+1)+' [isFirst]:', line.trim());
    }
});
