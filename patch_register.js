const fs = require('fs');
let f = fs.readFileSync('D:/discord_bot/register_commands.js', 'utf8');
const cmd = "    new SlashCommandBuilder()\r\n        .setName('clearrole')\r\n        .setDescription('Hapus semua role pilihan dan bersihkan prefix nickname'),\r\n";
f = f.replace('const commands = [', 'const commands = [\n' + cmd);
fs.writeFileSync('D:/discord_bot/register_commands.js', f, 'utf8');
console.log('Added /clearrole to register_commands.js');
