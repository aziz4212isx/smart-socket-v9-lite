const fs = require('fs');

let code = fs.readFileSync('D:\\discord_bot\\bot.js', 'utf8');

// Tambahkan handler /vc slash command di dalam interactionCreate
// Cari handler interaksi tombol VC yang sudah ada dan tambahkan handler slash command sebelumnya

const slashVcHandler = `
    // ── /vc Slash Command ──
    if (interaction.isChatInputCommand() && interaction.commandName === 'vc') {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const member = interaction.member;

        // Cari channel voice yang dimiliki user ini
        const userVcEntry = [...tempChannels.entries()].find(([, ownerId]) => ownerId === interaction.user.id);

        if (sub === 'help') {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('Panel Kontrol Voice Channel')
                .setDescription('Masuk ke channel **Buat Channel** terlebih dahulu, lalu gunakan command berikut:')
                .addFields({ name: 'Command', value:
                    '\`/vc lock\` - Kunci channel\\n' +
                    '\`/vc unlock\` - Buka channel\\n' +
                    '\`/vc rename [nama]\` - Ganti nama channel\\n' +
                    '\`/vc limit [0-99]\` - Atur batas member\\n' +
                    '\`/vc kick @member\` - Keluarkan member\\n' +
                    '\`/vc transfer @member\` - Transfer kepemilikan'
                });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!userVcEntry) {
            return interaction.reply({ content: 'Kamu tidak memiliki channel sementara yang aktif! Masuk ke channel **Buat Channel** terlebih dahulu.', ephemeral: true });
        }

        const [vcId] = userVcEntry;
        const vcChannel = guild.channels.cache.get(vcId);
        if (!vcChannel) {
            tempChannels.delete(vcId);
            return interaction.reply({ content: 'Channel kamu tidak ditemukan. Mungkin sudah terhapus karena kosong.', ephemeral: true });
        }

        if (sub === 'lock') {
            try {
                await vcChannel.permissionOverwrites.edit(guild.id, { Connect: false });
                return interaction.reply({ content: 'Channel **' + vcChannel.name + '** berhasil dikunci! Tidak ada orang baru yang bisa masuk.', ephemeral: true });
            } catch (e) { return interaction.reply({ content: 'Gagal mengunci channel: ' + e.message, ephemeral: true }); }
        }

        if (sub === 'unlock') {
            try {
                await vcChannel.permissionOverwrites.edit(guild.id, { Connect: true });
                return interaction.reply({ content: 'Channel **' + vcChannel.name + '** berhasil dibuka! Semua orang bisa masuk kembali.', ephemeral: true });
            } catch (e) { return interaction.reply({ content: 'Gagal membuka channel: ' + e.message, ephemeral: true }); }
        }

        if (sub === 'rename') {
            const newName = interaction.options.getString('nama');
            try {
                await vcChannel.setName(newName);
                return interaction.reply({ content: 'Nama channel berhasil diubah menjadi **' + newName + '**!', ephemeral: true });
            } catch (e) { return interaction.reply({ content: 'Gagal mengganti nama: ' + e.message, ephemeral: true }); }
        }

        if (sub === 'limit') {
            const limit = interaction.options.getInteger('jumlah');
            try {
                await vcChannel.setUserLimit(limit);
                return interaction.reply({ content: 'Batas member diubah menjadi **' + (limit === 0 ? 'tidak terbatas' : limit + ' orang') + '**!', ephemeral: true });
            } catch (e) { return interaction.reply({ content: 'Gagal mengatur batas: ' + e.message, ephemeral: true }); }
        }

        if (sub === 'kick') {
            const targetUser = interaction.options.getUser('member');
            const targetMember = guild.members.cache.get(targetUser.id);
            if (!targetMember) return interaction.reply({ content: 'Member tidak ditemukan.', ephemeral: true });
            if (targetMember.id === interaction.user.id) return interaction.reply({ content: 'Kamu tidak bisa kick diri sendiri!', ephemeral: true });
            if (targetMember.voice.channelId !== vcId) return interaction.reply({ content: 'Member tersebut tidak berada di channel kamu!', ephemeral: true });
            try {
                await targetMember.voice.disconnect('Dikick oleh pemilik channel');
                return interaction.reply({ content: '**' + targetMember.user.username + '** berhasil dikeluarkan dari channel!', ephemeral: true });
            } catch (e) { return interaction.reply({ content: 'Gagal kick member: ' + e.message, ephemeral: true }); }
        }

        if (sub === 'transfer') {
            const targetUser = interaction.options.getUser('member');
            const targetMember = guild.members.cache.get(targetUser.id);
            if (!targetMember) return interaction.reply({ content: 'Member tidak ditemukan.', ephemeral: true });
            if (targetMember.id === interaction.user.id) return interaction.reply({ content: 'Kamu sudah menjadi pemilik channel ini!', ephemeral: true });
            if (targetMember.voice.channelId !== vcId) return interaction.reply({ content: 'Member tersebut harus berada di channel kamu terlebih dahulu!', ephemeral: true });
            try {
                tempChannels.set(vcId, targetMember.id);
                await vcChannel.permissionOverwrites.edit(targetMember.id, {
                    ManageChannels: true, MuteMembers: true, DeafenMembers: true, MoveMembers: true
                });
                await vcChannel.permissionOverwrites.delete(interaction.user.id);
                await sendControlPanel(targetMember, vcChannel);
                return interaction.reply({ content: 'Kepemilikan channel berhasil ditransfer ke **' + targetMember.user.username + '**!', ephemeral: true });
            } catch (e) { return interaction.reply({ content: 'Gagal transfer kepemilikan: ' + e.message, ephemeral: true }); }
        }

        return;
    }

`;

// Sisipkan slash handler di awal blok interactionCreate
code = code.replace(
    `    if (!interaction.isButton()) return;`,
    slashVcHandler + `    if (!interaction.isButton()) return;`
);

fs.writeFileSync('D:\\discord_bot\\bot.js', code, 'utf8');
console.log('/vc slash command handler berhasil ditambahkan ke bot.js!');
