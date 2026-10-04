const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// BUG 1
const mkVoRegex = /const mkVo = async \(name, parentId\) => \{[\s\S]*?catch\(\(\) => \{\}\);\s*\n\s*\};/;
const mkVoStatStr = `            const mkVoStat = async (prefix, initialName, parentId) => {
                let c = guild2.channels.cache.find(x => x.name.startsWith(prefix) && x.parentId === parentId);
                if (!c) c = await guild2.channels.create({ name: initialName, type: ChannelType.GuildVoice, parent: parentId }).catch(() => null);
                return c;
            };`;
code = code.replace(mkVoRegex, match => match + '\n' + mkVoStatStr);

code = code.replace(
    "await mkVo('📊 Member: 0',  infoCat.id);",
    "await mkVoStat('📊 Member: ', '📊 Member: 0', infoCat.id);"
);
code = code.replace(
    "await mkVo('🟢 Online: 0',  infoCat.id);",
    "await mkVoStat('🟢 Online: ', '🟢 Online: 0', infoCat.id);"
);
code = code.replace(
    "await mkVo('🤖 Bot: 0',     infoCat.id);",
    "await mkVoStat('🤖 Bot: ',    '🤖 Bot: 0',    infoCat.id);"
);

// BUG 2
const oldGeneral = "await mkCh('💬-general',    chatCat.id);";
const newGeneral = `let generalCh = guild2.channels.cache.find(c => (c.name === '💬-general' || c.name === 'general') && c.type === ChannelType.GuildText && c.parentId === chatCat.id);
            if (!generalCh) {
                const anyGeneral = guild2.channels.cache.find(c => (c.name === '💬-general' || c.name === 'general') && c.type === ChannelType.GuildText);
                if (anyGeneral) {
                    await anyGeneral.setParent(chatCat.id).catch(() => {});
                    if (anyGeneral.name === 'general') await anyGeneral.setName('💬-general').catch(() => {});
                } else await mkCh('💬-general', chatCat.id);
            }`;

code = code.replace(oldGeneral, newGeneral);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('OK: Applied bug fixes for !setup.');
