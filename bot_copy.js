require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const { callAIWithMemory, resetMemory } = require('./ai_memory.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const ROLES_FILE = './roles_data.json';
const DEFAULT_ROLES = [
    { id: 'role_gamer', name: 'Gamer', emoji: '🎮', style: ButtonStyle.Primary },
    { id: 'role_musik', name: 'Pecinta Musik', emoji: '🎵', style: ButtonStyle.Primary },
    { id: 'role_kreator', name: 'Kreator', emoji: '🎨', style: ButtonStyle.Primary },
    { id: 'role_pelajar', name: 'Pelajar', emoji: '📚', style: ButtonStyle.Success },
    { id: 'role_kompetitif', name: 'Kompetitif', emoji: '🏆', style: ButtonStyle.Danger }
];
function loadRoles() {
    if (!fs.existsSync(ROLES_FILE)) return DEFAULT_ROLES;
    try { return JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8')); } catch { return DEFAULT_ROLES; }
}
function saveRoles(roles) {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2), 'utf8');
}

const FILES = {
    xp:       './xp_data.json',
    bday:     './birthday_data.json',
    economy:  './economy_data.json',
    warns:    './warns_data.json',
    giveaway: './giveaway_data.json',
    afk:      './afk_data.json',
    polls:    './polls_data.json',
    tempvc:   './tempvc_data.json'
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
let tempChannels = new Map(Object.entries(load(FILES.tempvc)));

function saveTempChannels() {
    save(FILES.tempvc, Object.fromEntries(tempChannels));
}

const CREATE_CHANNEL_NAME = 'Buat Channel';
const xpCooldown    = new Map();
const coinCooldown  = new Map();
const spamTracker   = new Map();
const aiCooldown    = new Map();
const LEVEL_ROLES   = { 5: 'Veteran', 10: 'Elite', 20: 'Legend' };
const SHOP_ITEMS    = [
    { id: 'vip',   name: 'Role VIP',   price: 500,  role: 'VIP' },
    { id: 'elite', name: 'Role Elite', price: 1500, role: 'Elite' },
];

function getLevel(xp)       { return Math.floor(0.1 * Math.sqrt(xp)); }
function getXPForLevel(lv)  { return Math.pow(lv / 0.1, 2); }
function ensureEco(uid)     { if (!economyData[uid]) economyData[uid] = { coins: 0, lastDaily: 0 }; }



async function sendControlPanel(member, channel) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Panel Kontrol Channel Kamu')
        .setDescription('Kamu pemilik **' + channel.name + '**! Gunakan /vc atau tombol berikut:')
        .addFields({ name: 'Command', value:
            '/vc lock - Kunci channel\n/vc unlock - Buka channel\n' +
            '/vc rename [nama] - Ganti nama\n/vc limit [0-99] - Batas member\n' +
            '/vc kick @user - Keluarkan member\n/vc transfer @user - Transfer kepemilikan'
        });
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vc_lock_' + channel.id).setLabel('Kunci').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('vc_unlock_' + channel.id).setLabel('Buka').setStyle(ButtonStyle.Success).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('vc_rename_' + channel.id).setLabel('Ganti Nama').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('vc_limit_' + channel.id).setLabel('Batas Member').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
        new ButtonBuilder().setCustomId('vc_kick_' + channel.id).setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('👢')
    );
    try { await member.send({ embeds: [embed], components: [row] }); }
    catch {}
}

async function updateStats(guild) {
    try {
        const memCount = guild.members.cache.filter(m => !m.user.bot).size;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        
        let mCh = guild.channels.cache.find(c => c.name.startsWith('📊 Member: '));
        if (!mCh) {
            const cat = guild.channels.cache.find(c => c.name === 'INFORMASI' && c.type === ChannelType.GuildCategory);
            if (cat) mCh = await guild.channels.create({ name: '📊 Member: ' + memCount, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });
        } else { await mCh.setName('📊 Member: ' + memCount).catch(() => {}); }

        let bCh = guild.channels.cache.find(c => c.name.startsWith('🤖 Bot: '));
        if (!bCh) {
            const cat = guild.channels.cache.find(c => c.name === 'INFORMASI' && c.type === ChannelType.GuildCategory);
            if (cat) bCh = await guild.channels.create({ name: '🤖 Bot: ' + botCount, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });
        } else { await bCh.setName('🤖 Bot: ' + botCount).catch(() => {}); }
    } catch {}
}

async function updateNickname(member, roleName) {
    if (!member || !member.manageable) return; 
    const roles = loadRoles();
    let prefix = '';
    const staticMap = { 'VIP': '👑 VIP', 'Admin': '🛡️ Admin' };
    if (staticMap[roleName]) { prefix = staticMap[roleName]; }
    else {
        const dynamicRole = roles.find(r => r.name === roleName);
        if (dynamicRole) prefix = dynamicRole.emoji + ' ' + (dynamicRole.name.split(' ')[0]);
    }
    if (!prefix) return;
    let baseName = member.nickname || member.user.username;
    if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
    // Bersihkan semua bracket prefix sisa yang lama
    baseName = baseName.replace(/^\[.*?\]\s*/, '').trim();
    // Bersihkan emoji sisa
    baseName = baseName.replace(/^[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uD83E][\uDC00-\uDFFF]\s*[A-Za-z0-9_]+\s*/, '').trim();
    await member.setNickname(prefix + ' | ' + baseName).catch(() => {});
}

const creatingChannel = new Set();
client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild || oldState.guild;
    if (newState.channel?.name === CREATE_CHANNEL_NAME) {
        if (creatingChannel.has(newState.member.id)) return;
        creatingChannel.add(newState.member.id);
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
            saveTempChannels();
            await sendControlPanel(member, newCh);
        } catch (e) { console.error('Creator channel error:', e); } finally { creatingChannel.delete(newState.member.id); }
        return;
    }
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
        const ch = oldState.channel;
        if (ch && ch.members.size === 0) {
            await ch.delete('Temporary channel kosong').catch(() => {});
            tempChannels.delete(oldState.channelId);
            saveTempChannels();
        }
    }
});

client.once('ready', async () => {
    console.log('Bot login: ' + client.user.tag);
    client.user.setActivity('Tanya AI | !tanya', { type: 3 });
    const g = client.guilds.cache.first();
    if (g) {
        await g.members.fetch();
        setInterval(() => updateStats(g), 5 * 60 * 1000);
    }
});

client.on('interactionCreate', async (interaction) => {
const guild = interaction.guild;
const member = interaction.member;
const customId = interaction.customId || '';
if (interaction.isChatInputCommand() && interaction.commandName === 'kelolarole') {
const sub = interaction.options.getSubcommand();
const roles = loadRoles();
if (sub === 'tambah') {
const name = interaction.options.getString('nama');
const emoji = interaction.options.getString('emoji');
const colorStr = interaction.options.getString('warna').toLowerCase();
let style = ButtonStyle.Primary;
if (colorStr === 'success' || colorStr === 'hijau') style = ButtonStyle.Success;
if (colorStr === 'danger' || colorStr === 'merah') style = ButtonStyle.Danger;
if (colorStr === 'secondary' || colorStr === 'abu') style = ButtonStyle.Secondary;
const id = 'role_' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
if (roles.find(r => r.id === id)) return interaction.reply({ content: 'Role sudah ada!', flags: 64 });
if (roles.length >= 25) return interaction.reply({ content: 'Maksimal 25 role tercapai!', flags: 64 });
roles.push({ id, name, emoji, style });
saveRoles(roles);
const roleCh = interaction.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
if (roleCh) {
const roleChFetched = await roleCh.messages.fetch({ limit: 20 });
const roleChDel = roleChFetched.filter(m => m.author.id === client.user.id);
if (roleChDel.size > 0) await roleCh.bulkDelete(roleChDel).catch(() => {});
const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('attachment://banner_roles.jpg').setDescription('Klik tombol di bawah untuk mendapatkan atau melepas role sesuai minatmu. Klik lagi untuk melepas.');
const components = [];
for (let i = 0; i < roles.length; i += 5) {
const chunk = roles.slice(i, i + 5);
const row = new ActionRowBuilder().addComponents(chunk.map(r => new ButtonBuilder().setCustomId(r.id).setLabel(r.name).setStyle(r.style || ButtonStyle.Primary).setEmoji(r.emoji)));
components.push(row);
}
await roleCh.send({ files: [{ attachment: './assets/banner_roles.jpg', name: 'banner_roles.jpg' }], embeds: [embed], components }).catch(() => {});
}
return interaction.reply({ content: '?? Role **' + name + '** berhasil ditambahkan! Tombol di #pilih-role otomatis diupdate.', flags: 64 });
}
if (sub === 'hapus') {
const name = interaction.options.getString('nama');
const idx = roles.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
if (idx === -1) return interaction.reply({ content: 'Role tidak ditemukan!', flags: 64 });
roles.splice(idx, 1);
saveRoles(roles);
const roleCh = interaction.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
if (roleCh) {
const roleChFetched = await roleCh.messages.fetch({ limit: 20 });
const roleChDel = roleChFetched.filter(m => m.author.id === client.user.id);
if (roleChDel.size > 0) await roleCh.bulkDelete(roleChDel).catch(() => {});
const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('attachment://banner_roles.jpg').setDescription('Klik tombol di bawah untuk mendapatkan atau melepas role sesuai minatmu. Klik lagi untuk melepas.');
const components = [];
for (let i = 0; i < roles.length; i += 5) {
const chunk = roles.slice(i, i + 5);
const row = new ActionRowBuilder().addComponents(chunk.map(r => new ButtonBuilder().setCustomId(r.id).setLabel(r.name).setStyle(r.style || ButtonStyle.Primary).setEmoji(r.emoji)));
components.push(row);
}
await roleCh.send({ files: [{ attachment: './assets/banner_roles.jpg', name: 'banner_roles.jpg' }], embeds: [embed], components }).catch(() => {});
}
return interaction.reply({ content: '?? Role **' + name + '** berhasil dihapus dari tombol!', flags: 64 });
}
}
if (customId.startsWith('role_')) {
          const roles = loadRoles();
          const roleData = roles.find(r => r.id === customId);
          if (!roleData) return interaction.reply({ content: 'Role tidak ditemukan di database.', flags: 64 });
          const roleName = roleData.name;
          
          let role = guild.roles.cache.find(r => r.name === roleName);
          if (!role) role = await guild.roles.create({ name: roleName, reason: 'Reaction role' }).catch(() => null);
          if (!role) return interaction.reply({ content: 'Gagal membuat role.', flags: 64 });
          
          if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role).catch(() => {});
              // Hilangkan prefix jika dilepas
              if (member.manageable) {
                  const prefix = roleData.emoji + ' ' + (roleName.split(' ')[0] || roleName);
                  if (member.nickname && member.nickname.startsWith(prefix)) {
                      await member.setNickname(member.nickname.replace(prefix + ' | ', '')).catch(() => {});
                  }
              }
              return interaction.reply({ content: 'Role **' + role.name + '** dilepas! 🗑️', flags: 64 });
          } else {
              await member.roles.add(role).catch(() => {});
              await updateNickname(member, roleName);
              return interaction.reply({ content: 'Role **' + role.name + '** diberikan! ✅', flags: 64 });
          }
      }

    // ── Giveaway Enter ──
    if (customId.startsWith('gw_enter_')) {
        const msgId = customId.replace('gw_enter_', '');
        giveawayData = load(FILES.giveaway);
        const gw = giveawayData[msgId];
        if (!gw) return interaction.reply({ content: 'Giveaway tidak ditemukan atau sudah berakhir.', flags: 64 });
        if (gw.participants.includes(interaction.user.id))
            return interaction.reply({ content: 'Kamu sudah terdaftar dalam giveaway ini!', flags: 64 });
        gw.participants.push(interaction.user.id);
        save(FILES.giveaway, giveawayData);
        return interaction.reply({ content: '🎉 Kamu berhasil masuk ke giveaway **' + gw.prize + '**! (' + gw.participants.length + ' peserta)', flags: 64 });
    }

    // ── Poll Vote ──
    if (customId.startsWith('poll_vote_')) {
        const parts  = customId.replace('poll_vote_', '').split('_');
        const pollId = parts[0];
        const optIdx = parseInt(parts[1]);
        pollsData = load(FILES.polls);
        const poll = pollsData[pollId];
        if (!poll) return interaction.reply({ content: 'Poll tidak ditemukan atau sudah ditutup.', flags: 64 });
        if (poll.voters[interaction.user.id] !== undefined)
            return interaction.reply({ content: 'Kamu sudah vote di poll ini!', flags: 64 });
        poll.voters[interaction.user.id] = optIdx;
        poll.options[optIdx].votes++;
        save(FILES.polls, pollsData);
        return interaction.reply({ content: 'Vote untuk **' + poll.options[optIdx].label + '** berhasil dicatat!', flags: 64 });
    }

    // ── Buka Tiket ──
    
    // Tutup Tiket Button
    if (customId === 'close_ticket') {
        if (!interaction.channel.name.startsWith('tiket-')) {
            await interaction.reply({ content: 'Ini bukan channel tiket!', flags: 64 }).catch(() => {});
            return;
        }
        await interaction.reply({ content: '🔒 Tiket akan ditutup dalam 5 detik...', flags: 64 }).catch(() => {});
        setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
        return;
    }

    
    // PANDUAN DROPDOWN MENU
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_panduan') {
        const val = interaction.values[0];
        let pEmbed = new EmbedBuilder().setColor(0x5865F2).setTimestamp();
        if (val === 'panduan_ai') {
            pEmbed.setTitle('🤖 Panduan Asisten AI & Interaksi').setDescription('**Chat dengan AI**\nKetik `/tanya [pertanyaan]` atau sebut *@Asisten AI* di chat.\n\n**Slash Commands (Ketik /)**:\n`/giveaway` - Buat event giveaway\n`/poll` - Buat polling\n`/afk` - Pasang status AFK\n`/info` - Cek Profil Member');
        } else if (val === 'panduan_eco') {
            pEmbed.setTitle('💰 Ekonomi & Level').setDescription('**Sistem Koin & Minigames**\n`/saldo` - Cek koin kamu\n`/daily` - Klaim koin harian\n`/transfer` - Kirim koin ke teman\n`/shop` & `/beli` - Toko Server\n\n**Sistem Leveling**\nChat aktif akan memberimu XP.\n- Level 5: Role Veteran 🎖️\n- Level 10: Role Elite 💎\n- Level 20: Role Legend 👑');
        } else if (val === 'panduan_vc') {
            pEmbed.setTitle('🎤 Voice Channel Pribadi').setDescription('**Cara Penggunaan:**\nMasuk ke channel **[Buat Channel]** dan sistem otomatis membuatkan Voice Channel khusus untukmu!\n\n**Kontrol Channel:**\nKetik `/vc` untuk melihat menu panel, atau gunakan slash command langsung:\n`/vc lock` - Kunci channel\n`/vc unlock` - Buka channel\n`/vc limit` - Batasi jumlah orang\n`/vc kick` - Usir member dari channel');
        } else if (val === 'panduan_tiket') {
            pEmbed.setTitle('🎫 Sistem Tiket Support').setDescription('Jika butuh bantuan Admin:\n1. Pergi ke channel **#tiket**\n2. Klik tombol **Buka Tiket**\n3. Channel privat khusus untukmu akan dibuat.\n4. Setelah selesai, klik tombol merah **🔒 Tutup Tiket** di dalam tiket tersebut.');
        } else if (val === 'panduan_eksternal') {
            pEmbed.setTitle('🔌 Panduan Bot Eksternal').setDescription('**Jockie Music** (Putar Lagu)\n`m!play [lagu]` - Putar musik\n`m!skip` - Lewati lagu\n`m!stop` - Berhenti\n\n**Probot** (Moderasi)\n`/rank` - Cek Level Card\n`/top` - Leaderboard Text/Voice\n\n**Mudae** (Game Gacha)\n`$w` - Waifu gacha\n`$h` - Husbando gacha');
        }
        await interaction.reply({ embeds: [pEmbed], flags: 64 });
        return;
    }

    if (customId === 'buka_tiket') {
        // Defer immediately to prevent "interaction failed" (Discord needs reply within 3s)
        await interaction.deferReply({ flags: 64 });
        const existing = guild.channels.cache.find(c => c.name === 'tiket-' + interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (existing) {
            await interaction.editReply({ content: 'Kamu sudah punya tiket di ' + existing.toString() });
            return;
        }
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
            await interaction.editReply({ content: 'Tiket dibuat di ' + tCh.toString() }); return;
        } catch (e) { await interaction.editReply({ content: 'Gagal buat tiket: ' + e.message }); }
    }

    // ── VC Panel Buttons ──
    if (customId.startsWith('vc_lock_') || customId.startsWith('vc_unlock_') || customId.startsWith('vc_rename_') || customId.startsWith('vc_limit_') || customId.startsWith('vc_kick_')) {
        const parts = customId.split('_');
        const action = parts[1];
        const chId = parts[parts.length - 1];
        const ownerId = tempChannels.get(chId);
        if (!ownerId || interaction.user.id !== ownerId)
            return interaction.reply({ content: 'Hanya pemilik channel yang bisa menggunakan ini!', flags: 64 });
        const vcCh = guild.channels.cache.get(chId);
        if (!vcCh) return interaction.reply({ content: 'Channel tidak ditemukan.', flags: 64 });
        if (action === 'lock') { await vcCh.permissionOverwrites.edit(guild.id, { Connect: false }); return interaction.reply({ content: '🔒 Channel dikunci!', flags: 64 }); }
        if (action === 'unlock') { await vcCh.permissionOverwrites.edit(guild.id, { Connect: true }); return interaction.reply({ content: '🔓 Channel dibuka!', flags: 64 }); }
        if (action === 'rename') return interaction.reply({ content: 'Gunakan: `/vc rename [nama baru]`', flags: 64 });
        if (action === 'limit')  return interaction.reply({ content: 'Gunakan: `/vc limit [angka]`', flags: 64 });
        if (action === 'kick')   return interaction.reply({ content: 'Gunakan: `/vc kick @member`', flags: 64 });
    }
});

// ═══════════════════════════════════════════════════════
// BOT COMMANDS
// ═══════════════════════════════════════════════════════
async function endGiveaway(msgId) {
    let gData = load(FILES.giveaway);
    const gw = gData[msgId];
    if (!gw) return;
    let winner = null;
    if (gw.participants.length > 0) winner = gw.participants[Math.floor(Math.random() * gw.participants.length)];
    const channel = client.channels.cache.get(gw.channelId);
    if (channel) {
        if (winner) {
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('🎉 Giveaway Berakhir!').setDescription(`Pemenang: <@${winner}>\nHadiah: **${gw.prize}**`);
            channel.send({ content: `Selamat <@${winner}>!`, embeds: [embed] }).catch(() => {});
        } else {
            channel.send(`Giveaway **${gw.prize}** berakhir, tapi tidak ada peserta.`).catch(() => {});
        }
        try {
            const msg = await channel.messages.fetch(msgId).catch(() => null);
            if (msg) {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('gw_enter_done').setLabel('Giveaway Berakhir').setStyle(ButtonStyle.Secondary).setEmoji('🎉').setDisabled(true)
                );
                await msg.edit({ components: [disabledRow] }).catch(() => {});
            }
        } catch (e) {}
    }
    delete gData[msgId];
    save(FILES.giveaway, gData);
}

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
            const logCh = message.guild.channels.cache.find(c => c.name === 'log-server');
            if (logCh) await logCh.send('🎉 Selamat ' + message.author.toString() + '! Naik ke **Level ' + newLv + '**!').catch(() => {});
            else message.channel.send('🎉 Selamat ' + message.author.toString() + '! Naik ke **Level ' + newLv + '**!').catch(() => {});
            const rR = LEVEL_ROLES[newLv];
            if (rR) { const role = message.guild.roles.cache.find(r => r.name === rR); if (role) { message.member.roles.add(role).catch(() => {}); updateNickname(message.member, rR); } }
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
            .setDescription(d.history.slice(-5).map((h,i) => (i+1) + '. ' + h.reason + ' - ' + new Date(h.time).toLocaleDateString('id-ID')).join('\n'));
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
        const embed  = new EmbedBuilder().setColor(0x1ABC9C).setTitle('Informasi Member').setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
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
        }).join('\n') || 'Belum ada data.';
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle('Leaderboard Koin').setDescription(desc).setTimestamp()] });
    }

    // ── !shop ──
    if (msg === '!shop') {
        const items = SHOP_ITEMS.map((i, idx) => (idx+1) + '. **' + i.name + '** — ' + i.price + ' koin (!beli ' + i.id + ')').join('\n');
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
            .setDescription(options.map((o,i) => emojis[i] + ' ' + o).join('\n'))
            .setFooter({ text: 'ID: ' + pollId });
        const row = new ActionRowBuilder().addComponents(
            options.map((o, i) => new ButtonBuilder().setCustomId('poll_vote_' + pollId + '_' + i).setLabel(o.substring(0, 80)).setStyle(ButtonStyle.Secondary))
        );
        return await message.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
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
        const desc   = poll.options.map((o,i) => emojis[i] + ' **' + o.label + '** — ' + o.votes + ' vote' + (o.votes !== 1 ? 's' : '') + (total > 0 ? ' (' + Math.round(o.votes/total*100) + '%)' : '')).join('\n');
        const embed  = new EmbedBuilder().setColor(0x2ECC71).setTitle('📊 Hasil Poll: ' + poll.question)
            .setDescription(desc).addFields({ name: 'Pemenang', value: '🏆 ' + sorted[0].label + ' (' + sorted[0].votes + ' vote)', inline: true }, { name: 'Total Voter', value: total.toString(), inline: true }).setTimestamp();
        await message.channel.send({ embeds: [embed] }).catch(() => {});
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
    if (msg === '!setuproles' || msg === '!refreshroles') {
          if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator) && msg !== '!refreshroles') return;
          const roleCh = message.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
          if (!roleCh) return;
          
          const roleChFetched = await roleCh.messages.fetch({ limit: 20 });
          const roleChDel = roleChFetched.filter(m => m.author.id === client.user.id);
          if (roleChDel.size > 1) await roleCh.bulkDelete(roleChDel).catch(() => {});
          else if (roleChDel.size === 1) await roleChDel.first().delete().catch(() => {});
          
          const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('attachment://banner_roles.jpg')
              .setDescription('Klik tombol di bawah untuk mendapatkan atau melepas role sesuai minatmu. Klik lagi untuk melepas.');
          
          const roles = loadRoles();
          const components = [];
          for (let i = 0; i < roles.length; i += 5) {
              const chunk = roles.slice(i, i + 5);
              const row = new ActionRowBuilder().addComponents(
                  chunk.map(r => new ButtonBuilder().setCustomId(r.id).setLabel(r.name).setStyle(r.style || ButtonStyle.Primary).setEmoji(r.emoji))
              );
              components.push(row);
          }
          
          await roleCh.send({ files: [{ attachment: './assets/banner_roles.jpg', name: 'banner_roles.jpg' }], embeds: [embed], components }).catch(() => {});
          if (msg === '!setuproles') return message.reply('Pesan pilihan role berhasil dikirim ke <#' + roleCh.id + '>!');
          return;

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
        await message.channel.send('Tiket ditutup dalam 5 detik...').catch(() => {});
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
        // Hapus SEMUA pesan bot di channel aturan agar tidak dobel
        const aturanFetched = await ch.messages.fetch({ limit: 50 });
        const aturanDel = aturanFetched.filter(m => m.author.id === client.user.id);
        if (aturanDel.size > 1) await ch.bulkDelete(aturanDel).catch(async () => {
            // bulkDelete gagal jika pesan > 14 hari, hapus satu per satu
            for (const [, m] of aturanDel) await m.delete().catch(() => {});
        });
        else if (aturanDel.size === 1) await aturanDel.first().delete().catch(() => {});
        const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('ATURAN SERVER').setImage('attachment://banner_aturan.jpg')
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
        if (message.channel.id !== ch.id) message.channel.send('<@' + uid + '> Aturan diperbarui di <#' + ch.id + '>!').catch(() => {});
        return;
    }

    // ── !setuptiket ──
    if (msg === '!setuptiket') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'tiket' && c.type === ChannelType.GuildText);
        if (!ch) return message.reply('Channel #tiket tidak ditemukan!');
        // Hapus pesan lama agar tidak dobel
        const tiketFetched = await ch.messages.fetch({ limit: 20 });
        const tiketDel = tiketFetched.filter(m => m.author.id === client.user.id);
        if (tiketDel.size > 1) await ch.bulkDelete(tiketDel).catch(() => {});
        else if (tiketDel.size === 1) await tiketDel.first().delete().catch(() => {});
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Sistem Tiket Dukungan').setImage('attachment://banner_tiket.jpg')
            .setDescription('Butuh bantuan? Klik tombol di bawah untuk membuat tiket privat dengan Admin.\n\nKetik **!tutuptiket** di dalam channel tiket untuk menutupnya.');
        await ch.send({ files: [{ attachment: './assets/banner_tiket.jpg', name: 'banner_tiket.jpg' }], embeds: [embed], components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buka_tiket').setLabel('Buka Tiket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
        )]});
        return message.reply('Pesan tiket berhasil dikirim ke <#' + ch.id + '>!');
    }

    // ── !updatepanduan ──
    if (msg === '!updatepanduan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'panduan-bot');
        if (!ch) return message.reply('Channel #panduan-bot tidak ditemukan!');
        // Hapus pesan lama agar tidak dobel
        const panduanFetched = await ch.messages.fetch({ limit: 50 });
        const panduanDel = panduanFetched.filter(m => m.author.id === client.user.id);
        if (panduanDel.size > 1) await ch.bulkDelete(panduanDel).catch(async () => {
            for (const [, m] of panduanDel) await m.delete().catch(() => {});
        });
        else if (panduanDel.size === 1) await panduanDel.first().delete().catch(() => {});
        
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('PANDUAN LENGKAP SERVER')
            .setDescription('Silakan pilih kategori panduan dari menu *dropdown* di bawah ini untuk melihat fitur-fitur yang tersedia di server kita.')
            .setImage('attachment://banner_panduan.jpg');
            
        const panduanRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_panduan')
                .setPlaceholder('Pilih Kategori Panduan...')
                .addOptions([
                    { label: '🤖 Asisten AI & Interaksi', description: 'Cara chat dengan AI dan command interaksi', value: 'panduan_ai', emoji: '🤖' },
                    { label: '💰 Ekonomi & Leveling', description: 'Sistem Koin, Daily, Shop, dan Level', value: 'panduan_eco', emoji: '💰' },
                    { label: '🎤 Voice Channel Pribadi', description: 'Membuat dan mengatur channel suaramu sendiri', value: 'panduan_vc', emoji: '🎤' },
                    { label: '🎫 Sistem Tiket & Support', description: 'Cara membuat tiket bantuan', value: 'panduan_tiket', emoji: '🎫' },
                    { label: '🔌 Bot Eksternal', description: 'Panduan Jockie Music, Mudae, dll', value: 'panduan_eksternal', emoji: '🔌' }
                ])
        );
        await ch.send({ files: [{ attachment: './assets/banner_panduan.jpg', name: 'banner_panduan.jpg' }], embeds: [embed], components: [panduanRow] });
        if (message.channel.id !== ch.id) await message.channel.send('<@' + uid + '> Panduan diperbarui di <#' + ch.id + '>!').catch(() => {});
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
        await message.channel.sendTyping();
        try {
            let prompt = msg;
            if (isMentioned) prompt = msg.replace(/<@!?\d+>/g, '').trim();
            else if (msg.startsWith('!tanya ')) prompt = msg.substring(7).trim();
            else if (msg.startsWith('!ai ')) prompt = msg.substring(4).trim();
            if (!prompt || prompt === '!tanya' || prompt === '!ai') return message.reply('Ketik pertanyaanmu! Contoh: !tanya apa itu AI?');
            
            // Cek cooldown per user (hindari spam ke API)
            const lastAI = aiCooldown.get(uid) || 0;
            if (Date.now() - lastAI < 4000) {
                return message.reply('Sabar ya! Tunggu beberapa detik sebelum bertanya lagi.');
            }
            aiCooldown.set(uid, Date.now());

            // Sistem Fallback AI
            const memoryId = message.channel?.type === ChannelType.GuildVoice || tempChannels.has(message.channelId)
                ? 'room_' + message.channelId
                : 'user_' + uid;
            let respText;
            try {
                const aiResult = await callAIWithMemory(prompt, memoryId, process.env);
                    respText = aiResult.text + '\n\n`[💡 Token Dipakai: ' + aiResult.tokens + ' | Memori: ' + aiResult.historyLength + '/20]`';
            } catch (e) {
                return message.reply('Maaf, AI gagal merespon: ' + e.message);
            }

            // Hapus blok pemikiran AI (seperti dari model Qwen/DeepSeek) agar jawaban tidak terlalu panjang
            respText = respText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            
            // Jika ada AI yang menjawab dalam bahasa Inggris, kita bisa tambahkan instruksi atau biarkan dulu.

            // Memecah pesan panjang menjadi beberapa bubble chat (chunking)
            let remainingText = respText;
            const maxLength = 1950;
            let isFirst = true;

            while (remainingText.length > 0) {
                let chunk = remainingText.length > maxLength ? remainingText.substring(0, maxLength) : remainingText;
                
                if (remainingText.length > maxLength) {
                    const lastNewline = chunk.lastIndexOf('\n');
                    // Potong di enter terakhir agar rapi (tidak memotong kata di tengah jalan)
                    if (lastNewline > maxLength - 500) { 
                        chunk = chunk.substring(0, lastNewline);
                    }
                }
                
                if (isFirst) {
                    await message.reply(chunk).catch(() => {});
                    isFirst = false;
                } else {
                    await new Promise(r => setTimeout(r, 1200));
                    await message.channel.send(chunk).catch(() => {});
                }
                
                remainingText = remainingText.substring(chunk.length).trim();
            }
        } catch (e) {
            console.error(e);
            await message.reply('Otak AI saya sedang gangguan total. Coba lagi nanti!');
        }
    }
});

// ═══════════════════════════════════════════════════════
// ERROR HANDLERS
// ═══════════════════════════════════════════════════════
client.on('error', e => console.error('Client error:', e));
process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));

client.login(process.env.DISCORD_TOKEN);
