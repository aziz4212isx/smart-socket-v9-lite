const fs = require('fs');

const helperFunc = `
// ════════════════════════════════════════
// HELPER: AUTO NICKNAME
// ════════════════════════════════════════
async function updateNickname(member, roleName) {
    if (!member || !member.manageable) return; // Skip jika bot tidak punya akses (misal Owner)
    const map = {
        'Gamer': '🎮 Gamer',
        'Pecinta Musik': '🎵 Musik',
        'Kreator': '🎨 Kreator',
        'Pelajar': '📚 Pelajar',
        'Kompetitif': '⚔️ Kompetitif',
        'VIP': '💎 VIP',
        'Donator': '💖 Donator',
        'Veteran': '🎖️ Veteran',
        'Elite': '🏅 Elite',
        'Legend': '🏆 Legend'
    };
    const prefix = map[roleName];
    if (!prefix) return;
    
    let currentName = member.nickname || member.user.globalName || member.user.username;
    // Hapus prefix lama jika ada
    currentName = currentName.replace(/^\\[.*?\\]\\s*/, '');
    
    // Set nickname baru
    const newName = \`[\${prefix}] \${currentName}\`;
    if (newName.length <= 32) {
        await member.setNickname(newName).catch(() => {});
    }
}
`;

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Insert helper func around line 70, before first usage
const insertPoint = "function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }";
if (code.includes(insertPoint)) {
    code = code.replace(insertPoint, insertPoint + '\n' + helperFunc);
} else {
    console.log("Could not find insert point for helper function!");
}

// 1. Level up message & rank roles
const lvlOld = "message.channel.send('🎉 Selamat ' + message.author.toString() + '! Naik ke **Level ' + newLv + '**!').catch(() => {});";
const lvlNew = `const logCh = message.guild.channels.cache.find(c => c.name === 'log-server');
            if (logCh) logCh.send('🎉 Selamat ' + message.author.toString() + '! Naik ke **Level ' + newLv + '**!').catch(() => {});
            else message.channel.send('🎉 Selamat ' + message.author.toString() + '! Naik ke **Level ' + newLv + '**!').catch(() => {});`;
code = code.replace(lvlOld, lvlNew);

// 2. Add updateNickname calls for level up
const rankVeteran = "if (role) message.member.roles.add(role).catch(() => {});";
// wait, replace all of `if (role) message.member.roles.add(role).catch(() => {});`
// in the XP code there is: 
// if (rR) { const role = message.guild.roles.cache.find(r => r.name === rR); if (role) message.member.roles.add(role).catch(() => {}); }
const xpRoleOld = "if (rR) { const role = message.guild.roles.cache.find(r => r.name === rR); if (role) message.member.roles.add(role).catch(() => {}); }";
const xpRoleNew = "if (rR) { const role = message.guild.roles.cache.find(r => r.name === rR); if (role) { message.member.roles.add(role).catch(() => {}); updateNickname(message.member, rR); } }";
code = code.replace(xpRoleOld, xpRoleNew);

// 3. Shop roles in slash command 'beli'
// wait, the slash command beli is in interactionCreate.
// 'await member.roles.add(role).catch(() => {});'
// I'll replace it to include updateNickname.
const buyOld = "await member.roles.add(role).catch(() => {});\n            return interaction.reply('✅ Berhasil membeli role **' + roleName + '**!');";
const buyNew = "await member.roles.add(role).catch(() => {});\n            updateNickname(member, roleName);\n            return interaction.reply('✅ Berhasil membeli role **' + roleName + '**!');";
code = code.replace(buyOld, buyNew);

// 4. Pilih Role button interactions
// In reaction roles: `await member.roles.add(role).catch(() => {});` inside `if (customId.startsWith('role_'))`
const rrOld = "await member.roles.add(role).catch(() => {});\n            return interaction.reply({ content: 'Role **' + roleName + '** diberikan!', ephemeral: true });";
const rrNew = "await member.roles.add(role).catch(() => {});\n            updateNickname(member, roleName);\n            return interaction.reply({ content: 'Role **' + roleName + '** diberikan!', ephemeral: true });";
code = code.replace(rrOld, rrNew);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Script updated successfully');
