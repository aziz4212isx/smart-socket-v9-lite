const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Fix updateNickname
const newUpdateNickname = `async function updateNickname(member, roleName) {
    if (!member || !member.manageable) return; 
    const roles = loadRoles();
    let prefix = '';
    const staticMap = { 'VIP': '👑 VIP', 'Admin': '🛡️ Admin' };
    if (staticMap[roleName]) { prefix = staticMap[roleName]; }
    else {
        const dynamicRole = roles.find(r => r.name === roleName);
        if (dynamicRole) prefix = dynamicRole.emoji + ' ' + (dynamicRole.name.split(' ')[0]);
    }
    if (!prefix) return;
    let baseName = member.nickname || member.user.username;
    if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
    // Bersihkan semua bracket prefix sisa yang lama
    baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();
    // Bersihkan emoji sisa
    baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();
    await member.setNickname(prefix + ' | ' + baseName).catch(() => {});
}`;

// Replacing the old updateNickname function using regex
code = code.replace(/async function updateNickname\([\s\S]*?catch\(\(\) => \{\}\);\s*\}/, newUpdateNickname);


// 2. Fix exclusive role logic in interactionCreate
// Right now the code is:
/*
        if (member.roles.cache.has(role.id)) {
...
        } else {
            await member.roles.add(role).catch(() => {});
            await updateNickname(member, roleName);
            return interaction.reply({ content: 'Role **' + role.name + '** diberikan! ✅', flags: 64 });
        }
*/
const oldRoleLogic = `} else {
            await member.roles.add(role).catch(() => {});
            await updateNickname(member, roleName);
            return interaction.reply({ content: 'Role **' + role.name + '** diberikan! ✅', flags: 64 });
        }`;

const newRoleLogic = `} else {
            // Hapus role dinamis lainnya jika ada (Mutual Exclusivity)
            for (const r of roles) {
                if (r.id === customId) continue;
                const otherRole = guild.roles.cache.find(gx => gx.name === r.name);
                if (otherRole && member.roles.cache.has(otherRole.id)) {
                    await member.roles.remove(otherRole).catch(() => {});
                }
            }
            await member.roles.add(role).catch(() => {});
            await updateNickname(member, roleName);
            return interaction.reply({ content: 'Role **' + role.name + '** diberikan! ✅', flags: 64 });
        }`;

code = code.replace(oldRoleLogic, newRoleLogic);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Script updated successfully');
