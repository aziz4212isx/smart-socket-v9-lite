const fs = require('fs');

const content = `require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,       // Diperlukan untuk event guildMemberAdd
        GatewayIntentBits.MessageContent 
    ] 
});

let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Daftar command yang TIDAK boleh diteruskan ke AI
const BOT_COMMANDS = ['!halo', '!ping', '!speedtest', '!invitebots', '!setup', '!updatepanduan'];

client.on('ready', () => {
    console.log('Bot berhasil login sebagai ' + client.user.tag + '!');
    client.user.setPresence({
        activities: [{ name: '!halo | !tanya | !speedtest', type: 2 }],
        status: 'online'
    });
});

// =============================================
// EVENT: MEMBER BARU MASUK SERVER
// =============================================
client.on('guildMemberAdd', async (member) => {
    try {
        // Pastikan role gender sudah ada, jika belum buat otomatis
        const guild = member.guild;
        
        let roleLaki = guild.roles.cache.find(r => r.name === 'Laki-laki');
        if (!roleLaki) {
            roleLaki = await guild.roles.create({
                name: 'Laki-laki',
                color: '#3498db',
                reason: 'Auto-created role gender'
            });
        }

        let rolePerempuan = guild.roles.cache.find(r => r.name === 'Perempuan');
        if (!rolePerempuan) {
            rolePerempuan = await guild.roles.create({
                name: 'Perempuan',
                color: '#e91e8c',
                reason: 'Auto-created role gender'
            });
        }

        // Cari channel untuk menyambut member baru
        // Prioritas: #general -> #obrolan -> channel teks pertama yang ditemukan
        const welcomeChannel = guild.channels.cache.find(c => 
            c.name === 'general' && c.type === ChannelType.GuildText
        ) || guild.channels.cache.find(c => 
            c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)
        );

        if (!welcomeChannel) return;

        // Buat embed selamat datang
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Selamat Datang di Server!')
            .setDescription('Halo ' + member.toString() + '! Senang kamu bergabung.\\n\\nSebelum memulai, silakan pilih gender kamu dengan mengklik tombol di bawah ini:')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Laki-laki', value: 'Klik tombol biru di bawah', inline: true },
                { name: 'Perempuan', value: 'Klik tombol merah muda di bawah', inline: true }
            )
            .setFooter({ text: 'Pilihan ini hanya bisa dilakukan sekali. Jika salah, hubungi Admin.' })
            .setTimestamp();

        // Buat tombol pilihan gender
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gender_laki_' + member.id)
                    .setLabel('Laki-laki')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👦'),
                new ButtonBuilder()
                    .setCustomId('gender_perempuan_' + member.id)
                    .setLabel('Perempuan')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👧')
            );

        await welcomeChannel.send({
            content: member.toString(),
            embeds: [welcomeEmbed],
            components: [row]
        });

    } catch (error) {
        console.error('Error di guildMemberAdd:', error);
    }
});

// =============================================
// EVENT: INTERAKSI TOMBOL (Button Click)
// =============================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, member, guild } = interaction;

    // Cek apakah ini tombol gender
    if (customId.startsWith('gender_laki_') || customId.startsWith('gender_perempuan_')) {
        const targetMemberId = customId.split('_').pop();

        // Pastikan hanya member yang bersangkutan yang bisa klik tombolnya
        if (interaction.user.id !== targetMemberId) {
            return interaction.reply({
                content: 'Tombol ini bukan untukmu! Tunggu pesan sambutan milikmu sendiri.',
                ephemeral: true // Hanya terlihat oleh yang mengklik
            });
        }

        // Cek apakah member sudah punya salah satu role gender
        const roleLaki = guild.roles.cache.find(r => r.name === 'Laki-laki');
        const rolePerempuan = guild.roles.cache.find(r => r.name === 'Perempuan');

        const sudahAdaRole = (roleLaki && member.roles.cache.has(roleLaki.id)) ||
                             (rolePerempuan && member.roles.cache.has(rolePerempuan.id));

        if (sudahAdaRole) {
            return interaction.reply({
                content: 'Kamu sudah memiliki role gender. Jika ingin menggantinya, hubungi Admin.',
                ephemeral: true
            });
        }

        try {
            if (customId.startsWith('gender_laki_')) {
                if (roleLaki) await member.roles.add(roleLaki);
                await interaction.reply({
                    content: 'Selamat datang! Role **Laki-laki** telah diberikan kepadamu.',
                    ephemeral: true
                });
            } else {
                if (rolePerempuan) await member.roles.add(rolePerempuan);
                await interaction.reply({
                    content: 'Selamat datang! Role **Perempuan** telah diberikan kepadamu.',
                    ephemeral: true
                });
            }

            // Nonaktifkan tombol setelah dipilih agar tidak bisa diklik ulang
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('gender_laki_done')
                        .setLabel('Laki-laki')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👦')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('gender_perempuan_done')
                        .setLabel('Perempuan')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('👧')
                        .setDisabled(true)
                );

            await interaction.message.edit({ components: [disabledRow] });

        } catch (err) {
            console.error('Error memberikan role:', err);
            await interaction.reply({
                content: 'Gagal memberikan role. Pastikan bot memiliki izin Manage Roles.',
                ephemeral: true
            });
        }
    }
});

// =============================================
// EVENT: PESAN BIASA
// =============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const content_msg = message.content;

    if (content_msg === '!halo') {
        return message.reply('Halo ' + message.author.username + '! Saya adalah Asisten AI Anda. Gunakan !tanya untuk bertanya kepada AI.');
    }

    if (content_msg === '!ping') {
        return message.reply('Pong! Latensi jaringan adalah ' + (Date.now() - message.createdTimestamp) + 'ms.');
    }

    if (content_msg === '!speedtest') {
        const { exec } = require('child_process');
        const speedMsg = await message.reply('Mengukur kecepatan internet server... Tunggu 15-30 detik ya!');
        exec('npx -y fast-cli --json', { timeout: 60000 }, (error, stdout) => {
            if (error) {
                console.error('speedtest error:', error);
                return speedMsg.edit('Gagal melakukan uji kecepatan internet. Pastikan koneksi internet stabil.');
            }
            try {
                const jsonIndex = stdout.indexOf('{');
                if (jsonIndex === -1) throw new Error('Output tidak valid');
                const jsonStr = stdout.substring(jsonIndex);
                const result = JSON.parse(jsonStr);
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Hasil Speedtest Internet')
                    .addFields(
                        { name: 'Download', value: (result.downloadSpeed || '?') + ' ' + (result.downloadUnit || 'Mbps'), inline: true },
                        { name: 'Ping / Latency', value: (result.latency || '?') + ' ms', inline: true },
                        { name: 'Lokasi Server', value: (result.serverLocations && result.serverLocations.length > 0) ? result.serverLocations[0] : 'Unknown', inline: false }
                    )
                    .setFooter({ text: 'Diuji menggunakan server Fast.com (Netflix)' });
                speedMsg.edit({ content: 'Tes Selesai!', embeds: [embed] });
            } catch (err) {
                console.error('Parse error:', err);
                speedMsg.edit('Gagal membaca hasil uji kecepatan.');
            }
        });
        return;
    }

    if (content_msg === '!invitebots') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Rekomendasi Bot Populer')
            .setDescription('Berikut bot-bot populer yang bisa Anda undang ke server:')
            .addFields(
                { name: 'ProBot', value: '[Klik untuk Invite (Moderasi & Leveling)](https://discord.com/oauth2/authorize?client_id=282859044593598464&permissions=8&scope=bot)' },
                { name: 'Jockie Music', value: '[Klik untuk Invite (Pemutar Musik)](https://discord.com/oauth2/authorize?client_id=411916947773587456&permissions=8&scope=bot)' },
                { name: 'Dank Memer', value: '[Klik untuk Invite (Game Ekonomi & Meme)](https://discord.com/oauth2/authorize?client_id=270904126974590976&permissions=8&scope=bot)' },
                { name: 'Mudae', value: '[Klik untuk Invite (Koleksi Karakter Anime)](https://discord.com/api/oauth2/authorize?client_id=432610292342587392&permissions=8&scope=bot)' }
            )
            .setFooter({ text: 'Klik link di atas, pilih server Anda, dan klik Authorize!' });
        return message.reply({ embeds: [embed] });
    }

    if (content_msg === '!updatepanduan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Maaf, hanya Administrator yang bisa memperbarui panduan!');
        }
        const panduanChannel = message.guild.channels.cache.find(c => c.name === 'panduan-bot');
        if (!panduanChannel) {
            return message.reply('Channel #panduan-bot tidak ditemukan. Silakan jalankan !setup terlebih dahulu.');
        }
        try {
            const fetched = await panduanChannel.messages.fetch({ limit: 10 });
            const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 1209600000);
            if (deletable.size > 1) {
                await panduanChannel.bulkDelete(deletable).catch(console.error);
            } else if (deletable.size === 1) {
                await deletable.first().delete().catch(console.error);
            }
            const panduanEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('PANDUAN LENGKAP PENGGUNAAN BOT')
                .setDescription('Selamat datang! Berikut adalah daftar bot yang tersedia beserta fungsinya.')
                .addFields(
                    { 
                        name: '1. ASISTEN AI (Bot Utama Server)', 
                        value: 'Bot pintar berbasis Google Gemini AI. Bisa diajak ngobrol di semua channel!\\n\\n' +
                               '>>> Cara ngobrol:\\n' +
                               '- Ketik di channel #tanya-ai (langsung tanpa prefix)\\n' +
                               '- Gunakan !tanya [pertanyaan] di channel mana pun\\n' +
                               '- Tag @Asisten AI [pertanyaan] di channel mana pun\\n\\n' +
                               'Command lain:\\n' +
                               '!speedtest - Mengukur kecepatan internet komputer server\\n' +
                               '!ping - Mengecek latensi bot\\n' +
                               '!invitebots - Menampilkan daftar link undangan bot populer\\n' +
                               '!halo - Menyapa bot\\n' +
                               '!setup - (Admin) Setup otomatis channel dan role server\\n' +
                               '!updatepanduan - (Admin) Memperbarui panduan ini',
                        inline: false
                    },
                    { 
                        name: '2. JOCKIE MUSIC (Pemutar Musik)', 
                        value: 'Bot musik untuk memutar lagu dari Spotify atau YouTube di Voice Channel.\\n\\n' +
                               '>>> Command dasar:\\n' +
                               'm!play [judul lagu] - Memutar lagu\\n' +
                               'm!skip - Melewati lagu yang sedang diputar\\n' +
                               'm!stop - Menghentikan musik dan mengeluarkan bot\\n' +
                               'm!queue - Melihat antrean lagu\\n\\n' +
                               'TIPS: Masuk ke Voice Channel dulu sebelum mengetik m!play',
                        inline: false
                    },
                    { 
                        name: '3. PROBOT (Moderasi & Leveling)', 
                        value: 'Menjaga server dari spam dan memberikan sistem level XP bagi member aktif.\\n\\n' +
                               '>>> Command dasar:\\n' +
                               '/rank - Melihat level dan kartu profil Anda\\n' +
                               '/top - Melihat leaderboard member paling aktif di server',
                        inline: false
                    },
                    { 
                        name: '4. MUDAE & DANK MEMER (Minigame)', 
                        value: 'Bot game seru untuk hiburan di server.\\n\\n' +
                               '>>> Mudae (Koleksi Karakter Anime):\\n' +
                               '$w $m $h - Roll karakter secara acak\\n\\n' +
                               '>>> Dank Memer (Ekonomi Virtual):\\n' +
                               '/pls beg - Minta uang virtual\\n' +
                               '/pls hunt - Berburu untuk mendapatkan item',
                        inline: false
                    }
                )
                .setFooter({ text: 'Gunakan command bot di channel #bot-command agar channel general tetap rapi!' })
                .setTimestamp();
            await panduanChannel.send({ embeds: [panduanEmbed] });
            if (message.channel.id !== panduanChannel.id) {
                await message.channel.send('<@' + message.author.id + '> Panduan telah diperbarui di <#' + panduanChannel.id + '>!');
            }
        } catch (err) {
            console.error(err);
            await message.channel.send('Gagal memperbarui panduan: ' + err.message).catch(console.error);
        }
        return;
    }

    if (content_msg === '!setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Maaf, hanya Administrator yang bisa menggunakan perintah ini!');
        }
        const guild = message.guild;
        const setupMessage = await message.reply('Memulai proses setup server... Mohon tunggu sebentar.');
        try {
            await setupMessage.edit('Sedang membuat Roles...');
            const roles = [
                { name: 'Admin', color: '#ff0000', permissions: [PermissionsBitField.Flags.Administrator] },
                { name: 'Moderator', color: '#00ff00', permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
                { name: 'VIP', color: '#ffd700', permissions: [] },
                { name: 'Member', color: '#ffffff', permissions: [] },
                { name: 'Laki-laki', color: '#3498db', permissions: [] },
                { name: 'Perempuan', color: '#e91e8c', permissions: [] }
            ];
            for (const roleData of roles) {
                const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
                if (!existingRole) {
                    await guild.roles.create({ name: roleData.name, color: roleData.color, permissions: roleData.permissions, reason: 'Auto setup server' });
                }
            }
            await setupMessage.edit('Sedang membuat Kategori dan Channel...');
            let infoCategory = guild.channels.cache.find(c => c.name === 'INFORMASI' && c.type === ChannelType.GuildCategory);
            if (!infoCategory) infoCategory = await guild.channels.create({ name: 'INFORMASI', type: ChannelType.GuildCategory });
            if (!guild.channels.cache.find(c => c.name === 'aturan' && c.parentId === infoCategory.id))
                await guild.channels.create({ name: 'aturan', type: ChannelType.GuildText, parent: infoCategory.id });
            if (!guild.channels.cache.find(c => c.name === 'pengumuman' && c.parentId === infoCategory.id))
                await guild.channels.create({ name: 'pengumuman', type: ChannelType.GuildText, parent: infoCategory.id });
            if (!guild.channels.cache.find(c => c.name === 'panduan-bot' && c.parentId === infoCategory.id))
                await guild.channels.create({ name: 'panduan-bot', type: ChannelType.GuildText, parent: infoCategory.id });
            let aiCategory = guild.channels.cache.find(c => c.name === 'ARTIFICIAL INTELLIGENCE' && c.type === ChannelType.GuildCategory);
            if (!aiCategory) aiCategory = await guild.channels.create({ name: 'ARTIFICIAL INTELLIGENCE', type: ChannelType.GuildCategory });
            if (!guild.channels.cache.find(c => c.name === 'tanya-ai' && c.parentId === aiCategory.id))
                await guild.channels.create({ name: 'tanya-ai', type: ChannelType.GuildText, parent: aiCategory.id });
            let chatCategory = guild.channels.cache.find(c => c.name === 'OBROLAN UMUM' && c.type === ChannelType.GuildCategory);
            if (!chatCategory) chatCategory = await guild.channels.create({ name: 'OBROLAN UMUM', type: ChannelType.GuildCategory });
            if (!guild.channels.cache.find(c => c.name === 'general' && c.parentId === chatCategory.id))
                await guild.channels.create({ name: 'general', type: ChannelType.GuildText, parent: chatCategory.id });
            if (!guild.channels.cache.find(c => c.name === 'bot-command' && c.parentId === chatCategory.id))
                await guild.channels.create({ name: 'bot-command', type: ChannelType.GuildText, parent: chatCategory.id });
            if (!guild.channels.cache.find(c => c.name === 'media' && c.parentId === chatCategory.id))
                await guild.channels.create({ name: 'media', type: ChannelType.GuildText, parent: chatCategory.id });
            let voiceCategory = guild.channels.cache.find(c => c.name === 'VOICE CHANNELS' && c.type === ChannelType.GuildCategory);
            if (!voiceCategory) voiceCategory = await guild.channels.create({ name: 'VOICE CHANNELS', type: ChannelType.GuildCategory });
            if (!guild.channels.cache.find(c => c.name === 'Lounge' && c.parentId === voiceCategory.id))
                await guild.channels.create({ name: 'Lounge', type: ChannelType.GuildVoice, parent: voiceCategory.id });
            await setupMessage.edit('Setup Server Selesai! Role Laki-laki dan Perempuan juga telah ditambahkan.');
        } catch (error) {
            console.error(error);
            await setupMessage.edit('Terjadi kesalahan saat melakukan setup: ' + error.message);
        }
        return;
    }

    // --- BLOK AI ---
    const isTanyaAiChannel = message.channel.name === 'tanya-ai';
    const isMentioned = message.mentions.has(client.user);
    const isCommandAI = content_msg.startsWith('!tanya ') || content_msg === '!tanya' ||
                        content_msg.startsWith('!ai ') || content_msg === '!ai';

    const isBotCommand = BOT_COMMANDS.some(cmd => content_msg === cmd || content_msg.startsWith(cmd + ' '));
    if (isBotCommand) return;

    if (isTanyaAiChannel || isMentioned || isCommandAI) {
        if (!genAI) {
            return message.reply('Maaf, fitur kecerdasan buatan belum diaktifkan karena GEMINI_API_KEY belum dimasukkan.');
        }
        await message.channel.sendTyping();
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
            let prompt = content_msg;
            if (isMentioned) {
                prompt = content_msg.replace(/<@!?\\d+>/g, '').trim();
            } else if (prompt.startsWith('!tanya ')) {
                prompt = prompt.substring(7).trim();
            } else if (prompt === '!tanya') {
                prompt = '';
            } else if (prompt.startsWith('!ai ')) {
                prompt = prompt.substring(4).trim();
            } else if (prompt === '!ai') {
                prompt = '';
            }
            if (prompt.trim() === '') {
                return message.reply('Ya? Ada yang bisa saya bantu? Ketik pertanyaan Anda. Contoh: !tanya apa itu discord?');
            }
            const result = await model.generateContent(prompt);
            const response = result.response.text();
            if (response.length > 1999) {
                await message.reply(response.substring(0, 1995) + '...');
            } else {
                await message.reply(response);
            }
        } catch (error) {
            console.error(error);
            await message.reply('Maaf, otak AI saya sedang mengalami gangguan. Coba lagi nanti!');
        }
    }
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
`;

fs.writeFileSync('D:\\discord_bot\\bot.js', content, 'utf8');
console.log('bot.js berhasil ditulis dengan fitur welcome + pilih gender!');
