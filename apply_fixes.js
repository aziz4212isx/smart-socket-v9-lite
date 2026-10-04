const fs = require('fs');

function applyFixes() {
    let botJs = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
    let aiMemory = fs.readFileSync('D:/discord_bot/ai_memory.js', 'utf8');

    // 1. Import StringSelectMenuBuilder
    if (!botJs.includes('StringSelectMenuBuilder')) {
        botJs = botJs.replace(/const {([^}]+)} = require\('discord.js'\);/, "const {$1, StringSelectMenuBuilder } = require('discord.js');");
    }

    // 2. Declare aiCooldown
    if (!botJs.includes('const aiCooldown = new Map();')) {
        botJs = botJs.replace(/const spamTracker\s*=\s*new Map\(\);/, "const spamTracker   = new Map();\nconst aiCooldown    = new Map();");
    }

    // 7. Map cleanup interval
    if (!botJs.includes('3600000')) {
        const cleanupCode = `\nsetInterval(() => {
    const now = Date.now();
    for (const [k, v] of xpCooldown) if (now - v > 3600000) xpCooldown.delete(k);
    for (const [k, v] of coinCooldown) if (now - v > 3600000) coinCooldown.delete(k);
    for (const [k, v] of aiCooldown) if (now - v > 3600000) aiCooldown.delete(k);
    for (const [k, v] of spamTracker) {
        if (v && v.length > 0 && (now - v[v.length - 1].time > 3600000)) {
            spamTracker.delete(k);
        }
    }
}, 3600000);\n`;
        botJs = botJs.replace(/const LEVEL_ROLES\s*=\s*\{/, cleanupCode + "\nconst LEVEL_ROLES   = {");
    }

    // 3. Implement endGiveaway()
    if (!botJs.includes('async function endGiveaway')) {
        const funcCode = `async function endGiveaway(msgId) {
    let gData = load(FILES.giveaway);
    const gw = gData[msgId];
    if (!gw) return;
    let winner = null;
    if (gw.participants.length > 0) winner = gw.participants[Math.floor(Math.random() * gw.participants.length)];
    const channel = client.channels.cache.get(gw.channelId);
    if (channel) {
        if (winner) {
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('🎉 Giveaway Berakhir!').setDescription(\`Pemenang: <@\${winner}>\\nHadiah: **\${gw.prize}**\`);
            channel.send({ content: \`Selamat <@\${winner}>!\`, embeds: [embed] }).catch(() => {});
        } else {
            channel.send(\`Giveaway **\${gw.prize}** berakhir, tapi tidak ada peserta.\`).catch(() => {});
        }
        try {
            const msg = await channel.messages.fetch(msgId).catch(() => null);
            if (msg) {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('gw_enter_done').setLabel('Giveaway Berakhir').setStyle(ButtonStyle.Secondary).setEmoji('🎉').setDisabled(true)
                );
                await msg.edit({ components: [disabledRow] }).catch(() => {});
            }
        } catch (e) {}
    }
    delete gData[msgId];
    save(FILES.giveaway, gData);
}
`;
        botJs = botJs.replace(/const BOT_COMMANDS = \['!halo'/, funcCode + "\nconst BOT_COMMANDS = ['!halo'");
    }

    // 4. Remove dead role handler
    const deadCodeRegex = /\}if \(customId\.startsWith\('role_'\)\) \{[\s\S]*?updateNickname\(member, roleName\);\s*return interaction\.reply\(\{ content: 'Role \*\*' \+ roleName \+ '\*\* diberikan!', flags: 64 \}\);\s*\}\s*\}/;
    botJs = botJs.replace(deadCodeRegex, '}');

    // 5. Fix updateStats channel names
    botJs = botJs.replace(/c\.name\.startsWith\('Members: '\)/g, "c.name.startsWith('📊 Member: ')");
    botJs = botJs.replace(/name === 'SERVER STATS'/g, "name === 'INFORMASI'");
    botJs = botJs.replace(/name: 'Members: ' \+ memCount/g, "name: '📊 Member: ' + memCount");
    botJs = botJs.replace(/setName\('Members: ' \+ memCount\)/g, "setName('📊 Member: ' + memCount)");

    botJs = botJs.replace(/c\.name\.startsWith\('Bots: '\)/g, "c.name.startsWith('🤖 Bot: ')");
    botJs = botJs.replace(/name: 'Bots: ' \+ botCount/g, "name: '🤖 Bot: ' + botCount");
    botJs = botJs.replace(/setName\('Bots: ' \+ botCount\)/g, "setName('🤖 Bot: ' + botCount)");

    // 6. Fix !info duplicate thumbnail
    botJs = botJs.replace(/\.setThumbnail\(target\.displayAvatarURL\(\{ dynamic: true, size: 512 \}\)\)\s*\.setThumbnail\(target\.user\.displayAvatarURL\(\{ dynamic: true \}\)\)/, ".setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))");

    // 10. Add month validation to !settanggallahir
    if (!botJs.includes('const daysInMonth')) {
        const oldValidation = `if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1]) || p[0]<1||p[0]>31||p[1]<1||p[1]>12)
              return message.reply('Format salah! Gunakan **!settanggallahir DD-MM** (contoh: 25-12).');`;
        const newValidation = `if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1]) || p[0]<1||p[0]>31||p[1]<1||p[1]>12)
              return message.reply('Format salah! Gunakan **!settanggallahir DD-MM** (contoh: 25-12).');
          const d = parseInt(p[0]); const m = parseInt(p[1]);
          const daysInMonth = new Date(2024, m, 0).getDate();
          if (d > daysInMonth) return message.reply('Tanggal tidak valid untuk bulan tersebut!');`;
        botJs = botJs.replace(oldValidation, newValidation);
    }

    // 8. Update OpenRouter model in ai_memory.js
    aiMemory = aiMemory.replace(/'google\/gemma-4-26b-a4b-it:free'/g, "'openrouter/free'");
    aiMemory = aiMemory.replace(/'meta-llama\/llama-3\.1-8b-instruct:free'/g, "'openrouter/free'");

    fs.writeFileSync('D:/discord_bot/bot.js', botJs, 'utf8');
    fs.writeFileSync('D:/discord_bot/ai_memory.js', aiMemory, 'utf8');
    console.log("Fixes applied successfully.");
}

applyFixes();
