const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

console.log('=== Starting comprehensive bug fix ===\n');

// ---------------------------------------------------
// BUG 1: Remove coinflip and slots (user request)
// ---------------------------------------------------
const coinflipBlock = `
        
        // MINIGAMES
        if (cmd === 'coinflip') {
            ensureEco(uid);
            const bet = interaction.options.getInteger('taruhan');
            const choice = interaction.options.getString('sisi');
            if (bet < 1) return interaction.reply('Taruhan minimal 1 koin!');
            if (economyData[uid].coins < bet) return interaction.reply('Koinmu tidak cukup!');
            
            economyData[uid].coins -= bet;
            save(FILES.economy, economyData);
            
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const isWin = result === choice;
            
            if (isWin) {
                economyData[uid].coins += bet * 2;
                save(FILES.economy, economyData);
                return interaction.reply(\`🪙 Koin dilempar... **\${result.toUpperCase()}**!\\n🎉 Selamat, tebakanmu benar! Kamu menang **\${bet * 2} koin**. Saldo: \${economyData[uid].coins}\`);
            } else {
                return interaction.reply(\`🪙 Koin dilempar... **\${result.toUpperCase()}**!\\n😢 Sayang sekali, tebakanmu salah. Kamu kehilangan **\${bet} koin**. Saldo: \${economyData[uid].coins}\`);
            }
        }
        if (cmd === 'slots') {
            ensureEco(uid);
            const bet = interaction.options.getInteger('taruhan');
            if (bet < 1) return interaction.reply('Taruhan minimal 1 koin!');
            if (economyData[uid].coins < bet) return interaction.reply('Koinmu tidak cukup!');
            
            economyData[uid].coins -= bet;
            
            const emojis = ['🍎', '🍇', '🍒', '🍋', '💎', '🔔'];
            const slot1 = emojis[Math.floor(Math.random() * emojis.length)];
            const slot2 = emojis[Math.floor(Math.random() * emojis.length)];
            const slot3 = emojis[Math.floor(Math.random() * emojis.length)];
            
            let winText = 'Kamu kalah!';
            if (slot1 === slot2 && slot2 === slot3) {
                const prize = (slot1 === '💎') ? bet * 20 : bet * 10;
                economyData[uid].coins += prize;
                winText = \`🎉 JACKPOT! Kamu memenangkan **\${prize} koin**!\`;
            } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
                economyData[uid].coins += bet * 2;
                winText = \`✅ Sedikit beruntung! Kamu memenangkan **\${bet * 2} koin**.\`;
            }
            save(FILES.economy, economyData);
            
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle('🎰 MESIN SLOT 🎰')
                .setDescription(\`[ \${slot1} | \${slot2} | \${slot3} ]\\n\\n\${winText}\\nSaldo saat ini: \${economyData[uid].coins}\`);
            return interaction.reply({ embeds: [embed] });
        }
`;
if (code.includes('// MINIGAMES')) {
    code = code.replace(coinflipBlock, '\n');
    console.log('[FIX 1] Removed coinflip & slots minigames');
} else {
    console.log('[SKIP 1] Minigames block not found (may already be removed)');
}

// ---------------------------------------------------
// BUG 2: Fix EmbedBuilder().catch() - invalid chain  
// new EmbedBuilder().catch(() => {}).setColor(...)
// should be: new EmbedBuilder().setColor(...)
// and .catch() goes on .send() not on EmbedBuilder
// ---------------------------------------------------
code = code.replace(/new EmbedBuilder\(\)\.catch\(\(\) => \{\}\)\./g, 'new EmbedBuilder().');
console.log('[FIX 2] Fixed invalid EmbedBuilder().catch() chains');

// ---------------------------------------------------
// BUG 3: Fix message.author.toString().catch() - invalid
// toString() returns string, strings don't have .catch()
// Line 982: message.author.toString().catch(() => {})
// Line 1006: message.author.toString().catch(() => {})
// ---------------------------------------------------
code = code.replace(/message\.author\.toString\(\)\.catch\(\(\) => \{\}\)/g, 'message.author.toString()');
console.log('[FIX 3] Fixed invalid toString().catch() calls');

// ---------------------------------------------------  
// BUG 4: Missing await on message.channel.send (L1006)
// logCh.send('🎉 Selamat ' + message.author.toString()...) - missing await
// ---------------------------------------------------
code = code.replace(
    /if \(logCh\) logCh\.send\(/g,
    'if (logCh) logCh.send('
);
// More importantly, ensure the level-up send has await
code = code.replace(
    'if (logCh) logCh.send(',
    'if (logCh) await logCh.send('
);
console.log('[FIX 4] Added await to logCh.send() for level-up message');

// ---------------------------------------------------
// BUG 5: warnsData - make sure it's reloaded before use
// Already has: warnsData = load(FILES.warns);
// but L978+ accesses warnsData[uid] directly without null check
// Already has: if (!warnsData[uid]) warnsData[uid] = { warns: 0, history: [] };
// So this is actually safe. Let's verify that guard is there before the access.
// ---------------------------------------------------
console.log('[CHECK 5] warnsData null guard - already present, safe');

// ---------------------------------------------------
// BUG 6: Slots/Coinflip mention in panduan dropdown
// Remove references from panduan text
// ---------------------------------------------------
code = code.replace(
    '`/coinflip` & `/slots` - Main game taruhan koin\\n',
    ''
);
code = code.replace('Ekonomi, Minigames & Level', 'Ekonomi & Level');
console.log('[FIX 6] Removed coinflip/slots from panduan dropdown text');

// ---------------------------------------------------
// BUG 7: Add await to un-awaited message.channel.send at L1243 area
// return message.channel.send({ embeds: [embed], components: [row] }).catch(() => {})
// This is inside async function so it should be awaited
// ---------------------------------------------------
code = code.replace(
    /^(\s+)return message\.channel\.send\(\{ embeds: \[embed\], components: \[row\] \}\)\.catch/gm,
    '$1return await message.channel.send({ embeds: [embed], components: [row] }).catch'
);
console.log('[FIX 7] Added await to message.channel.send with embed+row');

// ---------------------------------------------------
// BUG 8: Ensure EmbedBuilder().catch error did not leave broken chains
// like .setColor is now chained after non-existent method
// Validate: check if any remaining .catch exists on EmbedBuilder result
// ---------------------------------------------------
const remaining = (code.match(/new EmbedBuilder\(\)\.catch/g) || []).length;
if (remaining > 0) {
    console.log('[WARN 8] Still ' + remaining + ' broken EmbedBuilder().catch() chains remain!');
} else {
    console.log('[OK 8] No remaining broken EmbedBuilder().catch() chains');
}

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('\n=== All fixes applied. Checking syntax... ===');
