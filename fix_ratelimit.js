const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Ganti model ke gemini-1.5-flash (1500 req/hari free tier)
code = code.replace(
    /getGenerativeModel\(\s*\{[^}]*model:\s*['"]gemini-3\.6-flash['"]\s*\}\s*\)/g,
    "getGenerativeModel({ model: 'gemini-1.5-flash' })"
);

// 2. Tambahkan cooldown per-user untuk AI (1 request per 4 detik per user)
code = code.replace(
    `const spamTracker   = new Map(); // userId -> [{content, time}]`,
    `const spamTracker   = new Map(); // userId -> [{content, time}]
const aiCooldown    = new Map(); // userId -> timestamp (AI rate limit per user)`
);

// 3. Ganti AI error handler agar lebih ramah untuk rate limit
code = code.replace(
    `        } catch (e) {
            console.error(e);
            await message.reply('Otak AI saya sedang gangguan. Coba lagi nanti!');
        }
    }
});

// ═══════════════════════════════════════════════════════
// ERROR HANDLERS`,
    `        } catch (e) {
            console.error(e);
            if (e.status === 429) {
                await message.reply('⏳ AI sedang terlalu sibuk karena banyak permintaan. Tunggu **30 detik** lalu coba lagi!');
            } else if (e.message && e.message.includes('quota')) {
                await message.reply('📛 Kuota AI harian habis. Akan reset otomatis besok. Maaf atas ketidaknyamanannya!');
            } else {
                await message.reply('Otak AI saya sedang gangguan. Coba lagi nanti!');
            }
        }
    }
});

// ═══════════════════════════════════════════════════════
// ERROR HANDLERS`
);

// 4. Tambahkan cooldown check sebelum memanggil AI
code = code.replace(
    `            const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });`,
    `            // Cek cooldown per user (hindari spam ke API)
            const lastAI = aiCooldown.get(uid) || 0;
            if (Date.now() - lastAI < 4000) {
                return message.reply('Sabar ya! Tunggu beberapa detik sebelum bertanya lagi.');
            }
            aiCooldown.set(uid, Date.now());
            const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });`
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Model diganti ke gemini-1.5-flash dan rate limit handler ditambahkan!');
