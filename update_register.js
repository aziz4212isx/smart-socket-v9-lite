const fs = require('fs');
const code = [
    "require('dotenv').config();",
    "const { REST, Routes, SlashCommandBuilder } = require('discord.js');",
    "",
    "const commands = [",
    "    new SlashCommandBuilder()",
    "        .setName('vc')",
    "        .setDescription('Kelola channel voice sementara milikmu')",
    "        .addSubcommand(sub => sub.setName('info').setDescription('Lihat info channel aktifmu: nama, status kunci, daftar member'))",
    "        .addSubcommand(sub => sub.setName('lock').setDescription('Kunci channel agar tidak ada yang bisa masuk'))",
    "        .addSubcommand(sub => sub.setName('unlock').setDescription('Buka kembali channel agar semua orang bisa masuk'))",
    "        .addSubcommand(sub => sub.setName('rename').setDescription('Ganti nama channel-mu').addStringOption(opt => opt.setName('nama').setDescription('Nama baru').setRequired(true)))",
    "        .addSubcommand(sub => sub.setName('limit').setDescription('Atur batas member (0=bebas)').addIntegerOption(opt => opt.setName('jumlah').setDescription('0-99').setMinValue(0).setMaxValue(99).setRequired(true)))",
    "        .addSubcommand(sub => sub.setName('kick').setDescription('Keluarkan member dari channel').addUserOption(opt => opt.setName('member').setDescription('Member yang dikeluarkan').setRequired(true)))",
    "        .addSubcommand(sub => sub.setName('transfer').setDescription('Transfer kepemilikan ke member lain').addUserOption(opt => opt.setName('member').setDescription('Pemilik baru').setRequired(true)))",
    "        .addSubcommand(sub => sub.setName('help').setDescription('Tampilkan semua command /vc'))",
    "].map(c => c.toJSON());",
    "",
    "const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);",
    "(async () => {",
    "    try {",
    "        const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });",
    "        console.log('Berhasil daftarkan ' + data.length + ' command(s) termasuk /vc info!');",
    "    } catch (e) { console.error(e); }",
    "})();"
].join('\n');

fs.writeFileSync('D:/discord_bot/register_commands.js', code, 'utf8');
console.log('register_commands.js berhasil diperbarui dengan /vc info!');
