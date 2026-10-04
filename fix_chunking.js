const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const oldLogic = "await message.reply(respText.length > 1999 ? respText.substring(0, 1995) + '...' : respText);";
const newLogic = `// Memecah pesan panjang menjadi beberapa bubble chat (chunking)
            let remainingText = respText;
            const maxLength = 1950;
            let isFirst = true;

            while (remainingText.length > 0) {
                let chunk = remainingText.length > maxLength ? remainingText.substring(0, maxLength) : remainingText;
                
                if (remainingText.length > maxLength) {
                    const lastNewline = chunk.lastIndexOf('\\n');
                    // Potong di enter terakhir agar rapi (tidak memotong kata di tengah jalan)
                    if (lastNewline > maxLength - 500) { 
                        chunk = chunk.substring(0, lastNewline);
                    }
                }
                
                if (isFirst) {
                    await message.reply(chunk);
                    isFirst = false;
                } else {
                    await message.channel.send(chunk);
                }
                
                remainingText = remainingText.substring(chunk.length).trim();
            }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Sistem multi-bubble chat (chunking) berhasil diterapkan!');
