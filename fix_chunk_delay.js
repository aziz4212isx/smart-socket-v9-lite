const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Add 1200ms delay between AI bubble chunks (anti-rate-limit)
const oldChunk = `                if (isFirst) {
                    await message.reply(chunk);
                    isFirst = false;
                } else {
                    await message.channel.send(chunk).catch(() => {});
                }`;

const newChunk = `                if (isFirst) {
                    await message.reply(chunk).catch(() => {});
                    isFirst = false;
                } else {
                    await new Promise(r => setTimeout(r, 1200));
                    await message.channel.send(chunk).catch(() => {});
                }`;

if (code.includes(oldChunk)) {
    code = code.replace(oldChunk, newChunk);
    console.log('[FIX] Added 1200ms delay to AI chunking loop');
} else {
    console.log('[WARN] Chunk block not found in expected format - check manually');
}

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
