const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Re-inject the correct NEW !updatepanduan handler (dropdown version)
const newPanduanHandler = `    // ── !updatepanduan ──
    if (msg === '!updatepanduan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'panduan-bot');
        if (!ch) return message.reply('Channel #panduan-bot tidak ditemukan!');
        // Hapus pesan lama agar tidak dobel
        const panduanFetched = await ch.messages.fetch({ limit: 20 });
        const panduanDel = panduanFetched.filter(m => m.author.id === client.user.id);
        if (panduanDel.size > 1) await ch.bulkDelete(panduanDel).catch(() => {});
        else if (panduanDel.size === 1) await panduanDel.first().delete().catch(() => {});
        
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('PANDUAN LENGKAP SERVER')
            .setDescription('Silakan pilih kategori panduan dari menu *dropdown* di bawah ini untuk melihat fitur-fitur yang tersedia di server kita.')
            .setImage('https://i.imgur.com/G4Yl36u.gif');
            
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
        await ch.send({ embeds: [embed], components: [panduanRow] });
        if (message.channel.id !== ch.id) await message.channel.send('<@' + uid + '> Panduan diperbarui di <#' + ch.id + '>!').catch(() => {});
        return;
    }

`;

// Insert it before // !updatepanduan handled below marker
code = code.replace(
    '    // !updatepanduan handled below\n',
    newPanduanHandler
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('[FIX] Re-injected correct !updatepanduan dropdown handler');
