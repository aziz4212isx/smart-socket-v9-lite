const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');

const tanyaStart = lines.findIndex(l => l.includes('const apis = [') && lines[l-1] && lines[l-1].includes('aiCooldown.set(uid, Date.now());'));
const tanyaEnd = lines.findIndex((l, i) => i > tanyaStart && l.includes('if (!respText) return interaction.editReply('));

if (tanyaStart !== -1 && tanyaEnd !== -1) {
    const newTanyaLines = [
        "                const memoryId = interaction.channel?.type === ChannelType.GuildVoice || tempChannels.has(interaction.channelId)",
        "                    ? 'room_' + interaction.channelId",
        "                    : 'user_' + uid;",
        "                let respText;",
        "                try {",
        "                    respText = await callAIWithMemory(prompt, memoryId, process.env);",
        "                } catch (e) {",
        "                    return interaction.editReply('Maaf, AI gagal merespon: ' + e.message);",
        "                }"
    ];
    lines.splice(tanyaStart, tanyaEnd - tanyaStart + 1, ...newTanyaLines);
    console.log('[OK] Replaced /tanya API block.');
} else {
    console.log('[FAIL] Could not find /tanya block. Start:', tanyaStart, 'End:', tanyaEnd);
}

const msgStart = lines.findIndex(l => l.includes('// Sistem Fallback AI'));
const msgEnd = lines.findIndex((l, i) => i > msgStart && l.includes('return message.reply(\'Maaf, semua sistem AI sedang limit atau gangguan. Coba beberapa saat lagi.\');'));

if (msgStart !== -1 && msgEnd !== -1) {
    // msgEnd includes the line `return message.reply(...)`, but wait, is there a closing brace?
    // Let's replace up to `if (!respText) {` closing brace.
    const newMsgLines = [
        "            const memoryId = message.channel?.type === ChannelType.GuildVoice || tempChannels.has(message.channelId)",
        "                ? 'room_' + message.channelId",
        "                : 'user_' + uid;",
        "            let respText;",
        "            try {",
        "                respText = await callAIWithMemory(prompt, memoryId, process.env);",
        "            } catch (e) {",
        "                return message.reply('Maaf, AI gagal merespon: ' + e.message);",
        "            }"
    ];
    // Find the closing brace of `if (!respText) {`
    let actualMsgEnd = msgEnd + 1; // Includes `}`
    lines.splice(msgStart, actualMsgEnd - msgStart + 1, ...newMsgLines);
    console.log('[OK] Replaced @Asisten AI API block.');
} else {
    console.log('[FAIL] Could not find message API block. Start:', msgStart, 'End:', msgEnd);
}

fs.writeFileSync('D:/discord_bot/bot.js', lines.join('\n'), 'utf8');
