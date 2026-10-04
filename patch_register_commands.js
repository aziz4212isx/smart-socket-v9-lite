const fs = require('fs');

const correctRegisterCommandsCode = `require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('kelolarole')
        .setDescription('Kelola daftar tombol role (Admin Only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
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
        )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('Mendaftarkan slash commands...');
        const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Berhasil mendaftarkan ' + data.length + ' slash commands secara global!');
    } catch (e) { console.error(e); }
})();
`;

fs.writeFileSync('D:/discord_bot/register_commands.js', correctRegisterCommandsCode, 'utf8');
console.log('register_commands.js overwritten to only contain kelolarole.');
