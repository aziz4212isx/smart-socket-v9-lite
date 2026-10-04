const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const checks = [
    { name: 'StringSelectMenuBuilder imported', ok: code.includes('StringSelectMenuBuilder') },
    { name: '!updatepanduan handler (1 copy only)', ok: (code.match(/msg === '!updatepanduan'/g)||[]).length === 1 },
    { name: '!setuproles deletes old messages before send', ok: code.includes('roleChFetched') },
    { name: '!setuptiket deletes old messages before send', ok: code.includes('tiketFetched') },
    { name: '!updatepanduan deletes old messages before send', ok: code.includes('panduanFetched') },
    { name: 'No EmbedBuilder().catch() bugs', ok: !code.includes('EmbedBuilder().catch') },
    { name: 'No toString().catch() bugs', ok: !code.includes('.toString().catch') },
    { name: 'No coinflip/slots commands remain', ok: !code.includes("cmd === 'coinflip'") },
    { name: 'safeInteractionReply helper exists', ok: code.includes('safeInteractionReply') },
    { name: 'No ephemeral: true (deprecated)', ok: !code.includes('ephemeral: true') },
    { name: 'save() is async (writeFile not writeFileSync)', ok: code.includes('fs.writeFile(') && !code.includes('fs.writeFileSync(') },
    { name: 'AI chunking has rate-limit delay (1200ms)', ok: code.includes('setTimeout(r, 1200)') },
    { name: 'Voice state uses channelId (null-safe)', ok: code.includes('oldState.channelId') },
    { name: 'No imgur URL typo (imgurcom)', ok: !code.includes('imgurcom') },
    { name: 'menu_panduan dropdown interaction handler', ok: code.includes("customId === 'menu_panduan'") },
    { name: 'close_ticket uses flags:64 (not ephemeral)', ok: code.includes('flags: 64') },
    { name: 'warnsData null guard present', ok: code.includes("if (!warnsData[uid]) warnsData[uid] = { warns: 0") },
    { name: 'updateNickname only updates manageable members', ok: code.includes("if (!member || !member.manageable) return") },
];

checks.forEach(c => console.log((c.ok ? '✅' : '❌') + ' ' + c.name));
const failed = checks.filter(c => !c.ok);
console.log('\n' + (failed.length === 0 ? '🎉 ALL ' + checks.length + ' CHECKS PASSED!' : '⚠️ ' + failed.length + ' checks failed'));
console.log('Total lines in bot.js:', code.split('\n').length);
