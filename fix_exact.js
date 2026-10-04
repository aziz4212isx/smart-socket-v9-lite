const fs = require('fs');
let lines = fs.readFileSync('D:/discord_bot/bot.js', 'utf8').split('\n');

// 1. Tanya
// We want to replace lines 666 (index 666 is line 667) to 709
// wait, line index 666 corresponds to "const apis = ["
// And index 708 corresponds to "                }"
// So we replace 666 to 709 (44 lines)

const tanyaNew = [
    "                const memoryId = interaction.channel?.type === ChannelType.GuildVoice || tempChannels.has(interaction.channelId)",
    "                    ? 'room_' + interaction.channelId",
    "                    : 'user_' + uid;",
    "                let respText;",
    "                try {",
    "                    respText = await callAIWithMemory(prompt, memoryId, process.env);",
    "                } catch (e) {",
    "                    return interaction.editReply('⏳ Maaf, AI gagal merespon: ' + e.message);",
    "                }"
];
lines.splice(666, 44, ...tanyaNew);

// Since we replaced 44 lines with 9 lines, the indices below will shift by 9 - 44 = -35.
// Old index 1544 corresponds to "const apis = ["
const newMsgIndex = 1544 - 35;
// Old index 1605 is the end of the loop, wait let's find it dynamically since I know what it starts with.

const msgStart = lines.findIndex((l, i) => i > 1000 && l.includes('const apis = ['));
const msgEnd = lines.findIndex((l, i) => i > msgStart && l.includes('if (!respText) {')); // index of `if (!respText) {`
const msgEndActual = msgEnd + 2; // includes `return message.reply(...); }`

const msgNew = [
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
lines.splice(msgStart, msgEndActual - msgStart + 1, ...msgNew);

fs.writeFileSync('D:/discord_bot/bot.js', lines.join('\n'), 'utf8');
console.log('Fixed AI Memory successfully');
