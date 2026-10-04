const fs = require('fs');

let code = fs.readFileSync('D:\\discord_bot\\bot.js', 'utf8');

// Ganti seluruh blok voiceStateUpdate dengan versi yang lebih lengkap
const oldVoiceBlock = `// ─── CREATOR CHANNEL (Voice State) ───────────────────────────
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
});`;

const newVoiceBlock = `// ─── CREATOR CHANNEL (Voice State) ───────────────────────────

// Helper: kirim panel kontrol ke owner via DM
async function sendControlPanel(owner, channel) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Panel Kontrol Channel Kamu')
        .setDescription('Kamu adalah pemilik channel **' + channel.name + '**!\\nGunakan tombol di bawah atau command \`!vc\` untuk mengelola channel-mu.')
        .addFields(
            { name: 'Command yang tersedia', value:
                '!vc lock - Kunci channel (tidak ada yang bisa masuk)\\n' +
                '!vc unlock - Buka kembali channel\\n' +
                '!vc rename [nama] - Ganti nama channel\\n' +
                '!vc limit [angka] - Atur batas member (0 = bebas)\\n' +
                '!vc kick @user - Keluarkan member dari channel\\n' +
                '!vc transfer @user - Pindahkan kepemilikan channel'
            }
        )
        .setFooter({ text: 'Panel ini hanya terlihat olehmu. Channel akan dihapus otomatis saat kosong.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vc_lock_' + channel.id).setLabel('Kunci').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('vc_unlock_' + channel.id).setLabel('Buka').setStyle(ButtonStyle.Success).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('vc_rename_' + channel.id).setLabel('Ganti Nama').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('vc_limit_' + channel.id).setLabel('Batas Member').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
        new ButtonBuilder().setCustomId('vc_kick_' + channel.id).setLabel('Kick Member').setStyle(ButtonStyle.Danger).setEmoji('👢')
    );

    try {
        await owner.send({ embeds: [embed], components: [row] });
    } catch (e) {
        // Jika DM gagal (user nonaktifkan DM), skip
        console.log('Gagal kirim DM panel ke ' + owner.user.tag + ' (DM mungkin dinonaktifkan)');
    }
}

client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild || oldState.guild;

    // ── Saat member MASUK ke channel trigger ──
    if (newState.channel && newState.channel.name === CREATE_CHANNEL_NAME) {
        try {
            const member = newState.member;
            
            const voiceCategory = guild.channels.cache.find(c => 
                c.name === 'VOICE CHANNELS' && c.type === ChannelType.GuildCategory
            );

            const newChannel = await guild.channels.create({
                name: member.user.username + 's Channel',
                type: ChannelType.GuildVoice,
                parent: voiceCategory ? voiceCategory.id : null,
                userLimit: 0,
                permissionOverwrites: [
                    {
                        // Pemilik punya kendali penuh atas channel ini
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MuteMembers,
                            PermissionsBitField.Flags.DeafenMembers,
                            PermissionsBitField.Flags.MoveMembers,
                            PermissionsBitField.Flags.PrioritySpeaker,
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak
                        ]
                    },
                    {
                        // Default: semua orang bisa masuk
                        id: guild.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel]
                    }
                ]
            });

            await member.voice.setChannel(newChannel);
            tempChannels.set(newChannel.id, member.id);

            // Kirim panel kontrol ke owner via DM
            await sendControlPanel(member, newChannel);

            console.log('Temp channel created: ' + newChannel.name + ' for ' + member.user.tag);
        } catch (e) {
            console.error('Creator channel error:', e);
        }
        return;
    }

    // ── Saat member KELUAR dari channel ──
    if (oldState.channel && tempChannels.has(oldState.channel.id)) {
        const channel = oldState.channel;
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
});`;

code = code.replace(oldVoiceBlock, newVoiceBlock);

// Tambahkan handler tombol VC di dalam interactionCreate setelah handler tiket
const oldTicketEnd = `    }
});

// ─── BOT COMMANDS ─────────────────────────────────────────────`;

const newTicketEnd = `    }

    // ── Panel Kontrol Voice Channel ──
    if (customId.startsWith('vc_lock_') || customId.startsWith('vc_unlock_') ||
        customId.startsWith('vc_rename_') || customId.startsWith('vc_limit_') ||
        customId.startsWith('vc_kick_')) {

        const parts = customId.split('_');
        const action = parts[1];
        const channelId = parts[parts.length - 1];

        // Pastikan hanya pemilik channel yang bisa menggunakan panel
        const ownerId = tempChannels.get(channelId);
        if (!ownerId || interaction.user.id !== ownerId) {
            return interaction.reply({ content: 'Hanya pemilik channel yang bisa menggunakan panel ini!', ephemeral: true });
        }

        const vcChannel = guild.channels.cache.get(channelId);
        if (!vcChannel) {
            return interaction.reply({ content: 'Channel tidak ditemukan. Mungkin sudah dihapus karena kosong.', ephemeral: true });
        }

        if (action === 'lock') {
            try {
                await vcChannel.permissionOverwrites.edit(guild.id, { Connect: false });
                await interaction.reply({ content: 'Channel **' + vcChannel.name + '** berhasil dikunci! Tidak ada orang baru yang bisa masuk.', ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: 'Gagal mengunci channel: ' + e.message, ephemeral: true });
            }
        } else if (action === 'unlock') {
            try {
                await vcChannel.permissionOverwrites.edit(guild.id, { Connect: true });
                await interaction.reply({ content: 'Channel **' + vcChannel.name + '** berhasil dibuka! Semua orang bisa masuk kembali.', ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: 'Gagal membuka channel: ' + e.message, ephemeral: true });
            }
        } else if (action === 'rename') {
            await interaction.reply({ content: 'Ketik nama baru untuk channel-mu menggunakan command:\\n\`!vc rename [nama baru]\`', ephemeral: true });
        } else if (action === 'limit') {
            await interaction.reply({ content: 'Atur batas member menggunakan command:\\n\`!vc limit [angka]\` (contoh: !vc limit 5)\\nGunakan 0 untuk tanpa batas.', ephemeral: true });
        } else if (action === 'kick') {
            await interaction.reply({ content: 'Kick member menggunakan command:\\n\`!vc kick @[nama member]\`', ephemeral: true });
        }
        return;
    }
});

// ─── BOT COMMANDS ─────────────────────────────────────────────`;

code = code.replace(oldTicketEnd, newTicketEnd);

// Tambahkan command !vc setelah command !tutuptiket
const vcCommands = `
    // ── !vc (Voice Channel Control) ──
    if (msg.startsWith('!vc ') || msg === '!vc') {
        const args = msg.split(' ').slice(1);
        const subCmd = args[0]?.toLowerCase();

        // Cari channel voice yang dimiliki user ini
        const userVcEntry = [...tempChannels.entries()].find(([, ownerId]) => ownerId === message.author.id);
        
        if (!userVcEntry) {
            return message.reply('Kamu tidak memiliki channel sementara yang aktif. Masuk ke channel **Buat Channel** terlebih dahulu!');
        }

        const [vcId] = userVcEntry;
        const vcChannel = message.guild.channels.cache.get(vcId);
        if (!vcChannel) {
            tempChannels.delete(vcId);
            return message.reply('Channel kamu tidak ditemukan. Mungkin sudah terhapus.');
        }

        if (!subCmd || subCmd === 'help') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('Panel Kontrol Channel Kamu')
                .setDescription('Channel aktif: **' + vcChannel.name + '**')
                .addFields({ name: 'Command', value:
                    '!vc lock - Kunci channel\\n' +
                    '!vc unlock - Buka channel\\n' +
                    '!vc rename [nama] - Ganti nama\\n' +
                    '!vc limit [0-99] - Atur batas member\\n' +
                    '!vc kick @user - Keluarkan member\\n' +
                    '!vc transfer @user - Transfer kepemilikan'
                });
            return message.reply({ embeds: [embed] });
        }

        if (subCmd === 'lock') {
            try {
                await vcChannel.permissionOverwrites.edit(message.guild.id, { Connect: false });
                return message.reply('Channel **' + vcChannel.name + '** berhasil dikunci!');
            } catch (e) { return message.reply('Gagal mengunci channel: ' + e.message); }
        }

        if (subCmd === 'unlock') {
            try {
                await vcChannel.permissionOverwrites.edit(message.guild.id, { Connect: true });
                return message.reply('Channel **' + vcChannel.name + '** berhasil dibuka!');
            } catch (e) { return message.reply('Gagal membuka channel: ' + e.message); }
        }

        if (subCmd === 'rename') {
            const newName = args.slice(1).join(' ');
            if (!newName) return message.reply('Masukkan nama baru! Contoh: !vc rename Ruang Santai');
            try {
                await vcChannel.setName(newName);
                return message.reply('Nama channel berhasil diubah menjadi **' + newName + '**!');
            } catch (e) { return message.reply('Gagal mengganti nama: ' + e.message); }
        }

        if (subCmd === 'limit') {
            const limit = parseInt(args[1]);
            if (isNaN(limit) || limit < 0 || limit > 99) return message.reply('Masukkan angka 0-99! (0 = tidak ada batas)');
            try {
                await vcChannel.setUserLimit(limit);
                return message.reply('Batas member channel diubah menjadi **' + (limit === 0 ? 'tidak terbatas' : limit + ' orang') + '**!');
            } catch (e) { return message.reply('Gagal mengatur batas: ' + e.message); }
        }

        if (subCmd === 'kick') {
            const targetMember = message.mentions.members.first();
            if (!targetMember) return message.reply('Sebutkan member yang ingin di-kick! Contoh: !vc kick @user');
            if (targetMember.id === message.author.id) return message.reply('Kamu tidak bisa kick diri sendiri!');
            try {
                if (targetMember.voice.channelId === vcId) {
                    await targetMember.voice.disconnect('Dikick oleh pemilik channel');
                    return message.reply('**' + targetMember.user.username + '** berhasil dikeluarkan dari channel!');
                } else {
                    return message.reply('Member tersebut tidak berada di channel kamu!');
                }
            } catch (e) { return message.reply('Gagal kick member: ' + e.message); }
        }

        if (subCmd === 'transfer') {
            const targetMember = message.mentions.members.first();
            if (!targetMember) return message.reply('Sebutkan member yang akan menerima kepemilikan! Contoh: !vc transfer @user');
            if (targetMember.id === message.author.id) return message.reply('Kamu sudah menjadi pemilik channel ini!');
            if (targetMember.voice.channelId !== vcId) return message.reply('Member tersebut harus berada di channel kamu terlebih dahulu!');
            try {
                // Update kepemilikan
                tempChannels.set(vcId, targetMember.id);
                // Beri izin ke pemilik baru
                await vcChannel.permissionOverwrites.edit(targetMember.id, {
                    ManageChannels: true, MuteMembers: true, DeafenMembers: true, MoveMembers: true
                });
                // Cabut izin dari pemilik lama
                await vcChannel.permissionOverwrites.delete(message.author.id);
                // Kirim panel kontrol ke pemilik baru
                await sendControlPanel(targetMember, vcChannel);
                return message.reply('Kepemilikan channel berhasil ditransfer ke **' + targetMember.user.username + '**!');
            } catch (e) { return message.reply('Gagal transfer kepemilikan: ' + e.message); }
        }

        return message.reply('Command tidak dikenal. Ketik !vc help untuk melihat daftar command.');
    }

`;

code = code.replace(
    `    // ── !tutuptiket ──`,
    vcCommands + `    // ── !tutuptiket ──`
);

// Update BOT_COMMANDS array untuk include !vc
code = code.replace(
    `const BOT_COMMANDS = ['!halo', '!ping', '!speedtest', '!invitebots', '!setup', '!updatepanduan', '!updateaturan', '!setuptiket', '!tutuptiket', '!rank', '!info', '!settanggallahir'];`,
    `const BOT_COMMANDS = ['!halo', '!ping', '!speedtest', '!invitebots', '!setup', '!updatepanduan', '!updateaturan', '!setuptiket', '!tutuptiket', '!rank', '!info', '!settanggallahir', '!vc'];`
);

fs.writeFileSync('D:\\discord_bot\\bot.js', code, 'utf8');
console.log('Panel kontrol voice channel berhasil ditambahkan!');
