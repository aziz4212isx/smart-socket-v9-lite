const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const oldVoice = `if (oldState.channel && tempChannels.has(oldState.channel.id)) {
        if (oldState.channel.members.size === 0) {
            await oldState.channel.delete('Temporary channel kosong').catch(() => {});
            tempChannels.delete(oldState.channel.id);
            saveTempChannels();
        }
    }`;
const newVoice = `if (oldState.channelId && tempChannels.has(oldState.channelId)) {
        const ch = oldState.channel;
        if (ch && ch.members.size === 0) {
            await ch.delete('Temporary channel kosong').catch(() => {});
            tempChannels.delete(oldState.channelId);
            saveTempChannels();
        }
    }`;
code = code.replace(oldVoice, newVoice);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Fixed voice state update bug');
