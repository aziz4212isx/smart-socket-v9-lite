const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Add to BOT_COMMANDS
code = code.replace(
    "const BOT_COMMANDS = ['!halo','!ping','!speedtest','!invitebots','!setup','!cleanup','!updatepanduan','!updateaturan','!setuptiket','!tutuptiket','!setuproles','!rank','!info','!settanggallahir','!vc','!warn','!warns','!clearwarn','!saldo','!daily','!transfer','!leaderboard','!shop','!beli','!giveaway','!endgiveaway','!poll','!endpoll','!afk','!clearrole'];",
    "const BOT_COMMANDS = ['!halo','!ping','!speedtest','!invitebots','!setup','!cleanup','!updatepanduan','!updateaturan','!setuptiket','!tutuptiket','!setuproles','!rank','!info','!settanggallahir','!vc','!warn','!warns','!clearwarn','!saldo','!daily','!transfer','!leaderboard','!shop','!beli','!giveaway','!endgiveaway','!poll','!endpoll','!afk','!clearrole','!resetsemuarole'];"
);

// 2. Insert !resetsemuarole just before !speedtest
const newCommand = `    // ── !resetsemuarole ──
    if (msg.startsWith('!resetsemuarole')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');
        if (msg !== '!resetsemuarole konfirmasi') {
            return message.reply('⚠️ Ini akan menghapus SEMUA role terkelola dari SEMUA member di server (tidak bisa dibatalkan). Ketik \`!resetsemuarole konfirmasi\` untuk melanjutkan.');
        }
        
        const replyMsg = await message.reply('⏳ Memulai reset role untuk semua member, mohon tunggu...');
        
        const roles = loadRoles();
        const managed = roles.map(r => r.name);
        managed.push('VIP', 'Admin');
        
        let count = 0;
        const delay = ms => new Promise(res => setTimeout(res, ms));
        
        try {
            const members = await message.guild.members.fetch();
            for (const [memberId, member] of members) {
                const rolesToRemove = member.roles.cache.filter(r => managed.includes(r.name));
                if (rolesToRemove.size > 0) {
                    await member.roles.remove(rolesToRemove).catch(() => {});
                    
                    if (member.manageable) {
                        let baseName = member.nickname || member.user.username;
                        if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
                        baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();
                        if (member.nickname !== baseName) {
                            await member.setNickname(baseName).catch(() => {});
                        }
                    }
                    count++;
                    await delay(300);
                }
            }
            await replyMsg.edit('✅ Selesai! Role terkelola telah dihapus dari ' + count + ' member.');
        } catch (err) {
            console.error(err);
            await replyMsg.edit('❌ Terjadi kesalahan saat memproses reset.');
        }
        return;
    }

    // ── !speedtest ──`;

code = code.replace("    // ── !speedtest ──", newCommand);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('OK: Applied resetsemuarole patches.');
