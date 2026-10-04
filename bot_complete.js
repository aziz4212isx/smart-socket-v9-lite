const fs = require('fs');

const botCode = `require('dotenv').config();
const {
    Client, GatewayIntentBits, ChannelType, PermissionsBitField,
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent
    ]
});

let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// ─── DATA FILES ───────────────────────────────────────────────
const XP_FILE = './xp_data.json';
const BDAY_FILE = './birthday_data.json';

function loadJSON(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return {}; }
}
function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

let xpData = loadJSON(XP_FILE);
let bdayData = loadJSON(BDAY_FILE);

// XP cooldown per user (userId -> timestamp)
const xpCooldown = new Map();

// Level thresholds & role rewards
const LEVEL_ROLES = {
    5: 'Veteran',
    10: 'Elite',
    20: 'Legend'
};

function getLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
}
function getXPForLevel(level) {
    return Math.pow(level / 0.1, 2);
}

// ─── READY ────────────────────────────────────────────────────
client.on('ready', () => {
    console.log('Bot berhasil login sebagai ' + client.user.tag + '!');
    client.user.setPresence({
        activities: [{ name: '!halo | !tanya | !rank', type: 2 }],
        status: 'online'
    });

    // Cek ulang tahun setiap hari jam 08:00 WIB (01:00 UTC)
    setInterval(async () => {
        const now = new Date();
        if (now.getUTCHours() === 1 && now.getUTCMinutes() === 0) {
            const today = (now.getUTCMonth() + 1).toString().padStart(2,'0') + '-' + now.getUTCDate().toString().padStart(2,'0');
            bdayData = loadJSON(BDAY_FILE);
            for (const [userId, bday] of Object.entries(bdayData)) {
                if (bday.date === today) {
                    try {
                        const guilds = client.guilds.cache;
                        for (const [, guild] of guilds) {
                            const member = await guild.members.fetch(userId).catch(() => null);
                            if (!member) continue;
                            const ch = guild.channels.cache.find(c => c.name === 'general' && c.type === ChannelType.GuildText);
                            if (!ch) continue;
                            const embed = new EmbedBuilder()
                                .setColor(0xFFD700)
                                .setTitle('Selamat Ulang Tahun!')
                                .setDescription('Semoga panjang umur, sehat selalu, dan semua impianmu terkabul! Hore!')
                                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                                .setTimestamp();
                            await ch.send({ content: member.toString(), embeds: [embed] });
                        }
                    } catch (e) { console.error('Birthday error:', e); }
                }
            }
        }
    }, 60000); // cek setiap menit
});

// ─── MEMBER BARU MASUK ────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
    try {
        const guild = member.guild;

        // Pastikan role ada
        let roleVerif = guild.roles.cache.find(r => r.name === 'Belum Verifikasi');
        if (!roleVerif) {
            roleVerif = await guild.roles.create({ name: 'Belum Verifikasi', color: '#808080', reason: 'Auto-created untuk sistem verifikasi' });
        }
        let roleMember = guild.roles.cache.find(r => r.name === 'Member');
        if (!roleMember) {
            roleMember = await guild.roles.create({ name: 'Member', color: '#ffffff', reason: 'Auto-created' });
        }
        let roleLaki = guild.roles.cache.find(r => r.name === 'Laki-laki');
        if (!roleLaki) {
            roleLaki = await guild.roles.create({ name: 'Laki-laki', color: '#3498db', reason: 'Auto-created' });
        }
        let rolePerempuan = guild.roles.cache.find(r => r.name === 'Perempuan');
        if (!rolePerempuan) {
            rolePerempuan = await guild.roles.create({ name: 'Perempuan', color: '#e91e8c', reason: 'Auto-created' });
        }

        // Beri role "Belum Verifikasi"
        await member.roles.add(roleVerif);

        // Kirim pesan verifikasi ke channel #verifikasi
        const verifChannel = guild.channels.cache.find(c => c.name === 'verifikasi' && c.type === ChannelType.GuildText);
        if (verifChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle('Verifikasi Diperlukan')
                .setDescription(member.toString() + ' selamat datang!\\n\\nSebelum bisa mengakses server, kamu harus menyetujui aturan server terlebih dahulu.\\n\\nKlik tombol **Saya Setuju** di bawah ini untuk mendapatkan akses penuh.')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verif_setuju_' + member.id)
                    .setLabel('Saya Setuju dengan Aturan')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

            await verifChannel.send({ content: member.toString(), embeds: [embed], components: [row] });
        }

        // Log ke #log-server
        const logChannel = guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('Member Baru Bergabung')
                .setDescription(member.toString() + ' (' + member.user.tag + ')')
                .addFields(
                    { name: 'ID', value: member.id, inline: true },
                    { name: 'Akun Dibuat', value: member.user.createdAt.toLocaleDateString('id-ID'), inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

    } catch (e) { console.error('guildMemberAdd error:', e); }
});

// ─── MEMBER KELUAR ────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
    try {
        const logChannel = member.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
        if (!logChannel) return;
        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('Member Meninggalkan Server')
            .setDescription(member.user.tag)
            .addFields({ name: 'ID', value: member.id, inline: true })
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });
    } catch (e) { console.error('guildMemberRemove error:', e); }
});

// ─── MEMBER KENA BAN ──────────────────────────────────────────
client.on('guildBanAdd', async (ban) => {
    try {
        const logChannel = ban.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
        if (!logChannel) return;
        const embed = new EmbedBuilder()
            .setColor(0x992D22)
            .setTitle('Member Dibanned')
            .setDescription(ban.user.tag)
            .addFields(
                { name: 'ID', value: ban.user.id, inline: true },
                { name: 'Alasan', value: ban.reason || 'Tidak ada alasan', inline: true }
            )
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });
    } catch (e) { console.error('guildBanAdd error:', e); }
});

// ─── PESAN DIHAPUS ────────────────────────────────────────────
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    try {
        const logChannel = message.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
        if (!logChannel || !message.content) return;
        const embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('Pesan Dihapus')
            .addFields(
                { name: 'Pengirim', value: message.author?.tag || 'Unknown', inline: true },
                { name: 'Channel', value: message.channel.toString(), inline: true },
                { name: 'Isi Pesan', value: message.content.substring(0, 1024) }
            )
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });
    } catch (e) { console.error('messageDelete error:', e); }
});

// ─── PESAN DIEDIT ─────────────────────────────────────────────
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    try {
        const logChannel = oldMsg.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
        if (!logChannel || !oldMsg.content) return;
        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('Pesan Diedit')
            .addFields(
                { name: 'Pengirim', value: oldMsg.author?.tag || 'Unknown', inline: true },
                { name: 'Channel', value: oldMsg.channel.toString(), inline: true },
                { name: 'Sebelum', value: oldMsg.content.substring(0, 512) },
                { name: 'Sesudah', value: newMsg.content?.substring(0, 512) || '-' }
            )
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });
    } catch (e) { console.error('messageUpdate error:', e); }
});

// ─── INTERAKSI TOMBOL ─────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, member, guild } = interaction;

    // ── Verifikasi ──
    if (customId.startsWith('verif_setuju_')) {
        const targetId = customId.replace('verif_setuju_', '');
        if (interaction.user.id !== targetId) {
            return interaction.reply({ content: 'Tombol ini bukan untukmu!', ephemeral: true });
        }
        try {
            const roleVerif = guild.roles.cache.find(r => r.name === 'Belum Verifikasi');
            const roleMember = guild.roles.cache.find(r => r.name === 'Member');
            if (roleVerif) await member.roles.remove(roleVerif);
            if (roleMember) await member.roles.add(roleMember);

            // Nonaktifkan tombol verifikasi
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('verif_done').setLabel('Sudah Diverifikasi').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true)
            );
            await interaction.message.edit({ components: [disabledRow] });

            // Kirim pesan pilih gender ke #general
            const generalCh = guild.channels.cache.find(c => c.name === 'general' && c.type === ChannelType.GuildText);
            if (generalCh) {
                const genderEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('Satu Langkah Lagi!')
                    .setDescription(interaction.user.toString() + ' telah diverifikasi! Sekarang silakan pilih gender kamu:')
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
                const genderRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('gender_laki_' + interaction.user.id).setLabel('Laki-laki').setStyle(ButtonStyle.Primary).setEmoji('👦'),
                    new ButtonBuilder().setCustomId('gender_perempuan_' + interaction.user.id).setLabel('Perempuan').setStyle(ButtonStyle.Danger).setEmoji('👧')
                );
                await generalCh.send({ embeds: [genderEmbed], components: [genderRow] });
            }

            await interaction.reply({ content: 'Verifikasi berhasil! Kamu sekarang bisa mengakses server. Silakan pilih gender di channel #general.', ephemeral: true });
        } catch (e) {
            console.error('Verif error:', e);
            await interaction.reply({ content: 'Terjadi kesalahan saat verifikasi. Hubungi Admin.', ephemeral: true });
        }
        return;
    }

    // ── Pilih Gender ──
    if (customId.startsWith('gender_laki_') || customId.startsWith('gender_perempuan_')) {
        const targetId = customId.split('_').pop();
        if (interaction.user.id !== targetId) {
            return interaction.reply({ content: 'Tombol ini bukan untukmu!', ephemeral: true });
        }
        const roleLaki = guild.roles.cache.find(r => r.name === 'Laki-laki');
        const rolePerempuan = guild.roles.cache.find(r => r.name === 'Perempuan');
        const sudahAda = (roleLaki && member.roles.cache.has(roleLaki.id)) || (rolePerempuan && member.roles.cache.has(rolePerempuan.id));
        if (sudahAda) return interaction.reply({ content: 'Kamu sudah punya role gender. Hubungi Admin untuk mengubahnya.', ephemeral: true });
        try {
            const isLaki = customId.startsWith('gender_laki_');
            if (isLaki && roleLaki) await member.roles.add(roleLaki);
            else if (!isLaki && rolePerempuan) await member.roles.add(rolePerempuan);
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('g1').setLabel('Laki-laki').setStyle(ButtonStyle.Primary).setEmoji('👦').setDisabled(true),
                new ButtonBuilder().setCustomId('g2').setLabel('Perempuan').setStyle(ButtonStyle.Danger).setEmoji('👧').setDisabled(true)
            );
            await interaction.message.edit({ components: [disabledRow] });
            await interaction.reply({ content: 'Role ' + (isLaki ? '**Laki-laki**' : '**Perempuan**') + ' telah diberikan! Selamat bergabung!', ephemeral: true });
        } catch (e) {
            console.error('Gender role error:', e);
            await interaction.reply({ content: 'Gagal memberikan role. Hubungi Admin.', ephemeral: true });
        }
        return;
    }

    // ── Buka Tiket ──
    if (customId === 'buka_tiket') {
        const existingTicket = guild.channels.cache.find(c => c.name === 'tiket-' + interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (existingTicket) {
            return interaction.reply({ content: 'Kamu sudah punya tiket yang terbuka di ' + existingTicket.toString() + '. Selesaikan tiket tersebut dulu sebelum membuka yang baru.', ephemeral: true });
        }
        try {
            const adminRole = guild.roles.cache.find(r => r.name === 'Admin') || guild.roles.cache.find(r => r.permissions.has(PermissionsBitField.Flags.Administrator));
            const ticketChannel = await guild.channels.create({
                name: 'tiket-' + interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''),
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    ...(adminRole ? [{ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }] : [])
                ]
            });

            const ticketEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('Tiket Dukungan')
                .setDescription('Halo ' + interaction.user.toString() + '! Tim Admin akan segera membantu kamu.\\n\\nSilakan jelaskan masalah atau pertanyaan kamu di sini.\\n\\nKetik **!tutuptiket** untuk menutup tiket ini setelah selesai.')
                .setTimestamp();
            await ticketChannel.send({ content: interaction.user.toString() + (adminRole ? ' ' + adminRole.toString() : ''), embeds: [ticketEmbed] });
            await interaction.reply({ content: 'Tiket berhasil dibuat di ' + ticketChannel.toString(), ephemeral: true });
        } catch (e) {
            console.error('Buka tiket error:', e);
            await interaction.reply({ content: 'Gagal membuat tiket. Hubungi Admin.', ephemeral: true });
        }
        return;
    }
});

// ─── BOT COMMANDS ─────────────────────────────────────────────
const BOT_COMMANDS = ['!halo', '!ping', '!speedtest', '!invitebots', '!setup', '!updatepanduan', '!updateaturan', '!setuptiket', '!tutuptiket', '!rank', '!info', '!settanggallahir'];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const msg = message.content.trim();

    // ── !halo ──
    if (msg === '!halo') {
        return message.reply('Halo ' + message.author.username + '! Saya Asisten AI. Gunakan !tanya untuk bertanya, !rank untuk cek level, atau !info @user untuk info member.');
    }

    // ── !ping ──
    if (msg === '!ping') {
        return message.reply('Pong! Latensi jaringan: ' + (Date.now() - message.createdTimestamp) + 'ms.');
    }

    // ── !rank ──
    if (msg === '!rank' || msg.startsWith('!rank ')) {
        const target = message.mentions.users.first() || message.author;
        const uid = target.id;
        const userData = xpData[uid] || { xp: 0, level: 0 };
        const level = getLevel(userData.xp);
        const nextLevelXP = Math.round(getXPForLevel(level + 1));
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('Profil Level - ' + target.username)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Level', value: level.toString(), inline: true },
                { name: 'XP', value: Math.round(userData.xp).toString(), inline: true },
                { name: 'XP ke Level Berikutnya', value: nextLevelXP.toString(), inline: true }
            )
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ── !info ──
    if (msg === '!info' || msg.startsWith('!info ')) {
        const target = message.mentions.members.first() || message.member;
        const joinedDaysAgo = Math.floor((Date.now() - target.joinedTimestamp) / 86400000);
        const roles = target.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).join(', ') || 'Tidak ada';
        const embed = new EmbedBuilder()
            .setColor(0x1ABC9C)
            .setTitle('Informasi Member')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Username', value: target.user.tag, inline: true },
                { name: 'ID', value: target.id, inline: true },
                { name: 'Bergabung ke Server', value: target.joinedAt.toLocaleDateString('id-ID'), inline: true },
                { name: 'Akun Discord Dibuat', value: target.user.createdAt.toLocaleDateString('id-ID'), inline: true },
                { name: 'Sudah di Server', value: joinedDaysAgo + ' hari', inline: true },
                { name: 'Role', value: roles }
            )
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ── !settanggallahir ──
    if (msg.startsWith('!settanggallahir ')) {
        const input = msg.replace('!settanggallahir ', '').trim();
        const parts = input.split('-');
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) || parts[0] < 1 || parts[0] > 31 || parts[1] < 1 || parts[1] > 12) {
            return message.reply('Format salah! Gunakan: !settanggallahir DD-MM\\nContoh: !settanggallahir 17-08');
        }
        const dd = parts[0].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        bdayData = loadJSON(BDAY_FILE);
        bdayData[message.author.id] = { date: mm + '-' + dd, name: message.author.username };
        saveJSON(BDAY_FILE, bdayData);
        return message.reply('Tanggal lahir kamu (' + dd + '-' + mm + ') berhasil disimpan! Bot akan mengucapkan selamat ulang tahun setiap tahunnya.');
    }

    // ── !speedtest ──
    if (msg === '!speedtest') {
        const { exec } = require('child_process');
        const speedMsg = await message.reply('Mengukur kecepatan internet server... Tunggu 15-30 detik ya!');
        exec('npx -y fast-cli --json', { timeout: 60000 }, (error, stdout) => {
            if (error) return speedMsg.edit('Gagal melakukan uji kecepatan internet.');
            try {
                const jsonIndex = stdout.indexOf('{');
                if (jsonIndex === -1) throw new Error('invalid');
                const result = JSON.parse(stdout.substring(jsonIndex));
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Hasil Speedtest Internet')
                    .addFields(
                        { name: 'Download', value: (result.downloadSpeed || '?') + ' ' + (result.downloadUnit || 'Mbps'), inline: true },
                        { name: 'Ping', value: (result.latency || '?') + ' ms', inline: true },
                        { name: 'Server', value: (result.serverLocations?.[0]) || 'Unknown', inline: false }
                    )
                    .setFooter({ text: 'Diuji via Fast.com (Netflix)' });
                speedMsg.edit({ content: 'Tes Selesai!', embeds: [embed] });
            } catch { speedMsg.edit('Gagal membaca hasil uji kecepatan.'); }
        });
        return;
    }

    // ── !invitebots ──
    if (msg === '!invitebots') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Rekomendasi Bot Populer')
            .addFields(
                { name: 'ProBot', value: '[Invite (Moderasi)](https://discord.com/oauth2/authorize?client_id=282859044593598464&permissions=8&scope=bot)' },
                { name: 'Jockie Music', value: '[Invite (Musik)](https://discord.com/oauth2/authorize?client_id=411916947773587456&permissions=8&scope=bot)' },
                { name: 'Dank Memer', value: '[Invite (Game)](https://discord.com/oauth2/authorize?client_id=270904126974590976&permissions=8&scope=bot)' },
                { name: 'Mudae', value: '[Invite (Anime)](https://discord.com/api/oauth2/authorize?client_id=432610292342587392&permissions=8&scope=bot)' }
            );
        return message.reply({ embeds: [embed] });
    }

    // ── !updateaturan ──
    if (msg === '!updateaturan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator yang bisa menggunakan perintah ini!');
        const aturanCh = message.guild.channels.cache.find(c => c.name === 'aturan' && c.type === ChannelType.GuildText);
        if (!aturanCh) return message.reply('Channel #aturan tidak ditemukan. Jalankan !setup terlebih dahulu.');
        try {
            const fetched = await aturanCh.messages.fetch({ limit: 10 });
            const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 1209600000);
            if (deletable.size > 1) await aturanCh.bulkDelete(deletable).catch(() => {});
            else if (deletable.size === 1) await deletable.first().delete().catch(() => {});

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('ATURAN SERVER')
                .setDescription('Demi kenyamanan bersama, semua member wajib mematuhi aturan berikut:')
                .addFields(
                    { name: '1. Hormati Sesama', value: 'Dilarang menghina, merendahkan, atau melecehkan member lain dalam bentuk apapun.' },
                    { name: '2. Dilarang SARA', value: 'Dilarang membahas isu suku, agama, ras, dan antar golongan yang dapat memicu perpecahan.' },
                    { name: '3. Dilarang Spam', value: 'Dilarang mengirim pesan berulang, flood, atau mention berlebihan yang mengganggu.' },
                    { name: '4. Gunakan Channel dengan Benar', value: 'Kirim pesan sesuai topik channel. Gunakan #bot-command untuk perintah bot.' },
                    { name: '5. Dilarang Konten 18+', value: 'Dilarang menyebarkan konten dewasa, kekerasan, atau konten yang tidak pantas.' },
                    { name: '6. Patuhi Staff', value: 'Ikuti instruksi Admin dan Moderator. Keputusan staff adalah final.' },
                    { name: '7. Dilarang Promosi Tanpa Izin', value: 'Dilarang mengiklankan server lain, produk, atau layanan tanpa izin Admin.' }
                )
                .setFooter({ text: 'Pelanggaran aturan dapat berakibat kick atau ban permanen.' })
                .setTimestamp();
            await aturanCh.send({ embeds: [embed] });
            if (message.channel.id !== aturanCh.id) await message.channel.send('<@' + message.author.id + '> Aturan server telah diperbarui di <#' + aturanCh.id + '>!');
        } catch (e) {
            console.error(e);
            await message.channel.send('Gagal memperbarui aturan: ' + e.message);
        }
        return;
    }

    // ── !setuptiket ──
    if (msg === '!setuptiket') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator yang bisa menggunakan perintah ini!');
        const tiketCh = message.guild.channels.cache.find(c => c.name === 'tiket' && c.type === ChannelType.GuildText);
        if (!tiketCh) return message.reply('Channel #tiket tidak ditemukan. Jalankan !setup terlebih dahulu.');
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Sistem Tiket Dukungan')
            .setDescription('Butuh bantuan atau ada masalah yang ingin dilaporkan? Klik tombol di bawah untuk membuat tiket privat dengan Admin.\\n\\n> Tiket akan membuat channel privat khusus untuk kamu dan tim Admin.\\n> Ketik **!tutuptiket** di dalam channel tiket untuk menutupnya.');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buka_tiket').setLabel('Buka Tiket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
        );
        await tiketCh.send({ embeds: [embed], components: [row] });
        return message.reply('Pesan tiket berhasil dikirim ke <#' + tiketCh.id + '>!');
    }

    // ── !tutuptiket ──
    if (msg === '!tutuptiket') {
        if (!message.channel.name.startsWith('tiket-')) return message.reply('Perintah ini hanya bisa digunakan di dalam channel tiket!');
        await message.channel.send('Tiket akan ditutup dalam 5 detik...');
        setTimeout(() => message.channel.delete().catch(console.error), 5000);
        return;
    }

    // ── !updatepanduan ──
    if (msg === '!updatepanduan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator yang bisa memperbarui panduan!');
        const panduanCh = message.guild.channels.cache.find(c => c.name === 'panduan-bot');
        if (!panduanCh) return message.reply('Channel #panduan-bot tidak ditemukan. Jalankan !setup terlebih dahulu.');
        try {
            const fetched = await panduanCh.messages.fetch({ limit: 10 });
            const deletable = fetched.filter(m => (Date.now() - m.createdTimestamp) < 1209600000);
            if (deletable.size > 1) await panduanCh.bulkDelete(deletable).catch(() => {});
            else if (deletable.size === 1) await deletable.first().delete().catch(() => {});

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('PANDUAN LENGKAP PENGGUNAAN BOT')
                .setDescription('Selamat datang! Berikut adalah daftar bot yang tersedia beserta fungsinya.')
                .addFields(
                    { name: '1. ASISTEN AI (Bot Utama)', value: 'Cara ngobrol: ketik di #tanya-ai, !tanya [pertanyaan], atau @Asisten AI [pertanyaan]\\n!speedtest - Cek kecepatan internet\\n!ping - Cek latensi\\n!rank [@user] - Cek level XP\\n!info [@user] - Info profil member\\n!settanggallahir DD-MM - Daftar ulang tahun\\n!invitebots - Daftar link bot populer\\n!setup - (Admin) Setup server\\n!updatepanduan - (Admin) Update panduan\\n!updateaturan - (Admin) Update aturan\\n!setuptiket - (Admin) Aktifkan sistem tiket', inline: false },
                    { name: '2. JOCKIE MUSIC (Musik)', value: 'm!play [lagu] - Putar lagu\\nm!skip - Skip lagu\\nm!stop - Stop musik\\nm!queue - Lihat antrian', inline: false },
                    { name: '3. PROBOT (Moderasi)', value: '/rank - Lihat kartu level\\n/top - Leaderboard server', inline: false },
                    { name: '4. MUDAE & DANK MEMER (Game)', value: 'Mudae: $w $m $h untuk roll karakter\\nDank Memer: /pls beg /pls hunt', inline: false }
                )
                .setFooter({ text: 'Gunakan command di #bot-command agar chat general tetap rapi!' })
                .setTimestamp();
            await panduanCh.send({ embeds: [embed] });
            if (message.channel.id !== panduanCh.id) await message.channel.send('<@' + message.author.id + '> Panduan diperbarui di <#' + panduanCh.id + '>!');
        } catch (e) { await message.channel.send('Gagal memperbarui panduan: ' + e.message); }
        return;
    }

    // ── !setup ──
    if (msg === '!setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator yang bisa menggunakan perintah ini!');
        const guild = message.guild;
        const setupMsg = await message.reply('Memulai setup server... Mohon tunggu.');
        try {
            await setupMsg.edit('Membuat Roles...');
            const roles = [
                { name: 'Admin', color: '#ff0000', permissions: [PermissionsBitField.Flags.Administrator] },
                { name: 'Moderator', color: '#00ff00', permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
                { name: 'VIP', color: '#ffd700', permissions: [] },
                { name: 'Member', color: '#ffffff', permissions: [] },
                { name: 'Veteran', color: '#e67e22', permissions: [] },
                { name: 'Elite', color: '#9b59b6', permissions: [] },
                { name: 'Legend', color: '#e74c3c', permissions: [] },
                { name: 'Laki-laki', color: '#3498db', permissions: [] },
                { name: 'Perempuan', color: '#e91e8c', permissions: [] },
                { name: 'Belum Verifikasi', color: '#808080', permissions: [] }
            ];
            for (const r of roles) {
                if (!guild.roles.cache.find(x => x.name === r.name)) {
                    await guild.roles.create({ name: r.name, color: r.color, permissions: r.permissions, reason: 'Auto setup' });
                }
            }
            await setupMsg.edit('Membuat Kategori dan Channel...');
            const createCat = async (name) => {
                let cat = guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildCategory);
                if (!cat) cat = await guild.channels.create({ name, type: ChannelType.GuildCategory });
                return cat;
            };
            const createTxt = async (name, parentId) => {
                if (!guild.channels.cache.find(c => c.name === name && c.parentId === parentId))
                    await guild.channels.create({ name, type: ChannelType.GuildText, parent: parentId });
            };
            const infoCat = await createCat('INFORMASI');
            await createTxt('verifikasi', infoCat.id);
            await createTxt('aturan', infoCat.id);
            await createTxt('pengumuman', infoCat.id);
            await createTxt('panduan-bot', infoCat.id);
            await createTxt('log-server', infoCat.id);
            await createTxt('tiket', infoCat.id);
            const aiCat = await createCat('ARTIFICIAL INTELLIGENCE');
            await createTxt('tanya-ai', aiCat.id);
            const chatCat = await createCat('OBROLAN UMUM');
            await createTxt('general', chatCat.id);
            await createTxt('bot-command', chatCat.id);
            await createTxt('media', chatCat.id);
            const voiceCat = await createCat('VOICE CHANNELS');
            if (!guild.channels.cache.find(c => c.name === 'Lounge' && c.parentId === voiceCat.id))
                await guild.channels.create({ name: 'Lounge', type: ChannelType.GuildVoice, parent: voiceCat.id });
            await setupMsg.edit('Setup selesai! Semua kategori, channel, dan role telah dibuat.');
        } catch (e) {
            console.error(e);
            await setupMsg.edit('Terjadi kesalahan: ' + e.message);
        }
        return;
    }

    // ─── SISTEM XP (setiap pesan = XP) ──────────────────────
    const uid = message.author.id;
    const now = Date.now();
    const lastXP = xpCooldown.get(uid) || 0;
    if (now - lastXP > 60000) { // cooldown 1 menit
        xpCooldown.set(uid, now);
        xpData = loadJSON(XP_FILE);
        if (!xpData[uid]) xpData[uid] = { xp: 0, level: 0 };
        const oldLevel = getLevel(xpData[uid].xp);
        xpData[uid].xp += Math.floor(Math.random() * 10) + 15; // 15-25 XP per pesan
        const newLevel = getLevel(xpData[uid].xp);
        xpData[uid].level = newLevel;
        saveJSON(XP_FILE, xpData);

        // Level naik?
        if (newLevel > oldLevel) {
            message.channel.send('Selamat ' + message.author.toString() + '! Kamu naik ke **Level ' + newLevel + '**!').catch(() => {});

            // Beri role reward
            if (LEVEL_ROLES[newLevel]) {
                const rewardRole = message.guild.roles.cache.find(r => r.name === LEVEL_ROLES[newLevel]);
                if (rewardRole) message.member.roles.add(rewardRole).catch(() => {});
            }
        }
    }

    // ─── BLOK AI ─────────────────────────────────────────────
    const isBotCmd = BOT_COMMANDS.some(c => msg === c || msg.startsWith(c + ' '));
    if (isBotCmd) return;

    const isTanyaAi = message.channel.name === 'tanya-ai';
    const isMentioned = message.mentions.has(client.user);
    const isAICmd = msg.startsWith('!tanya ') || msg === '!tanya' || msg.startsWith('!ai ') || msg === '!ai';

    if (isTanyaAi || isMentioned || isAICmd) {
        if (!genAI) return message.reply('Fitur AI belum diaktifkan. GEMINI_API_KEY tidak ditemukan.');
        await message.channel.sendTyping();
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
            let prompt = msg;
            if (isMentioned) prompt = msg.replace(/<@!?\\d+>/g, '').trim();
            else if (msg.startsWith('!tanya ')) prompt = msg.substring(7).trim();
            else if (msg === '!tanya') prompt = '';
            else if (msg.startsWith('!ai ')) prompt = msg.substring(4).trim();
            else if (msg === '!ai') prompt = '';
            if (!prompt) return message.reply('Ada yang bisa saya bantu? Ketik pertanyaan kamu. Contoh: !tanya apa itu AI?');
            const result = await model.generateContent(prompt);
            const resp = result.response.text();
            await message.reply(resp.length > 1999 ? resp.substring(0, 1995) + '...' : resp);
        } catch (e) {
            console.error(e);
            await message.reply('Maaf, otak AI saya sedang mengalami gangguan. Coba lagi nanti!');
        }
    }
});

client.on('error', e => console.error('Client error:', e));
process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));

client.login(process.env.DISCORD_TOKEN);
`;

fs.writeFileSync('D:\\discord_bot\\bot.js', botCode, 'utf8');
console.log('bot.js berhasil ditulis dengan semua 8 fitur baru!');
