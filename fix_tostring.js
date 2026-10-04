const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Fix all remaining .toString().catch(() => {}) - strings don't have .catch()
// L243: winner.toString().catch(() => {})
// L301: member.toString().catch(() => {})
// L737: interaction.user.toString().catch(() => {})

// Global replace - any .toString().catch(() => {}) should just be .toString()
code = code.replace(/\.toString\(\)\.catch\(\(\) => \{\}\)/g, '.toString()');

// Now also remove coinflip and slots from the register_commands.js
let reg = fs.readFileSync('D:/discord_bot/register_commands.js', 'utf8');
if (reg.includes('coinflip')) {
    // Remove coinflip and slots command definitions
    reg = reg.replace(/,\s*\{\s*name:\s*'coinflip'[\s\S]*?name:\s*'slots'[\s\S]*?\}\s*\}/m, '');
    // Clean up any trailing comma issues
    reg = reg.replace(/,(\s*)\]/g, '$1]');
    fs.writeFileSync('D:/discord_bot/register_commands.js', reg, 'utf8');
    console.log('[FIX] Removed coinflip & slots from register_commands.js');
}

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('[FIX] Fixed all remaining .toString().catch() chains');
