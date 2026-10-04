const fs = require('fs');

const injectionCode = `
    else if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
        return interaction.reply('Pong! Latensi: ' + (Date.now() - interaction.createdTimestamp) + 'ms');
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'vc') {
        const subCmd = interaction.options.getSubcommand();
        const uid = interaction.user.id;
        const entry = [...tempChannels.entries()].find(([, o]) => o === uid);
        if (!entry) return interaction.reply({ content: 'Kamu tidak punya channel aktif! Masuk ke **Buat Channel** dulu.', flags: 64 });
        const [vcId] = entry;
        const vcCh = interaction.guild.channels.cache.get(vcId);
        if (!vcCh) { tempChannels.delete(vcId); return interaction.reply({ content: 'Channel tidak ditemukan.', flags: 64 }); }
        
        if (subCmd === 'help') return interaction.reply({ content: 'Gunakan /vc untuk mengontrol channel kamu (lock, unlock, rename, limit, kick, transfer).', flags: 64 });
        if (subCmd === 'lock') { await vcCh.permissionOverwrites.edit(interaction.guild.id, { Connect: false }); return interaction.reply({ content: '🔒 Dikunci!', flags: 64 }); }
        if (subCmd === 'unlock') { await vcCh.permissionOverwrites.edit(interaction.guild.id, { Connect: true }); return interaction.reply({ content: '🔓 Dibuka!', flags: 64 }); }
        if (subCmd === 'rename') { const n = interaction.options.getString('nama'); await vcCh.setName(n); return interaction.reply({ content: '✏️ Nama diubah: **' + n + '**', flags: 64 }); }
        if (subCmd === 'limit') { const l = interaction.options.getInteger('jumlah'); await vcCh.setUserLimit(l); return interaction.reply({ content: '👥 Batas: **' + (l===0?'Tidak terbatas':l+' orang') + '**', flags: 64 }); }
        if (subCmd === 'kick') { const t = interaction.options.getMember('member'); if (!t||t.voice.channelId!==vcId) return interaction.reply({ content: 'Member tidak ada di channel kamu!', flags: 64 }); await t.voice.disconnect(); return interaction.reply({ content: '👢 ' + t.user.username + ' dikeluarkan!', flags: 64 }); }
        if (subCmd === 'transfer') { const t = interaction.options.getMember('member'); if (!t||t.voice.channelId!==vcId) return interaction.reply({ content: 'Member harus di channel kamu!', flags: 64 }); tempChannels.set(vcId,t.id); await vcCh.permissionOverwrites.edit(t.id,{ManageChannels:true,MuteMembers:true,DeafenMembers:true,MoveMembers:true}); await vcCh.permissionOverwrites.delete(uid); await sendControlPanel(t,vcCh); return interaction.reply({ content: '👑 Ditransfer ke ' + t.user.username, flags: 64 }); }
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'tanya') {
        await interaction.deferReply();
        const prompt = interaction.options.getString('pertanyaan');
        const uid = interaction.user.id;
        const lastAI = aiCooldown.get(uid) || 0;
        if (Date.now() - lastAI < 4000) {
            return interaction.editReply('Sabar ya! Tunggu beberapa detik sebelum bertanya lagi.');
        }
        aiCooldown.set(uid, Date.now());

        const memoryId = interaction.channel?.type === ChannelType.GuildVoice || tempChannels.has(interaction.channelId)
            ? 'room_' + interaction.channelId
            : 'user_' + uid;
        let respText;
        try {
            const aiResult = await callAIWithMemory(prompt, memoryId, process.env);
            respText = aiResult.text + '\\n\\n\`[💡 Token Dipakai: ' + aiResult.tokens + ' | Memori: ' + aiResult.historyLength + '/20]\`';
        } catch (e) {
            return interaction.editReply('Maaf, AI gagal merespon: ' + e.message);
        }
        respText = respText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
        
        let remainingText = respText;
        const maxLength = 1950;
        let isFirst = true;

        while (remainingText.length > 0) {
            let chunk = remainingText.length > maxLength ? remainingText.substring(0, maxLength) : remainingText;
            if (remainingText.length > maxLength) {
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastSpace > maxLength - 200) chunk = chunk.substring(0, lastSpace);
            }
            if (isFirst) {
                await interaction.editReply(chunk);
                isFirst = false;
            } else {
                await interaction.channel.send(chunk);
            }
            remainingText = remainingText.substring(chunk.length).trim();
        }
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'rank') {
        const targetUser = interaction.options.getUser('member') || interaction.user;
        xpData = load(FILES.xp);
        const d = xpData[targetUser.id] || { xp: 0, level: 0 };
        const lv = getLevel(d.xp);
        const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('Level - ' + targetUser.username)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Level', value: lv.toString(), inline: true },
                { name: 'XP', value: Math.round(d.xp).toString(), inline: true },
                { name: 'XP ke Level Berikutnya', value: Math.round(getXPForLevel(lv + 1)).toString(), inline: true }
            ).setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'info') {
        const targetUser = interaction.options.getUser('member') || interaction.user;
        const target = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id);
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
        return interaction.reply({ embeds: [embed] });
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'saldo') {
        const targetUser = interaction.user;
        economyData = load(FILES.economy);
        ensureEco(targetUser.id);
        const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle('Saldo Koin - ' + targetUser.username)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields({ name: '💰 Koin', value: economyData[targetUser.id].coins.toString() + ' koin', inline: true }).setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'daily') {
        const uid = interaction.user.id;
        economyData = load(FILES.economy);
        ensureEco(uid);
        const last = economyData[uid].lastDaily || 0;
        const diff = Date.now() - last;
        if (diff < 86400000) {
            const jam = Math.floor((86400000 - diff) / 3600000);
            const mnt = Math.floor(((86400000 - diff) % 3600000) / 60000);
            return interaction.reply('Kamu sudah claim daily hari ini! Tunggu **' + jam + ' jam ' + mnt + ' menit** lagi.');
        }
        const reward = Math.floor(Math.random() * 400) + 100;
        economyData[uid].coins     += reward;
        economyData[uid].lastDaily  = Date.now();
        save(FILES.economy, economyData);
        return interaction.reply('✅ Kamu mendapat **' + reward + ' koin** dari reward harian! Saldo: ' + economyData[uid].coins + ' koin.');
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'transfer') {
        const targetUser = interaction.options.getUser('penerima');
        const amount = interaction.options.getInteger('jumlah');
        const uid = interaction.user.id;
        if (targetUser.id === uid) return interaction.reply('Tidak bisa transfer ke diri sendiri!');
        economyData = load(FILES.economy);
        ensureEco(uid); ensureEco(targetUser.id);
        if (economyData[uid].coins < amount) return interaction.reply('Koin tidak cukup! Kamu hanya punya ' + economyData[uid].coins + ' koin.');
        economyData[uid].coins   -= amount;
        economyData[targetUser.id].coins += amount;
        save(FILES.economy, economyData);
        return interaction.reply('✅ Berhasil transfer **' + amount + ' koin** ke ' + targetUser.toString() + '. Sisa saldo: ' + economyData[uid].coins + ' koin.');
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'shop') {
        const items = SHOP_ITEMS.map((i, idx) => (idx+1) + '. **' + i.name + '** — ' + i.price + ' koin (!beli ' + i.id + ')').join('\\n');
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE67E22).setTitle('Toko Server').setDescription(items)] });
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'beli') {
        const itemId = interaction.options.getString('item');
        const item   = SHOP_ITEMS.find(i => i.id === itemId || i.name.toLowerCase() === itemId.toLowerCase() || SHOP_ITEMS.indexOf(i) + 1 === parseInt(itemId));
        if (!item) return interaction.reply('Item tidak ditemukan. Ketik !shop untuk melihat daftar.');
        const uid = interaction.user.id;
        economyData = load(FILES.economy);
        ensureEco(uid);
        if (economyData[uid].coins < item.price) return interaction.reply('Koin tidak cukup! Kamu butuh ' + item.price + ' koin, tapi hanya punya ' + economyData[uid].coins + ' koin.');
        const role = interaction.guild.roles.cache.find(r => r.name === item.role);
        if (!role) return interaction.reply('Role tidak ditemukan di server. Hubungi Admin!');
        if (interaction.member.roles.cache.has(role.id)) return interaction.reply('Kamu sudah punya role ini!');
        economyData[uid].coins -= item.price;
        save(FILES.economy, economyData);
        await interaction.member.roles.add(role).catch(() => {});
        return interaction.reply('✅ Berhasil membeli **' + item.name + '**! Sisa: ' + economyData[uid].coins + ' koin.');
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Hanya Administrator!', flags: 64 });
        const waktu = interaction.options.getString('waktu');
        const prize = interaction.options.getString('hadiah');
        let menit = parseInt(waktu);
        if (waktu.endsWith('h')) menit = parseInt(waktu) * 60;
        else if (waktu.endsWith('d')) menit = parseInt(waktu) * 1440;
        if (isNaN(menit) || menit < 1) return interaction.reply({ content: 'Format waktu salah!', flags: 64 });
        
        await interaction.deferReply();
        const endsAt  = Date.now() + menit * 60000;
        const endTime = new Date(endsAt).toLocaleTimeString('id-ID');
        const embed   = new EmbedBuilder()
            .setColor(0xFFD700).setTitle('🎉 GIVEAWAY!').setDescription('Klik tombol di bawah untuk ikut!')
            .addFields(
                { name: 'Hadiah', value: prize, inline: true },
                { name: 'Berakhir pukul', value: endTime, inline: true },
                { name: 'Durasi', value: menit + ' menit', inline: true }
            ).setTimestamp(endsAt);
        const sentMsg = await interaction.channel.send({ embeds: [embed], components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('placeholder').setLabel('Sedang disiapkan...').setStyle(ButtonStyle.Secondary).setDisabled(true)
            )
        ]});
        await sentMsg.edit({ components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gw_enter_' + sentMsg.id).setLabel('Ikut Giveaway').setStyle(ButtonStyle.Primary).setEmoji('🎉')
        )]});
        giveawayData = load(FILES.giveaway);
        giveawayData[sentMsg.id] = { prize, endsAt, guildId: interaction.guild.id, channelId: interaction.channel.id, participants: [] };
        save(FILES.giveaway, giveawayData);
        setTimeout(() => endGiveaway(sentMsg.id), menit * 60000);
        await interaction.editReply('Giveaway **' + prize + '** selama ' + menit + ' menit berhasil dibuat!');
        setTimeout(() => interaction.deleteReply().catch(()=>{}), 5000);
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'poll') {
        const question = interaction.options.getString('pertanyaan');
        const opsi1 = interaction.options.getString('opsi1');
        const opsi2 = interaction.options.getString('opsi2');
        const opsi3 = interaction.options.getString('opsi3');
        const opsi4 = interaction.options.getString('opsi4');
        
        const options = [opsi1, opsi2];
        if (opsi3) options.push(opsi3);
        if (opsi4) options.push(opsi4);
        
        const pollId   = Date.now().toString();
        pollsData = load(FILES.polls);
        pollsData[pollId] = { question, options: options.map(o => ({ label: o, votes: 0 })), voters: {}, channelId: interaction.channel.id };
        save(FILES.polls, pollsData);
        const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'];
        const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('📊 ' + question)
            .setDescription(options.map((o,i) => emojis[i] + ' ' + o).join('\\n'))
            .setFooter({ text: 'ID: ' + pollId });
        const row = new ActionRowBuilder().addComponents(
            options.map((o, i) => new ButtonBuilder().setCustomId('poll_vote_' + pollId + '_' + i).setLabel(o.substring(0, 80)).setStyle(ButtonStyle.Secondary))
        );
        await interaction.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
        return interaction.reply({ content: 'Polling dibuat!', flags: 64 });
    }
    else if (interaction.isChatInputCommand() && interaction.commandName === 'afk') {
        const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';
        const uid = interaction.user.id;
        afkData = load(FILES.afk);
        afkData[uid] = { reason, name: interaction.user.username, since: Date.now() };
        save(FILES.afk, afkData);
        const currentNick = interaction.member.nickname || interaction.user.username;
        if (!currentNick.startsWith('[AFK] ')) {
            try { await interaction.member.setNickname('[AFK] ' + currentNick); } catch {}
        }
        return interaction.reply({ content: 'Status AFK kamu telah diset. Alasan: *' + reason + '*' });
    }`;

let bot = fs.readFileSync('D:/discord_bot/bot_v2.js', 'utf8');

const anchor = "return interaction.reply({ content: '?? Role **' + name + '** berhasil dihapus dari tombol!', flags: 64 });\\n    }\\n}";

// Wait, the indentation might be different. Let's just find the index of the string and append to it.
const searchStr = "berhasil dihapus dari tombol!', flags: 64 });";
let idx = bot.indexOf(searchStr);
if (idx !== -1) {
    // find the next two closing braces
    let braceCount = 0;
    let endIdx = idx;
    while (braceCount < 2 && endIdx < bot.length) {
        if (bot[endIdx] === '}') braceCount++;
        endIdx++;
    }
    
    if (braceCount === 2 && !bot.includes("interaction.commandName === 'ping'")) {
        bot = bot.slice(0, endIdx) + injectionCode + bot.slice(endIdx);
        fs.writeFileSync('D:/discord_bot/bot.js', bot, 'utf8');
        console.log('Injection successful');
    } else {
        console.log('Already injected or braces not found');
    }
} else {
    console.log('Search string not found!');
}
