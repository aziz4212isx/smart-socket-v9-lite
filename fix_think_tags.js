const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

code = code.replace(
    /if \(!respText\) \{\n\s*return message\.reply\('.*?'\);\n\s*\}/,
    `if (!respText) {
                return message.reply('⏳ Semua layanan AI sedang sibuk atau limit harian habis. Coba lagi beberapa menit.');
            }

            // Hapus blok pemikiran AI (seperti dari model Qwen/DeepSeek) agar jawaban tidak terlalu panjang
            respText = respText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
            
            // Jika ada AI yang menjawab dalam bahasa Inggris, kita bisa tambahkan instruksi atau biarkan dulu.`
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Regex pembersih <think> berhasil ditambahkan!');
