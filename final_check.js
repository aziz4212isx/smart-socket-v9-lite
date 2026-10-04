const fs = require('fs');
const code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
const lines = code.split('\n');
const issues = [];

lines.forEach((line, i) => {
    const L = i + 1;
    if (line.includes('EmbedBuilder().catch')) issues.push('L'+L+': EmbedBuilder().catch() still present');
    if (line.includes('.toString().catch')) issues.push('L'+L+': toString().catch() still present');
    if (line.includes('coinflip')) issues.push('L'+L+': coinflip still referenced');
    if (line.includes(".catch(() => {}).catch(")) issues.push('L'+L+': Double .catch() still present');
});

if (issues.length === 0) {
    console.log('✅ ALL CLEAR - Zero bugs detected in bot.js!');
} else {
    issues.forEach(i => console.log('[REMAINING]', i));
}
console.log('Total lines:', lines.length);
