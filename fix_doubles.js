const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');

// -----------------------------------------------------------------------
// BUG 1: !updatepanduan has TWO handlers. Remove the OLD one (L1338+)
//        The NEW one (with dropdown menu) is at L1325... wait let me re-check.
//        From output: setuptiket is at L1325, updatepanduan first at L1325 area
//        and second at L1338. Actually the first updatepanduan (L1338 from find_handlers)
//        is the OLD text-based panduan. The NEW dropdown-based one should appear elsewhere.
//        Let's find both and keep only the dropdown one.
// -----------------------------------------------------------------------

// Count occurrences of !updatepanduan handlers
const oldPanduanMarker = `        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('PANDUAN LENGKAP BOT')
            .setDescription('Panduan semua fitur yang tersedia di server ini.')
            .addFields(
                { name: '--- BOT SERVER ---', value: '\\u200b' },
                { name: '1. ASISTEN AI & FITUR SERVER', value: 'Chat dengan AI: /tanya [pertanyaan] atau @Asisten AI\\n\\n**Slash Commands (Ketik /)**:\\n/rank, /info - Cek Profil\\n/saldo, /daily, /transfer, /shop, /beli - Ekonomi\\n/giveaway, /poll, /afk - Interaksi\\n\\n**Command Admin (!)**:\\n!warn, !warns, !clearwarn - Moderasi\\n!setup, !updatepanduan, !updateaturan - Konfigurasi Server' },
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
        if (message.channel.id !== ch.id) message.channel.send('<@' + uid + '> Panduan diperbarui di <#' + ch.id + '>!').catch(() => {});
        return;
    }`;

// Remove the entire OLD !updatepanduan handler block
// Find and remove the block that starts with `if (msg === '!updatepanduan')` and contains the old text panduan
const oldHandlerStart = `    // ── !updatepanduan ──\n    if (msg === '!updatepanduan') {\n        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');\n        const ch = message.guild.channels.cache.find(c => c.name === 'panduan-bot');\n        if (!ch) return message.reply('Channel #panduan-bot tidak ditemukan!');\n        const fetched = await ch.messages.fetch({ limit: 10 });\n        const del = fetched.filter(m => (Date.now()-m.createdTimestamp) < 1209600000);\n        if (del.size > 1) await ch.bulkDelete(del).catch(() => {}); else if (del.size === 1) await del.first().delete().catch(() => {});`;

if (code.includes(oldPanduanMarker)) {
    // Build the full old block to remove
    const fullOldBlock = oldHandlerStart + '\n' + oldPanduanMarker;
    code = code.replace(fullOldBlock, '    // !updatepanduan handled below');
    console.log('[FIX 1] Removed duplicate old !updatepanduan handler');
} else {
    console.log('[SKIP 1] Old panduan block not found in expected format - manual check needed');
    // Let's count how many times msg === '!updatepanduan' appears
    const count = (code.match(/msg === '!updatepanduan'/g) || []).length;
    console.log('  Found ' + count + ' updatepanduan handlers');
}

// -----------------------------------------------------------------------
// BUG 2: !setuproles - add delete old messages before sending new embed
// -----------------------------------------------------------------------
const setupRolesOld = `    if (msg === '!setuproles') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const roleCh = message.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
        if (!roleCh) return message.reply('Channel #pilih-role tidak ditemukan. Jalankan !setup dulu!');
        const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('https://i.imgurcom/rM5L32x.gif')`;

const setupRolesNew = `    if (msg === '!setuproles') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const roleCh = message.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
        if (!roleCh) return message.reply('Channel #pilih-role tidak ditemukan. Jalankan !setup dulu!');
        // Hapus pesan lama agar tidak dobel
        const roleChFetched = await roleCh.messages.fetch({ limit: 20 });
        const roleChDel = roleChFetched.filter(m => m.author.id === client.user.id);
        if (roleChDel.size > 1) await roleCh.bulkDelete(roleChDel).catch(() => {});
        else if (roleChDel.size === 1) await roleChDel.first().delete().catch(() => {});
        const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('https://i.imgur.com/rM5L32x.gif')`;

if (code.includes(setupRolesOld)) {
    code = code.replace(setupRolesOld, setupRolesNew);
    console.log('[FIX 2] Added delete-old-messages to !setuproles');
} else {
    console.log('[WARN 2] !setuproles block not found in expected format');
}

// -----------------------------------------------------------------------
// BUG 3: !setuptiket - add delete old messages before sending new embed
// -----------------------------------------------------------------------
const setupTiketOld = `    if (msg === '!setuptiket') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'tiket' && c.type === ChannelType.GuildText);
        if (!ch) return message.reply('Channel #tiket tidak ditemukan!');
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Sistem Tiket Dukungan').setImage('https://i.imgur.com/KqZcK91.gif')`;

const setupTiketNew = `    if (msg === '!setuptiket') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        const ch = message.guild.channels.cache.find(c => c.name === 'tiket' && c.type === ChannelType.GuildText);
        if (!ch) return message.reply('Channel #tiket tidak ditemukan!');
        // Hapus pesan lama agar tidak dobel
        const tiketFetched = await ch.messages.fetch({ limit: 20 });
        const tiketDel = tiketFetched.filter(m => m.author.id === client.user.id);
        if (tiketDel.size > 1) await ch.bulkDelete(tiketDel).catch(() => {});
        else if (tiketDel.size === 1) await tiketDel.first().delete().catch(() => {});
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Sistem Tiket Dukungan').setImage('https://i.imgur.com/KqZcK91.gif')`;

if (code.includes(setupTiketOld)) {
    code = code.replace(setupTiketOld, setupTiketNew);
    console.log('[FIX 3] Added delete-old-messages to !setuptiket');
} else {
    console.log('[WARN 3] !setuptiket block not found in expected format');
}

// -----------------------------------------------------------------------
// BUG 4: Also fix the imgur URL typo in setuproles image
// 'https://i.imgurcom/rM5L32x.gif'  <- missing dot before com!
// -----------------------------------------------------------------------
code = code.replace(/https:\/\/i\.imgurcom\//g, 'https://i.imgur.com/');
console.log('[FIX 4] Fixed imgur URL typo (imgurcom -> imgur.com)');

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('\nDone. Run syntax check next.');
