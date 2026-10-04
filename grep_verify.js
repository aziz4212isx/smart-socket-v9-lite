const fs = require('fs');
const lines = fs.readFileSync('D:/discord_bot/bot.js', 'utf8').split('\n');
const terms = ["'INFORMASI'", "'VOICE CHANNELS'", "'pilih-role'", "'log-server'", "'aturan'", "'tiket'", "'panduan-bot'", "'tanya-ai'"];

for (const term of terms) {
    console.log('grep -n "' + term + '" bot.js');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(term)) {
            console.log((i+1) + ':' + lines[i]);
            found = true;
        }
    }
    if (!found) console.log('(No matches found)');
    console.log('---');
}
