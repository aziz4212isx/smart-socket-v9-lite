const fs = require('fs');

const BOT = `require('dotenv').config();
const fs = require('fs');
const {
    Client, GatewayIntentBits, ChannelType, PermissionsBitField,
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes
} = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ═══════════════════════════════════════════════════════
// SETUP CLIENT
// ═══════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
});

let genAI = null;
if (process.env.GEMINI_API_KEY) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ═══════════════════════════════════════════════════════
// DATA HELPERS
// ═══════════════════════════════════════════════════════
const FILES = {
    xp:       './xp_data.json',
    bday:     './birthday_data.json',
    economy:  './economy_data.json',
    warns:    './warns_data.json',
    giveaway: './giveaway_data.json',
    afk:      './afk_data.json',
    polls:    './polls_data.json'
};

function load(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } }
function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }

let xpData       = load(FILES.xp);
let bdayData     = load(FILES.bday);
let economyData  = load(FILES.economy);
let warnsData    = load(FILES.warns);
let giveawayData = load(FILES.giveaway);
let afkData      = load(FILES.afk);
let pollsData    = load(FILES.polls);

// ═══════════════════════════════════════════════════════
// CONSTANTS & MAPS
// ═══════════════════════════════════════════════════════
const CREATE_CHANNEL_NAME = 'Buat Channel';
const tempChannels  = new Map(); // channelId -> ownerId
const xpCooldown    = new Map(); // userId -> timestamp
const coinCooldown  = new Map(); // userId -> timestamp
const spamTracker   = new Map(); // userId -> [{content, time}]

const LEVEL_ROLES   = { 5: 'Veteran', 10: 'Elite', 20: 'Legend' };
const SHOP_ITEMS    = [
    { id: 'vip',   name: 'Role VIP',   price: 500,  role: 'VIP' },
    { id: 'elite', name: 'Role Elite', price: 1500, role: 'Elite' },
];

function getLevel(xp)       { return Math.floor(0.1 * Math.sqrt(xp)); }
function getXPForLevel(lv)  { return Math.pow(lv / 0.1, 2); }
function ensureEco(uid)     { if (!economyData[uid]) economyData[uid] = { coins: 0, lastDaily: 0 }; }

// ═══════════════════════════════════════════════════════
// SEND CONTROL PANEL (VC)
// ═══════════════════════════════════════════════════════
async function sendControlPanel(member, channel) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Panel Kontrol Channel Kamu')
        .setDescription('Kamu pemilik **' + channel.name + '**! Gunakan /vc atau tombol berikut:')
        .addFields({ name: 'Command', value:
            '/vc lock - Kunci channel\\n/vc unlock - Buka channel\\n' +
            '/vc rename [nama] - Ganti nama\\n/vc limit [0-99] - Batas member\\n' +
            '/vc kick @user - Keluarkan member\\n/vc transfer @user - Transfer kepemilikan'
        });
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vc_lock_' + channel.id).setLabel('Kunci').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('vc_unlock_' + channel.id).setLabel('Buka').setStyle(ButtonStyle.Success).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('vc_rename_' + channel.id).setLabel('Ganti Nama').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('vc_limit_' + channel.id).setLabel('Batas Member').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
        new ButtonBuilder().setCustomId('vc_kick_' + channel.id).setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('👢')
    );
    try { await member.send({ embeds: [embed], components: [row] }); }
    catch { console.log('DM gagal dikirim ke ' + member.user.tag); }
}

// ═══════════════════════════════════════════════════════
// UPDATE SERVER STATS CHANNELS
// ═══════════════════════════════════════════════════════
async function updateStats(guild) {
    try {
        await guild.members.fetch();
        const total   = guild.memberCount;
        const online  = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
        const bots    = guild.members.cache.filter(m => m.user.bot).size;

        const statsNames = [
            { search: 'Member', newName: '📊 Member: ' + total },
            { search: 'Online',  newName: '🟢 Online: '  + online },
            { search: 'Bot',     newName: '🤖 Bot: '     + bots }
        ];
        for (const s of statsNames) {
            const ch = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.name.includes(s.search));
            if (ch && ch.name !== s.newName) await ch.setName(s.newName).catch(() => {});
        }
    } catch (e) { console.error('updateStats error:', e.message); }
}

// ═══════════════════════════════════════════════════════
// READY EVENT
// ═══════════════════════════════════════════════════════
client.on('ready', () => {
    console.log('Bot login: ' + client.user.tag);
    client.user.setPresence({ activities: [{ name: '/vc | !daily | !rank', type: 2 }], status: 'online' });

    // ── Update stats setiap 10 menit ──
    setInterval(() => {
        client.guilds.cache.forEach(g => updateStats(g));
    }, 600000);

    // ── Cek ulang tahun setiap jam (jam 08:00 WIB = 01:00 UTC) ──
    setInterval(async () => {
        const now = new Date();
        if (now.getUTCHours() !== 1 || now.getUTCMinutes() !== 0) return;
        const today = (now.getUTCMonth()+1).toString().padStart(2,'0') + '-' + now.getUTCDate().toString().padStart(2,'0');
        bdayData = load(FILES.bday);
        for (const [uid, d] of Object.entries(bdayData)) {
            if (d.date !== today) continue;
            for (const [, guild] of client.guilds.cache) {
                const member = await guild.members.fetch(uid).catch(() => null);
                if (!member) continue;
                const ch = guild.channels.cache.find(c => c.name === 'general' && c.type === ChannelType.GuildText);
                if (!ch) continue;
                const embed = new EmbedBuilder()
                    .setColor(0xFFD700).setTitle('Selamat Ulang Tahun! 🎂🎉')
                    .setDescription(member.toString() + ' Semoga panjang umur, sehat selalu, dan semua impianmu terkabul!')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp();
                await ch.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }, 60000);

    // ── Pulihkan giveaway yang masih aktif setelah bot restart ──
    giveawayData = load(FILES.giveaway);
    for (const [msgId, gw] of Object.entries(giveawayData)) {
        const remaining = gw.endsAt - Date.now();
        if (remaining <= 0) { endGiveaway(msgId); continue; }
        setTimeout(() => endGiveaway(msgId), remaining);
    }
});

// ═══════════════════════════════════════════════════════
// GIVEAWAY HELPER
// ═══════════════════════════════════════════════════════
async function endGiveaway(msgId) {
    giveawayData = load(FILES.giveaway);
    const gw = giveawayData[msgId];
    if (!gw) return;

    try {
        const guild   = client.guilds.cache.get(gw.guildId);
        const channel = guild?.channels.cache.get(gw.channelId);
        const msg     = await channel?.messages.fetch(msgId).catch(() => null);
        if (!msg) { delete giveawayData[msgId]; save(FILES.giveaway, giveawayData); return; }

        const participants = gw.participants || [];
        const disabledRow  = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gw_enter_done').setLabel('Giveaway Berakhir').setStyle(ButtonStyle.Secondary).setEmoji('🎉').setDisabled(true)
        );
        await msg.edit({ components: [disabledRow] });

        if (participants.length === 0) {
            await channel.send({ content: '**Giveaway berakhir!** Sayangnya tidak ada peserta untuk **' + gw.prize + '**.' });
        } else {
            const winnerId  = participants[Math.floor(Math.random() * participants.length)];
            const winner    = guild.members.cache.get(winnerId);
            const winEmbed  = new EmbedBuilder()
                .setColor(0xFFD700).setTitle('🎉 Giveaway Selesai!')
                .setDescription('Selamat kepada pemenang **' + gw.prize + '**!')
                .addFields({ name: 'Pemenang', value: winner ? winner.toString() : '<@' + winnerId + '>' })
                .setTimestamp();
            await channel.send({ content: winner ? winner.toString() : '<@' + winnerId + '>', embeds: [winEmbed] });
        }
    } catch (e) { console.error('endGiveaway error:', e); }

    delete giveawayData[msgId];
    save(FILES.giveaway, giveawayData);
}

// ═══════════════════════════════════════════════════════
// GUILD MEMBER ADD
// ═══════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
    try {
        const guild = member.guild;
        await guild.members.fetch();
        const memberNumber = guild.memberCount;

        // Pastikan roles ada
        const ensureRole = async (name, color) => {
            let r = guild.roles.cache.find(x => x.name === name);
            if (!r) r = await guild.roles.create({ name, color, reason: 'Auto-created' });
            return r;
        };
        const roleVerif    = await ensureRole('Belum Verifikasi', '#808080');
        await ensureRole('Member', '#ffffff');
        await ensureRole('Laki-laki', '#3498db');
        await ensureRole('Perempuan', '#e91e8c');

        await member.roles.add(roleVerif);

        // Welcome card embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Selamat Datang di Server! 👋')
            .setDescription('Halo ' + member.toString() + '! Senang kamu bergabung bersama kami.')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Member ke-', value: memberNumber.toString(), inline: true },
                { name: '📅 Akun Dibuat', value: member.user.createdAt.toLocaleDateString('id-ID'), inline: true },
                { name: '📌 Langkah Berikutnya', value: 'Buka channel #verifikasi dan klik tombol **Saya Setuju** untuk mendapatkan akses penuh!', inline: false }
            )
            .setImage('https://i.imgur.com/wSTFkRM.gif')
            .setFooter({ text: 'Baca #aturan sebelum memulai!' })
            .setTimestamp();

        const generalCh = guild.channels.cache.find(c => c.name === 'general' && c.type === ChannelType.GuildText);
        if (generalCh) await generalCh.send({ embeds: [welcomeEmbed] });

        // Verifikasi
        const verifCh = guild.channels.cache.find(c => c.name === 'verifikasi' && c.type === ChannelType.GuildText);
        if (verifCh) {
            const verifEmbed = new EmbedBuilder()
                .setColor(0xE67E22).setTitle('Verifikasi Diperlukan')
                .setDescription(member.toString() + ' klik tombol di bawah untuk menyetujui aturan server dan mendapatkan akses.')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('verif_setuju_' + member.id).setLabel('Saya Setuju dengan Aturan').setStyle(ButtonStyle.Success).setEmoji('✅')
            );
            await verifCh.send({ content: member.toString(), embeds: [verifEmbed], components: [row] });
        }

        // Log
        const logCh = guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
        if (logCh) {
            const logE = new EmbedBuilder().setColor(0x2ECC71).setTitle('Member Baru Bergabung')
                .setDescription(member.toString() + ' (' + member.user.tag + ')')
                .addFields(
                    { name: 'ID', value: member.id, inline: true },
                    { name: 'Akun Dibuat', value: member.user.createdAt.toLocaleDateString('id-ID'), inline: true }
                ).setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp();
            await logCh.send({ embeds: [logE] });
        }
    } catch (e) { console.error('guildMemberAdd error:', e); }
});

// ═══════════════════════════════════════════════════════
// GUILD MEMBER REMOVE
// ═══════════════════════════════════════════════════════
client.on('guildMemberRemove', async (member) => {
    try {
        const logCh = member.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
        if (!logCh) return;
        await logCh.send({ embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle('Member Meninggalkan Server')
            .setDescription(member.user.tag).addFields({ name: 'ID', value: member.id, inline: true })
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp()] });
    } catch (e) { console.error('guildMemberRemove error:', e); }
});

// ═══════════════════════════════════════════════════════
// BAN, DELETE, EDIT LOGS
// ═══════════════════════════════════════════════════════
client.on('guildBanAdd', async (ban) => {
    const logCh = ban.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
    if (!logCh) return;
    await logCh.send({ embeds: [new EmbedBuilder().setColor(0x992D22).setTitle('Member Dibanned')
        .setDescription(ban.user.tag).addFields({ name: 'Alasan', value: ban.reason || 'Tidak ada alasan' }).setTimestamp()] });
});

client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot || !message.content) return;
    const logCh = message.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
    if (!logCh) return;
    await logCh.send({ embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle('Pesan Dihapus')
        .addFields(
            { name: 'Pengirim', value: message.author?.tag || 'Unknown', inline: true },
            { name: 'Channel', value: message.channel.toString(), inline: true },
            { name: 'Isi', value: message.content.substring(0, 1024) }
        ).setTimestamp()] }).catch(() => {});
});

client.on('messageUpdate', async (o, n) => {
    if (!o.guild || o.author?.bot || o.content === n.content || !o.content) return;
    const logCh = o.guild.channels.cache.find(c => c.name === 'log-server' && c.type === ChannelType.GuildText);
    if (!logCh) return;
    await logCh.send({ embeds: [new EmbedBuilder().setColor(0xF39C12).setTitle('Pesan Diedit')
        .addFields(
            { name: 'Pengirim', value: o.author?.tag || 'Unknown', inline: true },
            { name: 'Channel', value: o.channel.toString(), inline: true },
            { name: 'Sebelum', value: o.content.substring(0, 512) },
            { name: 'Sesudah', value: (n.content || '-').substring(0, 512) }
        ).setTimestamp()] }).catch(() => {});
});

// ═══════════════════════════════════════════════════════
// VOICE STATE UPDATE (Creator Channel)
// ═══════════════════════════════════════════════════════
client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild || oldState.guild;

    if (newState.channel?.name === CREATE_CHANNEL_NAME) {
        try {
            const member = newState.member;
            const voiceCat = guild.channels.cache.find(c => c.name === 'VOICE CHANNELS' && c.type === ChannelType.GuildCategory);
            const newCh = await guild.channels.create({
                name: member.user.username + 's Channel',
                type: ChannelType.GuildVoice,
                parent: voiceCat?.id || null,
                userLimit: 0,
                permissionOverwrites: [
                    { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.PrioritySpeaker, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] },
                    { id: guild.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel] }
                ]
            });
            await member.voice.setChannel(newCh);
            tempChannels.set(newCh.id, member.id);
            await sendControlPanel(member, newCh);
            console.log('Temp channel created: ' + newCh.name);
        } catch (e) { console.error('Creator channel error:', e); }
        return;
    }

    if (oldState.channel && tempChannels.has(oldState.channel.id)) {
        if (oldState.channel.members.size === 0) {
            await oldState.channel.delete('Temporary channel kosong').catch(() => {});
            tempChannels.delete(oldState.channel.id);
        }
    }
});

// ═══════════════════════════════════════════════════════
// INTERACTION HANDLER
// ═══════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {

    // ── /vc Slash Command ──────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'vc') {
        const sub    = interaction.options.getSubcommand();
        const guild  = interaction.guild;
        const member = interaction.member;
        const entry  = [...tempChannels.entries()].find(([, o]) => o === interaction.user.id);

        if (sub === 'help') {
            return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('Panel /vc').addFields({ name: 'Commands', value:
                '/vc info - Info channel aktifmu\\n/vc lock | /vc unlock | /vc rename [nama]\\n/vc limit [0-99] | /vc kick @member | /vc transfer @member'
            })], ephemeral: true });
        }

        if (sub === 'info') {
            const infoEntry = [...tempChannels.entries()].find(([, o]) => o === interaction.user.id);
            if (!infoEntry) return interaction.reply({ content: 'Kamu tidak punya channel aktif! Masuk ke **Buat Channel** dulu.', ephemeral: true });
            const [infoVcId] = infoEntry;
            const infoVcCh = guild.channels.cache.get(infoVcId);
            if (!infoVcCh) { tempChannels.delete(infoVcId); return interaction.reply({ content: 'Channel tidak ditemukan.', ephemeral: true }); }
            const isLocked = infoVcCh.permissionOverwrites.cache.get(guild.id)?.deny?.has(PermissionsBitField.Flags.Connect) || false;
            const memberList = infoVcCh.members.map(m => m.toString()).join('\\n') || 'Tidak ada member';
            const infoEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('Info Channel - ' + infoVcCh.name)
                .addFields(
                    { name: '👑 Pemilik', value: interaction.user.toString(), inline: true },
                    { name: '👥 Member', value: infoVcCh.members.size + (infoVcCh.userLimit > 0 ? '/' + infoVcCh.userLimit : ' (bebas)'), inline: true },
                    { name: '🔒 Status', value: isLocked ? 'Terkunci' : 'Terbuka', inline: true },
                    { name: '📋 Daftar Member', value: memberList }
                )
                .setFooter({ text: 'Gunakan /vc help untuk melihat semua command' })
                .setTimestamp();
            return interaction.reply({ embeds: [infoEmbed], ephemeral: true });
        }
        if (!entry) return interaction.reply({ content: 'Kamu tidak punya channel aktif! Masuk ke **Buat Channel** dulu.', ephemeral: true });
        const [vcId] = entry;
        const vcCh = guild.channels.cache.get(vcId);
        if (!vcCh) { tempChannels.delete(vcId); return interaction.reply({ content: 'Channel tidak ditemukan.', ephemeral: true }); }

        if (sub === 'lock') {
            await vcCh.permissionOverwrites.edit(guild.id, { Connect: false }).catch(() => {});
            return interaction.reply({ content: '🔒 Channel **' + vcCh.name + '** dikunci!', ephemeral: true });
        }
        if (sub === 'unlock') {
            await vcCh.permissionOverwrites.edit(guild.id, { Connect: true }).catch(() => {});
            return interaction.reply({ content: '🔓 Channel **' + vcCh.name + '** dibuka!', ephemeral: true });
        }
        if (sub === 'rename') {
            const n = interaction.options.getString('nama');
            await vcCh.setName(n).catch(() => {});
            return interaction.reply({ content: '✏️ Nama diubah menjadi **' + n + '**!', ephemeral: true });
        }
        if (sub === 'limit') {
            const lim = interaction.options.getInteger('jumlah');
            await vcCh.setUserLimit(lim).catch(() => {});
            return interaction.reply({ content: '👥 Batas diubah: **' + (lim === 0 ? 'Tidak terbatas' : lim + ' orang') + '**!', ephemeral: true });
        }
        if (sub === 'kick') {
            const t = guild.members.cache.get(interaction.options.getUser('member').id);
            if (!t || t.voice.channelId !== vcId) return interaction.reply({ content: 'Member tidak ada di channel kamu!', ephemeral: true });
            await t.voice.disconnect().catch(() => {});
            return interaction.reply({ content: '👢 **' + t.user.username + '** dikeluarkan!', ephemeral: true });
        }
        if (sub === 'transfer') {
            const t = guild.members.cache.get(interaction.options.getUser('member').id);
            if (!t || t.voice.channelId !== vcId) return interaction.reply({ content: 'Member harus ada di channel kamu!', ephemeral: true });
            tempChannels.set(vcId, t.id);
            await vcCh.permissionOverwrites.edit(t.id, { ManageChannels: true, MuteMembers: true, DeafenMembers: true, MoveMembers: true }).catch(() => {});
            await vcCh.permissionOverwrites.delete(interaction.user.id).catch(() => {});
            await sendControlPanel(t, vcCh);
            return interaction.reply({ content: '👑 Kepemilikan ditransfer ke **' + t.user.username + '**!', ephemeral: true });
        }
        return;
    }

    if (!interaction.isButton()) return;
    const { customId, member, guild } = interaction;

    // ── Verifikasi ──
    if (customId.startsWith('verif_setuju_')) {
        if (interaction.user.id !== customId.replace('verif_setuju_', ''))
            return interaction.reply({ content: 'Tombol ini bukan untukmu!', ephemeral: true });
        try {
            const rVerif  = guild.roles.cache.find(r => r.name === 'Belum Verifikasi');
            const rMember = guild.roles.cache.find(r => r.name === 'Member');
            if (rVerif)  await member.roles.remove(rVerif);
            if (rMember) await member.roles.add(rMember);
            const disR = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v_done').setLabel('Terverifikasi').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true)
            );
            await interaction.message.edit({ components: [disR] });
            const genCh = guild.channels.cache.find(c => c.name === 'general' && c.type === ChannelType.GuildText);
            if (genCh) {
                const gRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('gender_laki_' + interaction.user.id).setLabel('Laki-laki').setStyle(ButtonStyle.Primary).setEmoji('👦'),
                    new ButtonBuilder().setCustomId('gender_perempuan_' + interaction.user.id).setLabel('Perempuan').setStyle(ButtonStyle.Danger).setEmoji('👧')
                );
                await genCh.send({ content: interaction.user.toString() + ' telah diverifikasi! Pilih gender:', components: [gRow] });
            }
            return interaction.reply({ content: '✅ Verifikasi berhasil! Silakan pilih gender di #general.', ephemeral: true });
        } catch (e) { return interaction.reply({ content: 'Gagal verifikasi: ' + e.message, ephemeral: true }); }
    }

    // ── Pilih Gender ──
    if (customId.startsWith('gender_laki_') || customId.startsWith('gender_perempuan_')) {
        const tid = customId.split('_').pop();
        if (interaction.user.id !== tid) return interaction.reply({ content: 'Tombol ini bukan untukmu!', ephemeral: true });
        const rL = guild.roles.cache.find(r => r.name === 'Laki-laki');
        const rP = guild.roles.cache.find(r => r.name === 'Perempuan');
        if ((rL && member.roles.cache.has(rL.id)) || (rP && member.roles.cache.has(rP.id)))
            return interaction.reply({ content: 'Kamu sudah punya role gender.', ephemeral: true });
        const isL = customId.startsWith('gender_laki_');
        if (isL && rL) await member.roles.add(rL).catch(() => {});
        else if (!isL && rP) await member.roles.add(rP).catch(() => {});
        const disR = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('g1').setLabel('Laki-laki').setStyle(ButtonStyle.Primary).setEmoji('👦').setDisabled(true),
            new ButtonBuilder().setCustomId('g2').setLabel('Perempuan').setStyle(ButtonStyle.Danger).setEmoji('👧').setDisabled(true)
        );
        await interaction.message.edit({ components: [disR] }).catch(() => {});
        return interaction.reply({ content: 'Role **' + (isL ? 'Laki-laki' : 'Perempuan') + '** diberikan! Selamat bergabung! 🎉', ephemeral: true });
    }

    // ── Reaction Roles ──
    if (customId.startsWith('role_')) {
        const roleName = { role_gamer: 'Gamer', role_musik: 'Pecinta Musik', role_kreator: 'Kreator', role_pelajar: 'Pelajar', role_kompetitif: 'Kompetitif' }[customId];
        if (!roleName) return;
        let role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) role = await guild.roles.create({ name: roleName, reason: 'Reaction role' }).catch(() => null);
        if (!role) return interaction.reply({ content: 'Gagal membuat role.', ephemeral: true });
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role).catch(() => {});
            return interaction.reply({ content: 'Role **' + roleName + '** dilepas!', ephemeral: true });
        } else {
            await member.roles.add(role).catch(() => {});
            return interaction.reply({ content: 'Role **' + roleName + '** diberikan!', ephemeral: true });
        }
    }

    // ── Giveaway Enter ──
    if (customId.startsWith('gw_enter_')) {
        const msgId = customId.replace('gw_enter_', '');
        giveawayData = load(FILES.giveaway);
        const gw = giveawayData[msgId];
        if (!gw) return interaction.reply({ content: 'Giveaway tidak ditemukan atau sudah berakhir.', ephemeral: true });
        if (gw.participants.includes(interaction.user.id))
            return interaction.reply({ content: 'Kamu sudah terdaftar dalam giveaway ini!', ephemeral: true });
        gw.participants.push(interaction.user.id);
        save(FILES.giveaway, giveawayData);
        return interaction.reply({ content: '🎉 Kamu berhasil masuk ke giveaway **' + gw.prize + '**! (' + gw.participants.length + ' peserta)', ephemeral: true });
    }

    // ── Poll Vote ──
    if (customId.startsWith('poll_vote_')) {
        const parts  = customId.replace('poll_vote_', '').split('_');
        const pollId = parts[0];
        const optIdx = parseInt(parts[1]);
        pollsData = load(FILES.polls);
        const poll = pollsData[pollId];
        if (!poll) return interaction.reply({ content: 'Poll tidak ditemukan atau sudah ditutup.', ephemeral: true });
        if (poll.voters[interaction.user.id] !== undefined)
            return interaction.reply({ content: 'Kamu sudah vote di poll ini!', ephemeral: true });
        poll.voters[interaction.user.id] = optIdx;
        poll.options[optIdx].votes++;
        save(FILES.polls, pollsData);
        return interaction.reply({ content: 'Vote untuk **' + poll.options[optIdx].label + '** berhasil dicatat!', ephemeral: true });
    }

    // ── Buka Tiket ──
    if (customId === 'buka_tiket') {
        const existing = guild.channels.cache.find(c => c.name === 'tiket-' + interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (existing) return interaction.reply({ content: 'Kamu sudah punya tiket di ' + existing.toString(), ephemeral: true });
        try {
            const adminRole = guild.roles.cache.find(r => r.name === 'Admin') || guild.roles.cache.find(r => r.permissions.has(PermissionsBitField.Flags.Administrator));
            const tCh = await guild.channels.create({
                name: 'tiket-' + interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''),
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    ...(adminRole ? [{ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }] : [])
                ]
            });
            await tCh.send({ content: interaction.user.toString() + (adminRole ? ' ' + adminRole.toString() : ''), embeds: [
                new EmbedBuilder().setColor(0x5865F2).setTitle('Tiket Dibuat').setDescription('Jelaskan masalah kamu. Ketik **!tutuptiket** setelah selesai.').setTimestamp()
            ]});
            return interaction.reply({ content: 'Tiket dibuat di ' + tCh.toString(), ephemeral: true });
        } catch (e) { return interaction.reply({ content: 'Gagal buat tiket: ' + e.message, ephemeral: true }); }
    }

    // ── VC Panel Buttons ──
    if (customId.startsWith('vc_lock_') || customId.startsWith('vc_unlock_') || customId.startsWith('vc_rename_') || customId.startsWith('vc_limit_') || customId.startsWith('vc_kick_')) {
        const parts = customId.split('_');
        const action = parts[1];
        const chId = parts[parts.length - 1];
        const ownerId = tempChannels.get(chId);
        if (!ownerId || interaction.user.id !== ownerId)
            return interaction.reply({ content: 'Hanya pemilik channel yang bisa menggunakan ini!', ephemeral: true });
        const vcCh = guild.channels.cache.get(chId);
        if (!vcCh) return interaction.reply({ content: 'Channel tidak ditemukan.', ephemeral: true });
        if (action === 'lock') { await vcCh.permissionOverwrites.edit(guild.id, { Connect: false }); return interaction.reply({ content: '🔒 Channel dikunci!', ephemeral: true }); }
        if (action === 'unlock') { await vcCh.permissionOverwrites.edit(guild.id, { Connect: true }); return interaction.reply({ content: '🔓 Channel dibuka!', ephemeral: true }); }
        if (action === 'rename') return interaction.reply({ content: 'Gunakan: \`/vc rename [nama baru]\`', ephemeral: true });
        if (action === 'limit')  return interaction.reply({ content: 'Gunakan: \`/vc limit [angka]\`', ephemeral: true });
        if (action === 'kick')   return interaction.reply({ content: 'Gunakan: \`/vc kick @member\`', ephemeral: true });
    }
});

// ═══════════════════════════════════════════════════════
// BOT COMMANDS
// ═══════════════════════════════════════════════════════
const BOT_COMMANDS = ['!halo','!ping','!speedtest','!invitebots','!setup','!cleanup','!updatepanduan','!updateaturan','!setuptiket','!tutuptiket','!setuproles','!rank','!info','!settanggallahir','!vc','!warn','!warns','!clearwarn','!saldo','!daily','!transfer','!leaderboard','!shop','!beli','!giveaway','!endgiveaway','!poll','!endpoll','!afk'];

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const msg = message.content.trim();

    // ══ AFK: Cek jika ada yang mention member AFK ══
    if (message.mentions.users.size > 0) {
        afkData = load(FILES.afk);
        for (const [uid, data] of Object.entries(afkData)) {
            if (message.mentions.users.has(uid)) {
                const since = Math.floor((Date.now() - data.since) / 60000);
                await message.reply('**' + data.name + '** sedang AFK sejak ' + since + ' menit lalu. Alasan: *' + data.reason + '*').catch(() => {});
            }
        }
    }

    // ══ AFK: Hapus status AFK jika member yang AFK kirim pesan ══
    afkData = load(FILES.afk);
    if (afkData[message.author.id] && !msg.startsWith('!afk')) {
        delete afkData[message.author.id];
        save(FILES.afk, afkData);
        await message.reply('Status AFK kamu telah dihapus. Selamat datang kembali!').catch(() => {});
        try {
            const nick = message.member.nickname;
            if (nick && nick.startsWith('[AFK] ')) await message.member.setNickname(nick.replace('[AFK] ', '')).catch(() => {});
        } catch {}
    }

    // ══ ANTI-SPAM ══
    const now = Date.now();
    const uid = message.author.id;
    const spamHistory = spamTracker.get(uid) || [];
    const recent = spamHistory.filter(x => now - x.time < 5000);
    recent.push({ content: msg, time: now });
    spamTracker.set(uid, recent);

    const sameCount   = recent.filter(x => x.content === msg).length;
    const mentionCount = message.mentions.users.size;

    if (sameCount >= 3 || mentionCount > 5) {
        await message.delete().catch(() => {});
        warnsData = load(FILES.warns);
        if (!warnsData[uid]) warnsData[uid] = { warns: 0, history: [] };
        warnsData[uid].warns++;
        warnsData[uid].history.push({ reason: sameCount >= 3 ? 'Spam pesan' : 'Mention berlebihan', time: new Date().toISOString() });
        save(FILES.warns, warnsData);
        const warnCount = warnsData[uid].warns;
        const warnMsg = await message.channel.send(message.author.toString() + ' Peringatan #' + warnCount + '! ' + (sameCount >= 3 ? 'Jangan spam pesan yang sama!' : 'Jangan mention terlalu banyak orang!')).catch(() => null);
        if (warnCount >= 3) {
            await message.member.timeout(10 * 60 * 1000, 'Spam berulang - auto timeout').catch(() => {});
            if (warnMsg) await warnMsg.edit(message.author.toString() + ' Kamu telah di-timeout selama 10 menit karena spam berulang!').catch(() => {});
        }
        setTimeout(() => warnMsg?.delete().catch(() => {}), 10000);
        return;
    }

    // ══ XP & ECONOMY PER PESAN ══
    const lastXP  = xpCooldown.get(uid) || 0;
    const lastCoin = coinCooldown.get(uid) || 0;
    if (now - lastXP > 60000) {
        xpCooldown.set(uid, now);
        xpData = load(FILES.xp);
        if (!xpData[uid]) xpData[uid] = { xp: 0, level: 0 };
        const oldLv = getLevel(xpData[uid].xp);
        xpData[uid].xp += Math.floor(Math.random() * 10) + 15;
        const newLv = getLevel(xpData[uid].xp);
        xpData[uid].level = newLv;
        save(FILES.xp, xpData);
        if (newLv > oldLv) {
            message.channel.send('🎉 Selamat ' + message.author.toString() + '! Naik ke **Level ' + newLv + '**!').catch(() => {});
            const rR = LEVEL_ROLES[newLv];
            if (rR) { const role = message.guild.roles.cache.find(r => r.name === rR); if (role) message.member.roles.add(role).catch(() => {}); }
        }
    }
    if (now - lastCoin > 60000) {
        coinCooldown.set(uid, now);
        economyData = load(FILES.economy);
        ensureEco(uid);
        economyData[uid].coins += Math.floor(Math.random() * 10) + 5;
        save(FILES.economy, economyData);
    }

    // ══════════════════════════════════════
    // COMMAND HANDLERS
    // ══════════════════════════════════════

    if (msg === '!halo') return message.reply('Halo ' + message.author.username + '! Ada yang bisa dibantu?');
    if (msg === '!ping') return message.reply('Pong! Latensi: ' + (Date.now() - message.createdTimestamp) + 'ms');

    // ── !warn ──
    if (msg.startsWith('!warn ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('Kamu tidak punya izin!');
        const target = message.mentions.members.first();
        const reason = msg.split(' ').slice(2).join(' ') || 'Tidak ada alasan';
        if (!target) return message.reply('Sebutkan member yang akan diberi peringatan!');
        warnsData = load(FILES.warns);
        if (!warnsData[target.id]) warnsData[target.id] = { warns: 0, history: [] };
        warnsData[target.id].warns++;
        warnsData[target.id].history.push({ reason, time: new Date().toISOString() });
        save(FILES.warns, warnsData);
        return message.reply('⚠️ ' + target.user.tag + ' mendapat peringatan #' + warnsData[target.id].warns + '. Alasan: ' + reason);
    }

    if (msg.startsWith('!warns')) {
        const target = message.mentions.users.first() || message.author;
        warnsData = load(FILES.warns);
        const d = warnsData[target.id];
        if (!d || d.warns === 0) return message.reply(target.tag + ' tidak memiliki peringatan.');
        const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('Peringatan - ' + target.tag)
            .addFields({ name: 'Total Peringatan', value: d.warns.toString(), inline: true })
            .setDescription(d.history.slice(-5).map((h,i) => (i+1) + '. ' + h.reason + ' - ' + new Date(h.time).toLocaleDateString('id-ID')).join('\\n'));
        return message.reply({ embeds: [embed] });
    }

    if (msg.startsWith('!clearwarn')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const target = message.mentions.users.first();
        if (!target) return message.reply('Sebutkan member!');
        warnsData = load(FILES.warns);
        delete warnsData[target.id];
        save(FILES.warns, warnsData);
        return message.reply('✅ Semua peringatan ' + target.tag + ' telah dihapus.');
    }

    // ── !rank ──
    if (msg === '!rank' || msg.startsWith('!rank ')) {
        const target = message.mentions.users.first() || message.author;
        xpData = load(FILES.xp);
        const d = xpData[target.id] || { xp: 0, level: 0 };
        const lv = getLevel(d.xp);
        const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('Level - ' + target.username)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Level', value: lv.toString(), inline: true },
                { name: 'XP', value: Math.round(d.xp).toString(), inline: true },
                { name: 'XP ke Level Berikutnya', value: Math.round(getXPForLevel(lv + 1)).toString(), inline: true }
            ).setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ── !info ──
    if (msg === '!info' || msg.startsWith('!info ')) {
        const target = message.mentions.members.first() || message.member;
        const days   = Math.floor((Date.now() - target.joinedTimestamp) / 86400000);
        const roles  = target.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).join(', ') || 'Tidak ada';
        const embed  = new EmbedBuilder().setColor(0x1ABC9C).setTitle('Informasi Member')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Username', value: target.user.tag, inline: true },
                { name: 'ID', value: target.id, inline: true },
                { name: 'Bergabung', value: target.joinedAt.toLocaleDateString('id-ID'), inline: true },
                { name: 'Akun Dibuat', value: target.user.createdAt.toLocaleDateString('id-ID'), inline: true },
                { name: 'Di Server', value: days + ' hari', inline: true },
                { name: 'Role', value: roles }
            ).setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ── !settanggallahir ──
    if (msg.startsWith('!settanggallahir ')) {
        const p = msg.replace('!settanggallahir ', '').split('-');
        if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1]) || p[0]<1||p[0]>31||p[1]<1||p[1]>12)
            return message.reply('Format salah! Contoh: !settanggallahir 17-08');
        bdayData = load(FILES.bday);
        bdayData[message.author.id] = { date: p[1].padStart(2,'0') + '-' + p[0].padStart(2,'0'), name: message.author.username };
        save(FILES.bday, bdayData);
        return message.reply('Tanggal lahir ' + p[0].padStart(2,'0') + '-' + p[1].padStart(2,'0') + ' berhasil disimpan! 🎂');
    }

    // ── !saldo ──
    if (msg === '!saldo' || msg.startsWith('!saldo ')) {
        const target = message.mentions.users.first() || message.author;
        economyData = load(FILES.economy);
        ensureEco(target.id);
        const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle('Saldo Koin - ' + target.username)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields({ name: '💰 Koin', value: economyData[target.id].coins.toString() + ' koin', inline: true }).setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // ── !daily ──
    if (msg === '!daily') {
        economyData = load(FILES.economy);
        ensureEco(uid);
        const last = economyData[uid].lastDaily || 0;
        const diff = Date.now() - last;
        if (diff < 86400000) {
            const jam = Math.floor((86400000 - diff) / 3600000);
            const mnt = Math.floor(((86400000 - diff) % 3600000) / 60000);
            return message.reply('Kamu sudah claim daily hari ini! Tunggu **' + jam + ' jam ' + mnt + ' menit** lagi.');
        }
        const reward = Math.floor(Math.random() * 400) + 100;
        economyData[uid].coins     += reward;
        economyData[uid].lastDaily  = Date.now();
        save(FILES.economy, economyData);
        return message.reply('✅ Kamu mendapat **' + reward + ' koin** dari reward harian! Saldo: ' + economyData[uid].coins + ' koin.');
    }

    // ── !transfer ──
    if (msg.startsWith('!transfer ')) {
        const target = message.mentions.users.first();
        const amount = parseInt(msg.split(' ').pop());
        if (!target || isNaN(amount) || amount <= 0) return message.reply('Contoh: !transfer @user 100');
        if (target.id === uid) return message.reply('Tidak bisa transfer ke diri sendiri!');
        economyData = load(FILES.economy);
        ensureEco(uid); ensureEco(target.id);
        if (economyData[uid].coins < amount) return message.reply('Koin tidak cukup! Kamu hanya punya ' + economyData[uid].coins + ' koin.');
        economyData[uid].coins   -= amount;
        economyData[target.id].coins += amount;
        save(FILES.economy, economyData);
        return message.reply('✅ Berhasil transfer **' + amount + ' koin** ke ' + target.toString() + '. Sisa saldo: ' + economyData[uid].coins + ' koin.');
    }

    // ── !leaderboard ──
    if (msg === '!leaderboard') {
        economyData = load(FILES.economy);
        const sorted = Object.entries(economyData).sort((a, b) => b[1].coins - a[1].coins).slice(0, 10);
        const desc = sorted.map(([id, d], i) => {
            const medals = ['🥇','🥈','🥉'];
            return (medals[i] || (i+1) + '.') + ' <@' + id + '> — **' + d.coins + ' koin**';
        }).join('\\n') || 'Belum ada data.';
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle('Leaderboard Koin').setDescription(desc).setTimestamp()] });
    }

    // ── !shop ──
    if (msg === '!shop') {
        const items = SHOP_ITEMS.map((i, idx) => (idx+1) + '. **' + i.name + '** — ' + i.price + ' koin (!beli ' + i.id + ')').join('\\n');
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xE67E22).setTitle('Toko Server').setDescription(items)] });
    }

    // ── !beli ──
    if (msg.startsWith('!beli ')) {
        const itemId = msg.split(' ')[1];
        const item   = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return message.reply('Item tidak ditemukan. Ketik !shop untuk melihat daftar.');
        economyData = load(FILES.economy);
        ensureEco(uid);
        if (economyData[uid].coins < item.price) return message.reply('Koin tidak cukup! Kamu butuh ' + item.price + ' koin, tapi hanya punya ' + economyData[uid].coins + ' koin.');
        const role = message.guild.roles.cache.find(r => r.name === item.role);
        if (!role) return message.reply('Role tidak ditemukan di server. Hubungi Admin!');
        if (message.member.roles.cache.has(role.id)) return message.reply('Kamu sudah punya role ini!');
        economyData[uid].coins -= item.price;
        save(FILES.economy, economyData);
        await message.member.roles.add(role).catch(() => {});
        return message.reply('✅ Berhasil membeli **' + item.name + '**! Sisa: ' + economyData[uid].coins + ' koin.');
    }

    // ── !giveaway ──
    if (msg.startsWith('!giveaway ')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const parts = msg.replace('!giveaway ', '').split(' ');
        const menit = parseInt(parts[0]);
        const prize = parts.slice(1).join(' ');
        if (isNaN(menit) || menit < 1 || !prize) return message.reply('Format: !giveaway [menit] [hadiah]. Contoh: !giveaway 10 Nitro');
        const endsAt  = Date.now() + menit * 60000;
        const endTime = new Date(endsAt).toLocaleTimeString('id-ID');
        const embed   = new EmbedBuilder()
            .setColor(0xFFD700).setTitle('🎉 GIVEAWAY!').setDescription('Klik tombol di bawah untuk ikut!')
            .addFields(
                { name: 'Hadiah', value: prize, inline: true },
                { name: 'Berakhir pukul', value: endTime, inline: true },
                { name: 'Durasi', value: menit + ' menit', inline: true }
            ).setTimestamp(endsAt);
        const sentMsg = await message.channel.send({ embeds: [embed], components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('placeholder').setLabel('Sedang disiapkan...').setStyle(ButtonStyle.Secondary).setDisabled(true)
            )
        ]});
        await sentMsg.edit({ components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gw_enter_' + sentMsg.id).setLabel('Ikut Giveaway').setStyle(ButtonStyle.Primary).setEmoji('🎉')
        )]});
        giveawayData = load(FILES.giveaway);
        giveawayData[sentMsg.id] = { prize, endsAt, guildId: message.guild.id, channelId: message.channel.id, participants: [] };
        save(FILES.giveaway, giveawayData);
        setTimeout(() => endGiveaway(sentMsg.id), menit * 60000);
        return message.reply('Giveaway **' + prize + '** selama ' + menit + ' menit berhasil dibuat!').then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
    }

    // ── !endgiveaway ──
    if (msg === '!endgiveaway') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        giveawayData = load(FILES.giveaway);
        const gw = Object.entries(giveawayData).find(([,d]) => d.channelId === message.channel.id);
        if (!gw) return message.reply('Tidak ada giveaway aktif di channel ini!');
        await endGiveaway(gw[0]);
        return message.reply('Giveaway berhasil diakhiri!');
    }

    // ── !poll ──
    if (msg.startsWith('!poll ')) {
        const raw  = msg.replace('!poll ', '');
        const parts = raw.split('|').map(x => x.trim());
        if (parts.length < 3) return message.reply('Format: !poll [pertanyaan] | [opsi1] | [opsi2] | ...');
        const question = parts[0];
        const options  = parts.slice(1, 6);
        const pollId   = Date.now().toString();
        pollsData = load(FILES.polls);
        pollsData[pollId] = { question, options: options.map(o => ({ label: o, votes: 0 })), voters: {}, channelId: message.channel.id };
        save(FILES.polls, pollsData);
        const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'];
        const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('📊 ' + question)
            .setDescription(options.map((o,i) => emojis[i] + ' ' + o).join('\\n'))
            .setFooter({ text: 'ID: ' + pollId });
        const row = new ActionRowBuilder().addComponents(
            options.map((o, i) => new ButtonBuilder().setCustomId('poll_vote_' + pollId + '_' + i).setLabel(o.substring(0, 80)).setStyle(ButtonStyle.Secondary))
        );
        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // ── !endpoll ──
    if (msg.startsWith('!endpoll')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        pollsData = load(FILES.polls);
        const entry = Object.entries(pollsData).find(([,p]) => p.channelId === message.channel.id);
        if (!entry) return message.reply('Tidak ada poll aktif di channel ini!');
        const [pollId, poll] = entry;
        const total  = Object.keys(poll.voters).length;
        const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'];
        const sorted = [...poll.options].sort((a,b) => b.votes - a.votes);
        const desc   = poll.options.map((o,i) => emojis[i] + ' **' + o.label + '** — ' + o.votes + ' vote' + (o.votes !== 1 ? 's' : '') + (total > 0 ? ' (' + Math.round(o.votes/total*100) + '%)' : '')).join('\\n');
        const embed  = new EmbedBuilder().setColor(0x2ECC71).setTitle('📊 Hasil Poll: ' + poll.question)
            .setDescription(desc).addFields({ name: 'Pemenang', value: '🏆 ' + sorted[0].label + ' (' + sorted[0].votes + ' vote)', inline: true }, { name: 'Total Voter', value: total.toString(), inline: true }).setTimestamp();
        await message.channel.send({ embeds: [embed] });
        delete pollsData[pollId];
        save(FILES.polls, pollsData);
        return;
    }

    // ── !afk ──
    if (msg.startsWith('!afk')) {
        const reason = msg.replace('!afk', '').trim() || 'Tidak ada alasan';
        afkData = load(FILES.afk);
        afkData[uid] = { reason, name: message.author.username, since: Date.now() };
        save(FILES.afk, afkData);
        try { await message.member.setNickname('[AFK] ' + (message.member.nickname || message.author.username)); } catch {}
        return message.reply('Status AFK kamu telah diset. Alasan: *' + reason + '*');
    }

    // ── !setuproles ──
    if (msg === '!setuproles') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const roleCh = message.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
        if (!roleCh) return message.reply('Channel #pilih-role tidak ditemukan. Jalankan !setup dulu!');
        const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu')
            .setDescription('Klik tombol di bawah untuk mendapatkan atau melepas role sesuai minatmu. Klik lagi untuk melepas.');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role_gamer').setLabel('Gamer').setStyle(ButtonStyle.Primary).setEmoji('🎮'),
            new ButtonBuilder().setCustomId('role_musik').setLabel('Pecinta Musik').setStyle(ButtonStyle.Primary).setEmoji('🎵'),
            new ButtonBuilder().setCustomId('role_kreator').setLabel('Kreator').setStyle(ButtonStyle.Primary).setEmoji('🎨'),
            new ButtonBuilder().setCustomId('role_pelajar').setLabel('Pelajar').setStyle(ButtonStyle.Success).setEmoji('📚'),
            new ButtonBuilder().setCustomId('role_kompetitif').setLabel('Kompetitif').setStyle(ButtonStyle.Danger).setEmoji('🏆')
        );
        await roleCh.send({ embeds: [embed], components: [row] });
        return message.reply('Pesan pilihan role berhasil dikirim ke <#' + roleCh.id + '>!');
    }

    // ── !speedtest ──
    if (msg === '!speedtest') {
        const { exec } = require('child_process');
        const sm = await message.reply('Mengukur kecepatan internet server... Tunggu 15-30 detik!');
        exec('npx -y fast-cli --json', { timeout: 60000 }, (err, stdout) => {
            if (err) return sm.edit('Gagal melakukan uji kecepatan.');
            try {
                const ji = stdout.indexOf('{');
                if (ji === -1) throw new Error('invalid');
                const r = JSON.parse(stdout.substring(ji));
                const e = new EmbedBuilder().setColor(0x00FF00).setTitle('Hasil Speedtest Internet')
                    .addFields(
                        { name: 'Download', value: (r.downloadSpeed||'?') + ' ' + (r.downloadUnit||'Mbps'), inline: true },
                        { name: 'Ping', value: (r.latency||'?') + ' ms', inline: true },
                        { name: 'Server', value: r.serverLocations?.[0] || 'Unknown', inline: false }
                    ).setFooter({ text: 'via Fast.com (Netflix)' });
                sm.edit({ content: 'Tes selesai!', embeds: [e] });
            } catch { sm.edit('Gagal membaca hasil speedtest.'); }
        });
        return;
    }

    // ── !invitebots ──
    if (msg === '!invitebots') {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x0099FF).setTitle('Rekomendasi Bot')
            .addFields(
                { name: 'ProBot', value: '[Invite](https://discord.com/oauth2/authorize?client_id=282859044593598464&permissions=8&scope=bot)' },
                { name: 'Jockie Music', value: '[Invite](https://discord.com/oauth2/authorize?client_id=411916947773587456&permissions=8&scope=bot)' },
                { name: 'Dank Memer', value: '[Invite](https://discord.com/oauth2/authorize?client_id=270904126974590976&permissions=8&scope=bot)' },
                { name: 'Mudae', value: '[Invite](https://discord.com/api/oauth2/authorize?client_id=432610292342587392&permissions=8&scope=bot)' }
            )] });
    }

    // ── !tutuptiket ──
    if (msg === '!tutuptiket') {
        if (!message.channel.name.startsWith('tiket-')) return message.reply('Hanya bisa di channel tiket!');
        await message.channel.send('Tiket ditutup dalam 5 detik...');
        setTimeout(() => message.channel.delete().catch(() => {}), 5000);
        return;
    }

    // ── !vc (text prefix fallback) ──
    if (msg.startsWith('!vc ') || msg === '!vc') {
        const args   = msg.split(' ').slice(1);
        const subCmd = args[0]?.toLowerCase();
        const entry  = [...tempChannels.entries()].find(([, o]) => o === uid);
        if (!entry) return message.reply('Kamu tidak punya channel aktif! Masuk ke **Buat Channel** dulu.');
        const [vcId] = entry;
        const vcCh   = message.guild.channels.cache.get(vcId);
        if (!vcCh) { tempChannels.delete(vcId); return message.reply('Channel tidak ditemukan.'); }
        if (!subCmd || subCmd === 'help') return message.reply('Gunakan /vc untuk mengontrol channel kamu (lock, unlock, rename, limit, kick, transfer).');
        if (subCmd === 'lock') { await vcCh.permissionOverwrites.edit(message.guild.id, { Connect: false }); return message.reply('🔒 Dikunci!'); }
        if (subCmd === 'unlock') { await vcCh.permissionOverwrites.edit(message.guild.id, { Connect: true }); return message.reply('🔓 Dibuka!'); }
        if (subCmd === 'rename') { const n = args.slice(1).join(' '); if (!n) return message.reply('Masukkan nama!'); await vcCh.setName(n); return message.reply('✏️ Nama diubah: **' + n + '**'); }
        if (subCmd === 'limit') { const l = parseInt(args[1]); if (isNaN(l)||l<0||l>99) return message.reply('Angka 0-99!'); await vcCh.setUserLimit(l); return message.reply('👥 Batas: **' + (l===0?'Tidak terbatas':l+' orang') + '**'); }
        if (subCmd === 'kick') { const t = message.mentions.members.first(); if (!t||t.voice.channelId!==vcId) return message.reply('Member tidak ada di channel kamu!'); await t.voice.disconnect(); return message.reply('👢 ' + t.user.username + ' dikeluarkan!'); }
        if (subCmd === 'transfer') { const t = message.mentions.members.first(); if (!t||t.voice.channelId!==vcId) return message.reply('Member harus di channel kamu!'); tempChannels.set(vcId,t.id); await vcCh.permissionOverwrites.edit(t.id,{ManageChannels:true,MuteMembers:true,DeafenMembers:true,MoveMembers:true}); await vcCh.permissionOverwrites.delete(uid); await sendControlPanel(t,vcCh); return message.reply('👑 Ditransfer ke ' + t.user.username); }
        return;
    }

    // ── !updateaturan ──
    if (msg === '!updateaturan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'aturan' && c.type === ChannelType.GuildText);
        if (!ch) return message.reply('Channel #aturan tidak ditemukan!');
        const fetched = await ch.messages.fetch({ limit: 10 });
        const del = fetched.filter(m => (Date.now()-m.createdTimestamp) < 1209600000);
        if (del.size > 1) await ch.bulkDelete(del).catch(() => {}); else if (del.size === 1) await del.first().delete().catch(() => {});
        const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('ATURAN SERVER')
            .setDescription('Demi kenyamanan bersama, semua member wajib mematuhi aturan berikut:')
            .addFields(
                { name: '1. Hormati Sesama', value: 'Dilarang menghina, merendahkan, atau melecehkan.' },
                { name: '2. Dilarang SARA', value: 'Dilarang membahas isu suku, agama, ras, dan antar golongan.' },
                { name: '3. Dilarang Spam', value: 'Dilarang pesan berulang, flood, atau mention berlebihan.' },
                { name: '4. Gunakan Channel dengan Benar', value: 'Kirim pesan sesuai topik. Gunakan #bot-command untuk bot.' },
                { name: '5. Dilarang Konten 18+', value: 'Dilarang konten dewasa atau kekerasan.' },
                { name: '6. Patuhi Staff', value: 'Ikuti instruksi Admin dan Moderator. Keputusan staff final.' },
                { name: '7. Dilarang Promosi', value: 'Dilarang iklan tanpa izin Admin.' }
            ).setFooter({ text: 'Pelanggaran → peringatan → timeout → kick → ban' }).setTimestamp();
        await ch.send({ embeds: [embed] });
        if (message.channel.id !== ch.id) message.channel.send('<@' + uid + '> Aturan diperbarui di <#' + ch.id + '>!');
        return;
    }

    // ── !setuptiket ──
    if (msg === '!setuptiket') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'tiket' && c.type === ChannelType.GuildText);
        if (!ch) return message.reply('Channel #tiket tidak ditemukan!');
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Sistem Tiket Dukungan')
            .setDescription('Butuh bantuan? Klik tombol di bawah untuk membuat tiket privat dengan Admin.\\n\\nKetik **!tutuptiket** di dalam channel tiket untuk menutupnya.');
        await ch.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buka_tiket').setLabel('Buka Tiket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
        )]});
        return message.reply('Pesan tiket berhasil dikirim ke <#' + ch.id + '>!');
    }

    // ── !updatepanduan ──
    if (msg === '!updatepanduan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'panduan-bot');
        if (!ch) return message.reply('Channel #panduan-bot tidak ditemukan!');
        const fetched = await ch.messages.fetch({ limit: 10 });
        const del = fetched.filter(m => (Date.now()-m.createdTimestamp) < 1209600000);
        if (del.size > 1) await ch.bulkDelete(del).catch(() => {}); else if (del.size === 1) await del.first().delete().catch(() => {});
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('PANDUAN LENGKAP BOT')
            .setDescription('Panduan semua fitur yang tersedia di server ini.')
            .addFields(
                { name: '--- BOT SERVER ---', value: '\\u200b' },
                { name: '1. ASISTEN AI', value: 'Chat di #tanya-ai, !tanya [pertanyaan], atau @Asisten AI\\n!ping, !speedtest, !rank, !info, !settanggallahir, !invitebots\\n!afk [alasan] - Set status AFK\\n!saldo, !daily, !transfer, !leaderboard, !shop, !beli - Economy\\n!poll [pertanyaan]|[opsi1]|[opsi2] - Buat voting\\n!giveaway [menit] [hadiah] - Buat giveaway (Admin)\\n!warn, !warns, !clearwarn - Peringatan (Admin/Mod)\\n!setup, !cleanup, !setuproles, !setuptiket, !updatepanduan, !updateaturan (Admin)' },
                { name: '2. VERIFIKASI & ROLE', value: 'Member baru masuk → verifikasi di #verifikasi → pilih gender → akses penuh\\nPilih role minat di #pilih-role (Gamer, Musik, Kreator, dll)' },
                { name: '3. LEVEL & ECONOMY', value: 'Chat aktif = XP + Koin\\nLevel 5: Role Veteran | Level 10: Elite | Level 20: Legend\\n!rank - Cek level | !saldo - Cek koin | !daily - Klaim harian | !shop - Beli role' },
                { name: '4. VOICE CHANNEL', value: 'Masuk **Buat Channel** → channel pribadimu dibuat otomatis\\n/vc lock/unlock/rename/limit/kick/transfer - Kontrol channel' },
                { name: '5. TIKET', value: 'Pergi ke #tiket → klik Buka Tiket → channel privat dibuat\\n!tutuptiket - Tutup tiket' },
                { name: '--- BOT EKSTERNAL ---', value: '\\u200b' },
                { name: '6. JOCKIE MUSIC', value: 'm!play [lagu] | m!skip | m!stop | m!queue | m!pause | m!resume' },
                { name: '7. PROBOT', value: '/rank | /top | /warnings' },
                { name: '8. MUDAE & DANK MEMER', value: 'Mudae: $w $m $h | Dank Memer: /pls beg, /pls hunt' }
            ).setFooter({ text: 'Gunakan command di #bot-command agar #general tetap rapi!' }).setTimestamp();
        await ch.send({ embeds: [embed] });
        if (message.channel.id !== ch.id) message.channel.send('<@' + uid + '> Panduan diperbarui di <#' + ch.id + '>!');
        return;
    }

    // ── !cleanup ──
    if (msg === '!cleanup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const guild2 = message.guild;
        const cm = await message.reply('Memindai channel duplikat...');
        let deleted = 0;
        const officialCats = ['INFORMASI','ARTIFICIAL INTELLIGENCE','OBROLAN UMUM','VOICE CHANNELS'];
        const officialChs  = ['verifikasi','aturan','pengumuman','panduan-bot','log-server','tiket','pilih-role','tanya-ai','general','bot-command','media'];
        for (const name of officialCats) {
            const matches = guild2.channels.cache.filter(c => c.type === ChannelType.GuildCategory && (c.name === name || (c.name.includes(name.split(' ')[0]) && c.name !== name)));
            if (matches.size > 0) {
                for (const [, cat] of matches) {
                    if (cat.name !== name) {
                        const kids = guild2.channels.cache.filter(c => c.parentId === cat.id);
                        for (const [, k] of kids) { await k.delete('Cleanup duplikat').catch(() => {}); deleted++; }
                        await cat.delete('Cleanup duplikat').catch(() => {}); deleted++;
                    }
                }
            }
        }
        for (const name of officialChs) {
            const matches = guild2.channels.cache.filter(c => c.type === ChannelType.GuildText && c.name === name);
            if (matches.size > 1) {
                let kept = false;
                for (const [, c] of matches) { if (!kept) { kept = true; } else { await c.delete('Cleanup duplikat').catch(() => {}); deleted++; } }
            }
        }
        await cm.edit(deleted === 0 ? 'Tidak ada channel duplikat. Server sudah bersih!' : 'Berhasil hapus **' + deleted + '** channel/kategori duplikat! Jalankan **!setup** untuk memastikan semua channel lengkap.');
        return;
    }

    // ── !setup ──
    if (msg === '!setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const guild2  = message.guild;
        const setupMsg = await message.reply('Setup server dimulai...');
        try {
            // Roles
            const allRoles = [
                { name: 'Admin',         color: '#ff0000' },
                { name: 'Moderator',     color: '#00ff00' },
                { name: 'VIP',           color: '#ffd700' },
                { name: 'Member',        color: '#ffffff' },
                { name: 'Veteran',       color: '#e67e22' },
                { name: 'Elite',         color: '#9b59b6' },
                { name: 'Legend',        color: '#e74c3c' },
                { name: 'Gamer',         color: '#3498db' },
                { name: 'Pecinta Musik', color: '#e91e8c' },
                { name: 'Kreator',       color: '#1abc9c' },
                { name: 'Pelajar',       color: '#f39c12' },
                { name: 'Kompetitif',    color: '#e74c3c' },
                { name: 'Laki-laki',     color: '#3498db' },
                { name: 'Perempuan',     color: '#e91e8c' },
                { name: 'Belum Verifikasi', color: '#808080' }
            ];
            for (const r of allRoles) {
                if (!guild2.roles.cache.find(x => x.name === r.name)) {
                    await guild2.roles.create({ name: r.name, color: r.color, reason: 'Auto setup' }).catch(() => {});
                }
            }
            const mk = async (n, t) => {
                let c = guild2.channels.cache.find(x => x.name === n && x.type === t);
                if (!c) c = await guild2.channels.create({ name: n, type: t });
                return c;
            };
            const mkCh = async (name, parentId) => {
                if (!guild2.channels.cache.find(c => c.name === name && c.parentId === parentId))
                    await guild2.channels.create({ name, type: ChannelType.GuildText, parent: parentId }).catch(() => {});
            };
            const mkVo = async (name, parentId) => {
                if (!guild2.channels.cache.find(c => c.name === name && c.parentId === parentId))
                    await guild2.channels.create({ name, type: ChannelType.GuildVoice, parent: parentId }).catch(() => {});
            };
            const infoCat  = await mk('INFORMASI', ChannelType.GuildCategory);
            await mkCh('verifikasi',  infoCat.id);
            await mkCh('aturan',      infoCat.id);
            await mkCh('pengumuman',  infoCat.id);
            await mkCh('panduan-bot', infoCat.id);
            await mkCh('log-server',  infoCat.id);
            await mkCh('tiket',       infoCat.id);
            await mkCh('pilih-role',  infoCat.id);
            // Stats voice channels
            await mkVo('📊 Member: 0',  infoCat.id);
            await mkVo('🟢 Online: 0',  infoCat.id);
            await mkVo('🤖 Bot: 0',     infoCat.id);
            const aiCat    = await mk('ARTIFICIAL INTELLIGENCE', ChannelType.GuildCategory);
            await mkCh('tanya-ai', aiCat.id);
            const chatCat  = await mk('OBROLAN UMUM', ChannelType.GuildCategory);
            await mkCh('general',    chatCat.id);
            await mkCh('bot-command', chatCat.id);
            await mkCh('media',      chatCat.id);
            const voiceCat = await mk('VOICE CHANNELS', ChannelType.GuildCategory);
            await mkVo('Lounge',       voiceCat.id);
            await mkVo('Buat Channel', voiceCat.id);
            await setupMsg.edit('Setup selesai! Semua channel, role, dan fitur baru siap digunakan. Jalankan !updatestats untuk update stats awal.');
            // Update stats langsung
            await updateStats(guild2);
        } catch (e) {
            console.error(e);
            await setupMsg.edit('Error: ' + e.message);
        }
        return;
    }

    // ── AI BLOCK ──
    const isBotCmd = BOT_COMMANDS.some(c => msg === c || msg.startsWith(c + ' '));
    if (isBotCmd) return;
    const isTanyaAi = message.channel.name === 'tanya-ai';
    const isMentioned = message.mentions.has(client.user);
    const isAICmd = msg.startsWith('!tanya ') || msg === '!tanya' || msg.startsWith('!ai ') || msg === '!ai';
    if (isTanyaAi || isMentioned || isAICmd) {
        if (!genAI) return message.reply('GEMINI_API_KEY tidak ditemukan.');
        await message.channel.sendTyping();
        try {
            let prompt = msg;
            if (isMentioned) prompt = msg.replace(/<@!?\\d+>/g, '').trim();
            else if (msg.startsWith('!tanya ')) prompt = msg.substring(7).trim();
            else if (msg.startsWith('!ai ')) prompt = msg.substring(4).trim();
            if (!prompt || prompt === '!tanya' || prompt === '!ai') return message.reply('Ketik pertanyaanmu! Contoh: !tanya apa itu AI?');
            const model  = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
            const result = await model.generateContent(prompt);
            const resp   = result.response.text();
            await message.reply(resp.length > 1999 ? resp.substring(0, 1995) + '...' : resp);
        } catch (e) {
            console.error(e);
            await message.reply('Otak AI saya sedang gangguan. Coba lagi nanti!');
        }
    }
});

// ═══════════════════════════════════════════════════════
// ERROR HANDLERS
// ═══════════════════════════════════════════════════════
client.on('error', e => console.error('Client error:', e));
process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));

client.login(process.env.DISCORD_TOKEN);
`;

fs.writeFileSync('D:\\discord_bot\\bot.js', BOT, 'utf8');
console.log('bot.js ditulis ulang dengan semua 16 fitur!');
