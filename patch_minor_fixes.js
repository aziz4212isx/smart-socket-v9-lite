const fs = require('fs');

// ==== 1 & 3: Patch bot.js ====
let botCode = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Prefix dynamicRole.name instead of split
botCode = botCode.replace(
    "if (dynamicRole) prefix = dynamicRole.emoji + ' ' + (dynamicRole.name.split(' ')[0]);",
    "if (dynamicRole) prefix = dynamicRole.emoji + ' ' + dynamicRole.name;"
);
botCode = botCode.replace(
    "const prefix = roleData.emoji + ' ' + (roleName.split(' ')[0] || roleName);",
    "const prefix = roleData.emoji + ' ' + roleName;"
);

// 3. saveAsync
const saveAsyncDef = `function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }\nfunction saveAsync(file, data) { fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8', (e)=>{if(e)console.error(e)}); }`;
botCode = botCode.replace("function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }", saveAsyncDef);

// Replace save with saveAsync ONLY for the chat activity blocks
// We know they look exactly like:
//         xpData[uid].level = newLv;
//         save(FILES.xp, xpData);
// and
//         economyData[uid].coins += Math.floor(Math.random() * 10) + 5;
//         save(FILES.economy, economyData);
botCode = botCode.replace(
    `        xpData[uid].level = newLv;
        save(FILES.xp, xpData);`,
    `        xpData[uid].level = newLv;
        saveAsync(FILES.xp, xpData);`
);
botCode = botCode.replace(
    `        economyData[uid].coins += Math.floor(Math.random() * 10) + 5;
        save(FILES.economy, economyData);`,
    `        economyData[uid].coins += Math.floor(Math.random() * 10) + 5;
        saveAsync(FILES.economy, economyData);`
);

fs.writeFileSync('D:/discord_bot/bot.js', botCode, 'utf8');


// ==== 2: Patch register_commands.js ====
let regCode = fs.readFileSync('D:/discord_bot/register_commands.js', 'utf8');

regCode = regCode.replace(
    "const { REST, Routes, SlashCommandBuilder } = require('discord.js');",
    "const { REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');"
);

regCode = regCode.replace(
    `        .setName('kelolarole')
        .setDescription('Kelola daftar tombol role (Admin Only)')`,
    `        .setName('kelolarole')
        .setDescription('Kelola daftar tombol role (Admin Only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)`
);

fs.writeFileSync('D:/discord_bot/register_commands.js', regCode, 'utf8');

console.log('OK: all 3 minor patches applied');
