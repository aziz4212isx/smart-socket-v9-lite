const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/register_commands.js', 'utf8');

const newCmd = `    new SlashCommandBuilder()
        .setName('kelolarole')
        .setDescription('Kelola daftar tombol role (Admin Only)')
        .addSubcommand(sub => sub
            .setName('tambah')
            .setDescription('Tambah tombol role baru')
            .addStringOption(opt => opt.setName('nama').setDescription('Nama role (contoh: Anime)').setRequired(true))
            .addStringOption(opt => opt.setName('emoji').setDescription('Emoji role (contoh: 🎌)').setRequired(true))
            .addStringOption(opt => opt.setName('warna').setDescription('Warna tombol (Primary/Success/Danger/Secondary)').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('hapus')
            .setDescription('Hapus tombol role')
            .addStringOption(opt => opt.setName('nama').setDescription('Nama role yang akan dihapus').setRequired(true))
        ),
`;

if (!code.includes("setName('kelolarole')")) {
    code = code.replace(
        "new SlashCommandBuilder()\n        .setName('afk')",
        newCmd + "    new SlashCommandBuilder()\n        .setName('afk')"
    );
    fs.writeFileSync('D:/discord_bot/register_commands.js', code, 'utf8');
    console.log('Added kelolarole to register_commands.js');
} else {
    console.log('kelolarole already exists');
}
