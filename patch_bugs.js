const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Patch !cleanup
// Old logic deleted anything not in officialChs.
// We change it to ONLY delete things IN officialChs (so custom channels are safe).
const cleanupOld = `if (!officialChs.includes(c.name)) {
                                await c.delete().catch(() => {});
                                deleted++;
                            }`;
const cleanupNew = `if (officialChs.includes(c.name)) {
                                await c.delete().catch(() => {});
                                deleted++;
                            }`;
code = code.replace(cleanupOld, cleanupNew);
code = code.replace(`if (c.name !== name && !officialChs.includes(c.name))`, `if (officialChs.includes(c.name))`);

// 2. Add .catch(() => {}) to send() missing it
// A quick regex to catch common unhandled .send()
code = code.replace(/logCh\.send\((.*?)\)(?!\.catch)/g, "logCh.send($1).catch(() => {})");
code = code.replace(/genCh\.send\((.*?)\)(?!\.catch)/g, "genCh.send($1).catch(() => {})");
code = code.replace(/interaction\.channel\.send\((.*?)\)(?!\.catch)/g, "interaction.channel.send($1).catch(() => {})");
code = code.replace(/message\.channel\.send\((.*?)\)(?!\.catch)/g, "message.channel.send($1).catch(() => {})");
code = code.replace(/channel\.send\((.*?)\)(?!\.catch)/g, "channel.send($1).catch(() => {})");
code = code.replace(/verifCh\.send\((.*?)\)(?!\.catch)/g, "verifCh.send($1).catch(() => {})");
code = code.replace(/roleCh\.send\((.*?)\)(?!\.catch)/g, "roleCh.send($1).catch(() => {})");

// 3. Update save() to be async
const saveOld = `function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }`;
const saveNew = `function save(file, data) { fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8', () => {}); }`;
code = code.replace(saveOld, saveNew);

// 4. Add delay to AI chunking
const aiLoopOld = `if (isFirst) {
                    await message.reply(chunk).catch(async () => { await message.channel.send(chunk).catch(() => {}); });
                    isFirst = false;
                } else {
                    await message.channel.send(chunk).catch(() => {});
                }`;
const aiLoopNew = `if (isFirst) {
                    await message.reply(chunk).catch(async () => { await message.channel.send(chunk).catch(() => {}); });
                    isFirst = false;
                } else {
                    await new Promise(r => setTimeout(r, 1200));
                    await message.channel.send(chunk).catch(() => {});
                }`;
code = code.replace(aiLoopOld, aiLoopNew);

// Also for slash command /tanya chunking
const aiSlashLoopOld = `if (isFirst) {
                    await interaction.reply(chunk).catch(async () => { await interaction.channel.send(chunk).catch(() => {}); });
                    isFirst = false;
                } else {
                    await interaction.channel.send(chunk).catch(() => {});
                }`;
const aiSlashLoopNew = `if (isFirst) {
                    await interaction.reply(chunk).catch(async () => { await interaction.channel.send(chunk).catch(() => {}); });
                    isFirst = false;
                } else {
                    await new Promise(r => setTimeout(r, 1200));
                    await interaction.channel.send(chunk).catch(() => {});
                }`;
code = code.replace(aiSlashLoopOld, aiSlashLoopNew);

// 5. Fix nickname regex
// Old: currentName.replace(/^\\[.*?\\]\\s*/, '');
// New: currentName.replace(new RegExp('^\\\\\[(' + Object.values(map).join('|') + ')\\\\]\\\\s*'), '');
const nickRegexOld = `currentName = currentName.replace(/^\\\\\\[.*?\\\\\\]\\\\s*/, '');`;
const nickRegexNew = `const knownPrefixes = Object.values(map).join('|');
    currentName = currentName.replace(new RegExp('^\\\\\\\\[(' + knownPrefixes + ')\\\\\\\]\\\\\\\\s*'), '');`;
code = code.replace(nickRegexOld, nickRegexNew);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Applied bug fixes.');
