const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// ===========================================================
// FIX 1: !updateaturan - change delete filter to bot-only messages
// Old filter: (Date.now()-m.createdTimestamp) < 1209600000
// New filter: m.author.id === client.user.id
// ===========================================================
const oldAturanDelete = `        const fetched = await ch.messages.fetch({ limit: 10 });
        const del = fetched.filter(m => (Date.now()-m.createdTimestamp) < 1209600000);
        if (del.size > 1) await ch.bulkDelete(del).catch(() => {}); else if (del.size === 1) await del.first().delete().catch(() => {});
        const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('ATURAN SERVER')`;

const newAturanDelete = `        // Hapus SEMUA pesan bot di channel aturan agar tidak dobel
        const aturanFetched = await ch.messages.fetch({ limit: 50 });
        const aturanDel = aturanFetched.filter(m => m.author.id === client.user.id);
        if (aturanDel.size > 1) await ch.bulkDelete(aturanDel).catch(async () => {
            // bulkDelete gagal jika pesan > 14 hari, hapus satu per satu
            for (const [, m] of aturanDel) await m.delete().catch(() => {});
        });
        else if (aturanDel.size === 1) await aturanDel.first().delete().catch(() => {});
        const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('ATURAN SERVER')`;

if (code.includes(oldAturanDelete)) {
    code = code.replace(oldAturanDelete, newAturanDelete);
    console.log('[FIX 1] Fixed !updateaturan delete logic - now deletes all bot messages');
} else {
    console.log('[WARN 1] !updateaturan delete block not found in expected format');
}

// ===========================================================
// FIX 2: Buka Tiket - add deferReply() to prevent "interaction failed"
// Discord requires a response within 3 seconds.
// Creating a channel takes too long without defer.
// ===========================================================
const oldBukaTiket = `    if (customId === 'buka_tiket') {
        const existing = guild.channels.cache.find(c => c.name === 'tiket-' + interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (existing) return interaction.reply({ content: 'Kamu sudah punya tiket di ' + existing.toString(), flags: 64 });
        try {
            const adminRole = guild.roles.cache.find(r => r.name === 'Admin') || guild.roles.cache.find(r => r.permissions.has(PermissionsBitField.Flags.Administrator));
            const tCh = await guild.channels.create({`;

const newBukaTiket = `    if (customId === 'buka_tiket') {
        // Defer immediately to prevent "interaction failed" (Discord needs reply within 3s)
        await interaction.deferReply({ flags: 64 });
        const existing = guild.channels.cache.find(c => c.name === 'tiket-' + interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (existing) {
            await interaction.editReply({ content: 'Kamu sudah punya tiket di ' + existing.toString() });
            return;
        }
        try {
            const adminRole = guild.roles.cache.find(r => r.name === 'Admin') || guild.roles.cache.find(r => r.permissions.has(PermissionsBitField.Flags.Administrator));
            const tCh = await guild.channels.create({`;

if (code.includes(oldBukaTiket)) {
    code = code.replace(oldBukaTiket, newBukaTiket);
    // Also update the final reply inside the try block
    code = code.replace(
        "return interaction.reply({ content: 'Tiket dibuat di ' + tCh.toString(), flags: 64 });",
        "await interaction.editReply({ content: 'Tiket dibuat di ' + tCh.toString() }); return;"
    );
    // And the catch block
    code = code.replace(
        "} catch (e) { return interaction.reply({ content: 'Gagal buat tiket: ' + e.message, flags: 64 }); }",
        "} catch (e) { await interaction.editReply({ content: 'Gagal buat tiket: ' + e.message }); }"
    );
    console.log('[FIX 2] Added deferReply to buka_tiket handler - prevents interaction failed');
} else {
    console.log('[WARN 2] buka_tiket block not found in expected format');
}

// ===========================================================
// FIX 3: Also apply same fix to !updatepanduan delete logic
// ===========================================================
const oldPanduanDelete = `        const panduanFetched = await ch.messages.fetch({ limit: 20 });
        const panduanDel = panduanFetched.filter(m => m.author.id === client.user.id);
        if (panduanDel.size > 1) await ch.bulkDelete(panduanDel).catch(() => {});
        else if (panduanDel.size === 1) await panduanDel.first().delete().catch(() => {});`;

const newPanduanDelete = `        const panduanFetched = await ch.messages.fetch({ limit: 50 });
        const panduanDel = panduanFetched.filter(m => m.author.id === client.user.id);
        if (panduanDel.size > 1) await ch.bulkDelete(panduanDel).catch(async () => {
            for (const [, m] of panduanDel) await m.delete().catch(() => {});
        });
        else if (panduanDel.size === 1) await panduanDel.first().delete().catch(() => {});`;

code = code.replace(oldPanduanDelete, newPanduanDelete);
console.log('[FIX 3] Enhanced panduan delete to handle messages > 14 days old');

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('\nAll fixes applied!');
