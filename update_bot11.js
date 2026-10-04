const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const botPath = path.join(targetDir, 'bot.js');

let botContent = fs.readFileSync(botPath, 'utf8');

const updatePanduanCode = `
    if (message.content === '!updatepanduan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Maaf, hanya Administrator yang bisa memperbarui panduan!');
        }

        const panduanChannel = message.guild.channels.cache.find(c => c.name === 'panduan-bot');
        if (!panduanChannel) {
            return message.reply('Channel #panduan-bot tidak ditemukan. Silakan jalankan \`!setup\` terlebih dahulu.');
        }

        const updateMsg = await message.reply('Memperbarui panduan di channel #panduan-bot... ⏳');

        try {
            // Hapus pesan lama di channel panduan
            const fetched = await panduanChannel.messages.fetch({ limit: 10 });
            await panduanChannel.bulkDelete(fetched);

            // Buat Embed Panduan Lengkap
            const panduanEmbed = new EmbedBuilder()
                .setColor(0x2B2D31) // Warna abu-abu gelap khas Discord
                .setTitle('📚 PANDUAN LENGKAP PENGGUNAAN BOT')
                .setDescription('Selamat datang di server ini! Berikut adalah daftar bot yang tersedia beserta fungsinya:')
                
                .addFields(
                    { 
                        name: '🤖 1. ASISTEN AI (Bot Utama Server)', 
                        value: 'Bot pintar berbasi Google Gemini. Bisa diajak ngobrol dan memiliki utilitas server.\\n' +
                               '**Cara ngobrol:** Ketik di channel \`#tanya-ai\`, ATAU gunakan \`!tanya [pertanyaan]\`, ATAU tag \`@Asisten AI [pertanyaan]\` di channel mana pun.\\n' +
                               '**Command lain:**\\n' +
                               '• \`!speedtest\` : Mengukur kecepatan internet server.\\n' +
                               '• \`!ping\` : Mengecek latensi bot.\\n' +
                               '• \`!invitebots\` : Menampilkan link bot populer.\\n' +
                               '• \`!setup\` : (Khusus Admin) Setup otomatis channel server.\\n' +
                               '• \`!updatepanduan\` : (Khusus Admin) Memperbarui pesan ini.',
                        inline: false
                    },
                    { 
                        name: '🎵 2. JOCKIE MUSIC (Pemutar Musik)', 
                        value: 'Bot musik kualitas tinggi untuk memutar lagu dari Spotify/YouTube di Voice Channel.\\n' +
                               '**Command dasar:**\\n' +
                               '• \`m!play [judul lagu]\` : Memutar lagu.\\n' +
                               '• \`m!skip\` : Melewati lagu yang sedang diputar.\\n' +
                               '• \`m!stop\` : Menghentikan musik dan mengeluarkan bot.\\n' +
                               '• \`m!queue\` : Melihat antrean lagu.\\n' +
                               '*(Masuk ke Voice Channel dulu sebelum mengetik m!play)*',
                        inline: false
                    },
                    { 
                        name: '🛡️ 3. PROBOT (Moderasi & Leveling)', 
                        value: 'Menjaga server dari spam dan memberikan sistem level/XP bagi member yang aktif chat.\\n' +
                               '**Command dasar:**\\n' +
                               '• \`/rank\` : Melihat level dan kartu profil Anda.\\n' +
                               '• \`/top\` : Melihat leaderboard member paling aktif di server.',
                        inline: false
                    },
                    { 
                        name: '🎮 4. MUDAE / DANK MEMER (Minigame)', 
                        value: 'Jika ditambahkan, bot ini digunakan untuk bermain game koleksi karakter anime (Mudae) atau sistem uang virtual (Dank Memer).\\n' +
                               '• **Mudae:** Ketik \`$w\`, \`$m\`, \`$h\` untuk roll karakter.\\n' +
                               '• **Dank Memer:** Ketik \`/pls beg\`, \`/pls hunt\`, dll.',
                        inline: false
                    }
                )
                .setFooter({ text: 'Gunakan command bot di channel #bot-command agar chat general tetap rapi!' })
                .setTimestamp();

            await panduanChannel.send({ embeds: [panduanEmbed] });
            await updateMsg.edit('✅ Panduan lengkap telah berhasil diperbarui di channel <#' + panduanChannel.id + '>!');
        } catch (err) {
            console.error(err);
            await updateMsg.edit('❌ Gagal memperbarui panduan: ' + err.message);
        }
    }
`;

// Insert the command before !setup
botContent = botContent.replace(/    if \(message\.content === '!setup'\)/g, updatePanduanCode + '\n    if (message.content === \'!setup\')');

fs.writeFileSync(botPath, botContent);
console.log('Bot code updated for !updatepanduan');
