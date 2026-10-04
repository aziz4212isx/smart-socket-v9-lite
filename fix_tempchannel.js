const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// FIX: saveTempChannels() MUST use synchronous write because:
// 1. The bot is frequently restarted
// 2. async save() may not complete before process exits
// 3. Lost temp channel data = users can't control their VC

// Change saveTempChannels to use writeFileSync (sync) instead of the async save()
const oldSaveTemp = `function saveTempChannels() {
    const obj = {};
    for (const [k, v] of tempChannels) obj[k] = v;
    save('./temp_channels.json', obj);
}`;

const newSaveTemp = `function saveTempChannels() {
    const obj = {};
    for (const [k, v] of tempChannels) obj[k] = v;
    // MUST be synchronous - async write loses data on bot restart
    try { fs.writeFileSync('./temp_channels.json', JSON.stringify(obj, null, 2), 'utf8'); } catch {}
}`;

if (code.includes(oldSaveTemp)) {
    code = code.replace(oldSaveTemp, newSaveTemp);
    console.log('[FIX] saveTempChannels() changed to synchronous (writeFileSync)');
} else {
    console.log('[WARN] saveTempChannels block not found');
}

// Also: the default channel name is "username + s Channel"
// Let's change it to just use the username (cleaner)
const oldChName = "name: member.user.username + 's Channel',";
const newChName = "name: member.user.username + \"'s Channel\",";
// Actually let's keep it but also allow them to recognize it
// The real fix is the sync save above.

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Done.');
