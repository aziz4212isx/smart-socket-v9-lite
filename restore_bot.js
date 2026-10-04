const fs = require('fs');
let brokenCode = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Find where the real code begins after the broken updateNickname
// The broken part ends with: await member.setNickname(prefix + ' | ' + baseName).catch(() => {}); \n }mory, resetMemory } = require('./ai_memory.js');
const endOfBroken = brokenCode.indexOf("cif (customId.startsWith('role_')) {");

const tail = brokenCode.substring(endOfBroken).replace("cif", "if");

const header = `require('dotenv').config();
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
        GatewayIntentBits.GuildPresences
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
const LEVEL_ROLES   = { 5: 'Veteran', 10: 'Elite', 20: 'Legend' };
const SHOP_ITEMS    = [
    { id: 'vip',   name: 'Role VIP',   price: 500,  role: 'VIP' },
    { id: 'elite', name: 'Role Elite', price: 1500, role: 'Elite' },
];

function getLevel(xp)       { return Math.floor(0.1 * Math.sqrt(xp)); }
function getXPForLevel(lv)  { return Math.pow(lv / 0.1, 2); }
function ensureEco(uid)     { if (!economyData[uid]) economyData[uid] = { coins: 0, lastDaily: 0 }; }

const BOT_COMMANDS = [
    '!setup', '!setuproles', '!bday', '!stats', '!giveaway', '!g', '!poll',
    '!vc', '!speedtest', '!resetmemori', '!tanya'
];

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
        
        let mCh = guild.channels.cache.find(c => c.name.startsWith('Members: '));
        if (!mCh) {
            const cat = guild.channels.cache.find(c => c.name === 'SERVER STATS' && c.type === ChannelType.GuildCategory);
            if (cat) mCh = await guild.channels.create({ name: 'Members: ' + memCount, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });
        } else { await mCh.setName('Members: ' + memCount).catch(() => {}); }

        let bCh = guild.channels.cache.find(c => c.name.startsWith('Bots: '));
        if (!bCh) {
            const cat = guild.channels.cache.find(c => c.name === 'SERVER STATS' && c.type === ChannelType.GuildCategory);
            if (cat) bCh = await guild.channels.create({ name: 'Bots: ' + botCount, type: ChannelType.GuildVoice, parent: cat.id, permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }] });
        } else { await bCh.setName('Bots: ' + botCount).catch(() => {}); }
    } catch {}
}

async function updateNickname(member, roleName) {
    if (!member || !member.manageable) return; 
    const roles = loadRoles();
    let prefix = '';
    const staticMap = { 'VIP': '🌟 VIP', 'Admin': '🛡️ Admin' };
    if (staticMap[roleName]) { prefix = staticMap[roleName]; }
    else {
        const dynamicRole = roles.find(r => r.name === roleName);
        if (dynamicRole) prefix = dynamicRole.emoji + ' ' + (dynamicRole.name.split(' ')[0]);
    }
    if (!prefix) return;
    let baseName = member.nickname || member.user.username;
    if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
    baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();
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
`;

// Looking closely at tail, it starts with interaction handler code or client.on?
// The corrupted file shows:
// cif (customId.startsWith('role_')) {
// This implies interactionCreate was deleted too!
// Let's find interactionCreate in the broken file.
const fullNew = header + tail;
fs.writeFileSync('D:/discord_bot/bot.js', fullNew, 'utf8');
console.log('Restored top part of bot.js');
