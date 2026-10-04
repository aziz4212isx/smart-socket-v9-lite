const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
// Hapus GuildPresences intent yang menyebabkan error
code = code.replace('        GatewayIntentBits.GuildPresences,\n', '');
// Ubah fungsi updateStats agar tidak pakai presence
code = code.replace(
    'const online  = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== \'offline\').size;',
    'const online  = guild.members.cache.filter(m => !m.user.bot).size; // approximate'
);
fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('GuildPresences intent dihapus, bot siap dijalankan!');
