const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Replace !updatepanduan command
const oldPanduan = `        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('PANDUAN LENGKAP BOT')
            .setDescription('Panduan semua fitur yang tersedia di server ini.')
            .addFields(
                { name: '--- BOT SERVER ---', value: '\\u200b' },
                { name: '1. ASISTEN AI & FITUR SERVER', value: 'Chat dengan AI: /tanya [pertanyaan] atau @Asisten AI\\n\\n**Slash Commands (Ketik /)**:\\n/rank, /info - Cek Profil\\n/saldo, /daily, /transfer, /shop, /beli - Ekonomi\\n/giveaway, /poll, /afk - Interaksi\\n\\n**Command Admin (!)**:\\n!warn, !warns, !clearwarn - Moderasi\\n!setup, !updatepanduan, !updateaturan - Konfigurasi Server' },
                { name: '2. VERIFIKASI & ROLE', value: 'Member baru masuk   verifikasi di #verifikasi   pilih gender   akses penuh\\nPilih role minat di #pilih-role (Gamer, Musik, Kreator, dll)' },
                { name: '3. LEVEL & ECONOMY', value: 'Chat aktif = XP + Koin\\nLevel 5: Role Veteran | Level 10: Elite | Level 20: Legend\\n!rank - Cek level | !saldo - Cek koin | !daily - Klaim harian | !shop - Beli role' },
                { name: '4. VOICE CHANNEL', value: 'Masuk **Buat Channel**   channel pribadimu dibuat otomatis\\n/vc lock/unlock/rename/limit/kick/transfer - Kontrol channel' },
                { name: '5. TIKET', value: 'Pergi ke #tiket   klik Buka Tiket   channel privat dibuat\\n!tutuptiket - Tutup tiket' },
                { name: '--- BOT EKSTERNAL ---', value: '\\u200b' },
                { name: '6. JOCKIE MUSIC', value: 'm!play [lagu] | m!skip | m!stop | m!queue | m!pause | m!resume' },
                { name: '7. PROBOT', value: '/rank | /top | /warnings' },
                { name: '8. MUDAE & DANK MEMER', value: 'Mudae: $w $m $h | Dank Memer: /pls beg, /pls hunt' }
            ).setFooter({ text: 'Gunakan command di #bot-command agar #general tetap rapi!' }).setTimestamp();
        await ch.send({ embeds: [embed] });`;

const newPanduan = `        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('PANDUAN LENGKAP SERVER')
            .setDescription('Silakan pilih kategori panduan dari menu *dropdown* di bawah ini untuk melihat fitur-fitur yang tersedia di server kita.')
            .setImage('https://i.imgur.com/G4Yl36u.gif');
            
        const row = new ActionRowBuilder().addComponents(
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
        await ch.send({ embeds: [embed], components: [row] });`;

code = code.replace(oldPanduan, newPanduan);

// Add interaction handler for StringSelectMenu
const menuHandler = `
    // PANDUAN DROPDOWN MENU
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_panduan') {
        const val = interaction.values[0];
        let pEmbed = new EmbedBuilder().setColor(0x5865F2).setTimestamp();
        if (val === 'panduan_ai') {
            pEmbed.setTitle('🤖 Panduan Asisten AI & Interaksi').setDescription('**Chat dengan AI**\\nKetik \`/tanya [pertanyaan]\` atau sebut *@Asisten AI* di chat.\\n\\n**Slash Commands (Ketik /)**:\\n\`/giveaway\` - Buat event giveaway\\n\`/poll\` - Buat polling\\n\`/afk\` - Pasang status AFK\\n\`/info\` - Cek Profil Member');
        } else if (val === 'panduan_eco') {
            pEmbed.setTitle('💰 Ekonomi, Minigames & Level').setDescription('**Sistem Koin & Minigames**\\n\`/saldo\` - Cek koin kamu\\n\`/daily\` - Klaim koin harian\\n\`/transfer\` - Kirim koin ke teman\\n\`/coinflip\` & \`/slots\` - Main game taruhan koin\\n\`/shop\` & \`/beli\` - Toko Server\\n\\n**Sistem Leveling**\\nChat aktif akan memberimu XP.\\n- Level 5: Role Veteran 🎖️\\n- Level 10: Role Elite 💎\\n- Level 20: Role Legend 👑');
        } else if (val === 'panduan_vc') {
            pEmbed.setTitle('🎤 Voice Channel Pribadi').setDescription('**Cara Penggunaan:**\\nMasuk ke channel **[Buat Channel]** dan sistem otomatis membuatkan Voice Channel khusus untukmu!\\n\\n**Kontrol Channel:**\\nKetik \`/vc\` untuk melihat menu panel, atau gunakan slash command langsung:\\n\`/vc lock\` - Kunci channel\\n\`/vc unlock\` - Buka channel\\n\`/vc limit\` - Batasi jumlah orang\\n\`/vc kick\` - Usir member dari channel');
        } else if (val === 'panduan_tiket') {
            pEmbed.setTitle('🎫 Sistem Tiket Support').setDescription('Jika butuh bantuan Admin:\\n1. Pergi ke channel **#tiket**\\n2. Klik tombol **Buka Tiket**\\n3. Channel privat khusus untukmu akan dibuat.\\n4. Setelah selesai, klik tombol merah **🔒 Tutup Tiket** di dalam tiket tersebut.');
        } else if (val === 'panduan_eksternal') {
            pEmbed.setTitle('🔌 Panduan Bot Eksternal').setDescription('**Jockie Music** (Putar Lagu)\\n\`m!play [lagu]\` - Putar musik\\n\`m!skip\` - Lewati lagu\\n\`m!stop\` - Berhenti\\n\\n**Probot** (Moderasi)\\n\`/rank\` - Cek Level Card\\n\`/top\` - Leaderboard Text/Voice\\n\\n**Mudae** (Game Gacha)\\n\`$w\` - Waifu gacha\\n\`$h\` - Husbando gacha');
        }
        await interaction.reply({ embeds: [pEmbed], ephemeral: true });
        return;
    }
`;

code = code.replace(`if (customId === 'buka_tiket') {`, menuHandler + `\n    if (customId === 'buka_tiket') {`);
// wait wait, stringselectmenu doesn't have customId as a top level variable if the bot only extracts it from ButtonInteraction
// Let's check how interactionCreate starts
//   const customId = interaction.customId;  (is usually valid for select menus too).

// Ensure StringSelectMenuBuilder is imported.
// In bot.js line 5: EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes
if (!code.includes('StringSelectMenuBuilder')) {
    code = code.replace('ButtonBuilder, ButtonStyle,', 'ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,');
}

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Bot beautification part 2 implemented.');
