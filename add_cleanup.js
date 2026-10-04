const fs = require('fs');

let code = fs.readFileSync('D:\\discord_bot\\bot.js', 'utf8');

const cleanupCmd = `
    // ── !cleanup ──
    if (msg === '!cleanup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Hanya Administrator yang bisa menggunakan perintah ini!');
        }

        const guild = message.guild;
        const cleanMsg = await message.reply('Memindai dan membersihkan channel duplikat... Mohon tunggu.');

        try {
            let deleted = 0;

            // Daftar nama channel & kategori yang RESMI (yang ingin dipertahankan)
            const officialCategories = ['INFORMASI', 'ARTIFICIAL INTELLIGENCE', 'OBROLAN UMUM', 'VOICE CHANNELS'];
            const officialChannels = ['verifikasi', 'aturan', 'pengumuman', 'panduan-bot', 'log-server', 'tiket', 'tanya-ai', 'general', 'bot-command', 'media'];

            // Hapus SEMUA kategori yang namanya mirip tapi bukan nama resmi
            // (misalnya yang pakai emoji seperti "👋 INFORMASI", "🤖 ARTIFICIAL INTELLIGENCE", dll)
            const allCategories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);
            
            // Untuk setiap nama resmi, cek apakah ada duplikat
            for (const officialName of officialCategories) {
                const matches = allCategories.filter(c => 
                    c.name === officialName || 
                    c.name.includes(officialName) ||
                    c.name.replace(/[^a-zA-Z ]/g, '').trim().toUpperCase() === officialName.toUpperCase()
                );
                
                if (matches.size > 1) {
                    // Pertahankan yang namanya PERSIS sama dengan nama resmi
                    // Hapus sisanya
                    let kept = false;
                    for (const [, cat] of matches) {
                        if (cat.name === officialName && !kept) {
                            kept = true; // Ini yang dipertahankan
                        } else {
                            // Hapus channel di dalam kategori ini dulu
                            const children = guild.channels.cache.filter(c => c.parentId === cat.id);
                            for (const [, child] of children) {
                                await child.delete('Cleanup: menghapus channel dalam kategori duplikat').catch(() => {});
                                deleted++;
                            }
                            await cat.delete('Cleanup: menghapus kategori duplikat').catch(() => {});
                            deleted++;
                        }
                    }
                }
            }

            // Hapus duplikat channel teks berdasarkan nama
            for (const officialName of officialChannels) {
                const matches = guild.channels.cache.filter(c => 
                    c.type === ChannelType.GuildText && c.name === officialName
                );
                if (matches.size > 1) {
                    let kept = false;
                    for (const [, ch] of matches) {
                        if (!kept) {
                            kept = true;
                        } else {
                            await ch.delete('Cleanup: menghapus channel teks duplikat').catch(() => {});
                            deleted++;
                        }
                    }
                }
            }

            // Hapus juga kategori lama yang masih pakai emoji
            const emojiCategories = guild.channels.cache.filter(c => 
                c.type === ChannelType.GuildCategory &&
                !officialCategories.includes(c.name) &&
                (c.name.includes('INFORMASI') || c.name.includes('ARTIFICIAL') || 
                 c.name.includes('OBROLAN') || c.name.includes('VOICE'))
            );
            for (const [, cat] of emojiCategories) {
                const children = guild.channels.cache.filter(c => c.parentId === cat.id);
                for (const [, child] of children) {
                    // Pindahkan child ke kategori resmi yang sesuai dulu jika ada
                    await child.delete('Cleanup: channel dalam kategori emoji lama').catch(() => {});
                    deleted++;
                }
                await cat.delete('Cleanup: kategori emoji lama').catch(() => {});
                deleted++;
            }

            if (deleted === 0) {
                await cleanMsg.edit('Tidak ditemukan channel atau kategori yang duplikat. Server sudah bersih!');
            } else {
                await cleanMsg.edit('Berhasil menghapus **' + deleted + '** channel/kategori duplikat! Server sekarang sudah rapi.\\n\\nJalankan **!setup** untuk memastikan semua channel resmi ada kembali.');
            }

        } catch (e) {
            console.error('Cleanup error:', e);
            await cleanMsg.edit('Terjadi kesalahan saat cleanup: ' + e.message);
        }
        return;
    }

`;

// Sisipkan sebelum !setup
code = code.replace(
    `    // ── !setup ──`,
    cleanupCmd + `    // ── !setup ──`
);

// Tambahkan !cleanup ke BOT_COMMANDS
code = code.replace(
    `const BOT_COMMANDS = ['!halo', '!ping', '!speedtest', '!invitebots', '!setup', '!updatepanduan', '!updateaturan', '!setuptiket', '!tutuptiket', '!rank', '!info', '!settanggallahir', '!vc'];`,
    `const BOT_COMMANDS = ['!halo', '!ping', '!speedtest', '!invitebots', '!setup', '!cleanup', '!updatepanduan', '!updateaturan', '!setuptiket', '!tutuptiket', '!rank', '!info', '!settanggallahir', '!vc'];`
);

fs.writeFileSync('D:\\discord_bot\\bot.js', code, 'utf8');
console.log('!cleanup command berhasil ditambahkan!');
