const fs = require('fs');

let code = fs.readFileSync('D:\\discord_bot\\bot.js', 'utf8');

// Tambahkan GatewayIntentBits.GuildVoiceStates ke intents
code = code.replace(
    `        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent`,
    `        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent`
);

// Tambahkan Map untuk track channel sementara (setelah baris const xpCooldown)
code = code.replace(
    `// XP cooldown per user (userId -> timestamp)
const xpCooldown = new Map();`,
    `// XP cooldown per user (userId -> timestamp)
const xpCooldown = new Map();

// Track temporary voice channels (channelId -> ownerId)
const tempChannels = new Map();

// Nama channel trigger untuk membuat channel baru
const CREATE_CHANNEL_NAME = 'Buat Channel';`
);

// Tambahkan event voiceStateUpdate setelah event guildBanAdd
const voiceStateCode = `
// ─── CREATOR CHANNEL (Voice State) ───────────────────────────
client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild || oldState.guild;

    // ── Saat member MASUK ke channel trigger ──
    if (newState.channel && newState.channel.name === CREATE_CHANNEL_NAME) {
        try {
            const member = newState.member;
            
            // Cari kategori VOICE CHANNELS
            const voiceCategory = guild.channels.cache.find(c => 
                c.name === 'VOICE CHANNELS' && c.type === ChannelType.GuildCategory
            );

            // Buat channel sementara baru
            const newChannel = await guild.channels.create({
                name: member.user.username + ' Channel',
                type: ChannelType.GuildVoice,
                parent: voiceCategory ? voiceCategory.id : null,
                userLimit: 0, // 0 = unlimited
                permissionOverwrites: [
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MuteMembers,
                            PermissionsBitField.Flags.DeafenMembers,
                            PermissionsBitField.Flags.MoveMembers
                        ]
                    }
                ]
            });

            // Pindahkan member ke channel baru
            await member.voice.setChannel(newChannel);

            // Simpan ke Map
            tempChannels.set(newChannel.id, member.id);

            console.log('Temp channel created: ' + newChannel.name + ' for ' + member.user.tag);
        } catch (e) {
            console.error('Creator channel error:', e);
        }
    }

    // ── Saat member KELUAR dari channel ──
    if (oldState.channel && tempChannels.has(oldState.channel.id)) {
        const channel = oldState.channel;
        // Cek apakah channel sudah kosong
        if (channel.members.size === 0) {
            try {
                await channel.delete('Temporary channel kosong - auto delete');
                tempChannels.delete(channel.id);
                console.log('Temp channel deleted: ' + channel.name);
            } catch (e) {
                console.error('Error deleting temp channel:', e);
                tempChannels.delete(channel.id);
            }
        }
    }
});

`;

// Sisipkan sebelum event messageCreate
code = code.replace(
    `// ─── BOT COMMANDS ─────────────────────────────────────────────`,
    voiceStateCode + `// ─── BOT COMMANDS ─────────────────────────────────────────────`
);

// Update !setup untuk menambahkan channel "Buat Channel" di kategori VOICE CHANNELS
code = code.replace(
    `            if (!guild.channels.cache.find(c => c.name === 'Lounge' && c.parentId === voiceCat.id))
                await guild.channels.create({ name: 'Lounge', type: ChannelType.GuildVoice, parent: voiceCat.id });
            await setupMsg.edit('Setup selesai! Semua kategori, channel, dan role telah dibuat.');`,
    `            if (!guild.channels.cache.find(c => c.name === 'Lounge' && c.parentId === voiceCat.id))
                await guild.channels.create({ name: 'Lounge', type: ChannelType.GuildVoice, parent: voiceCat.id });
            if (!guild.channels.cache.find(c => c.name === 'Buat Channel' && c.parentId === voiceCat.id))
                await guild.channels.create({ name: 'Buat Channel', type: ChannelType.GuildVoice, parent: voiceCat.id });
            await setupMsg.edit('Setup selesai! Semua kategori, channel, dan role telah dibuat. Termasuk Creator Channel di VOICE CHANNELS.');`
);

fs.writeFileSync('D:\\discord_bot\\bot.js', code, 'utf8');
console.log('Creator channel berhasil ditambahkan ke bot.js!');
