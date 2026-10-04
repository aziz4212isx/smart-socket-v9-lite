const fs = require('fs');
let bot = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const slashTarget = "    else if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {";
const slashInject = `    else if (interaction.isChatInputCommand() && interaction.commandName === 'clearrole') {
        await interaction.deferReply({ flags: 64 });
        const roles = loadRoles();
        const managed = roles.map(r => r.name);
        managed.push('VIP', 'Admin');
        
        const rolesToRemove = interaction.member.roles.cache.filter(r => managed.includes(r.name));
        if (rolesToRemove.size > 0) await interaction.member.roles.remove(rolesToRemove).catch(()=>{});
        
        if (interaction.member.manageable) {
            let baseName = interaction.member.nickname || interaction.user.username;
            if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
            let oldName = '';
            while (oldName !== baseName) {
                oldName = baseName;
                baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();
                baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();
            }
            await interaction.member.setNickname(baseName).catch(()=>{});
        }
        return interaction.editReply('✅ Semua role pilihan dan prefix nickname telah dibersihkan!');
    }
`;

if (bot.includes(slashTarget)) {
    bot = bot.replace(slashTarget, slashInject + slashTarget);
    console.log('Slash command injected!');
} else {
    console.log('Slash target NOT FOUND!');
}

const prefixTarget = "    // ── !speedtest ──";
const prefixInject = `    // ── !clearrole ──
    if (msg === '!clearrole' || msg === '!clearroles') {
        const roles = loadRoles();
        const managed = roles.map(r => r.name);
        managed.push('VIP', 'Admin');
        
        const rolesToRemove = message.member.roles.cache.filter(r => managed.includes(r.name));
        if (rolesToRemove.size > 0) await message.member.roles.remove(rolesToRemove).catch(()=>{});
        
        if (message.member.manageable) {
            let baseName = message.member.nickname || message.author.username;
            if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
            let oldName = '';
            while (oldName !== baseName) {
                oldName = baseName;
                baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();
                baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();
            }
            await message.member.setNickname(baseName).catch(()=>{});
        }
        return message.reply('✅ Semua role pilihan dan prefix nickname telah dibersihkan!');
    }

`;

if (bot.includes(prefixTarget)) {
    bot = bot.replace(prefixTarget, prefixInject + prefixTarget);
    console.log('Prefix command injected!');
} else {
    console.log('Prefix target NOT FOUND!');
}

const commandsTarget = ",'!afk']";
if (bot.includes(commandsTarget)) {
    bot = bot.replace(commandsTarget, ",'!afk','!clearrole']");
    console.log('Added to BOT_COMMANDS array');
}

fs.writeFileSync('D:/discord_bot/bot.js', bot, 'utf8');
console.log('Saved bot.js');
