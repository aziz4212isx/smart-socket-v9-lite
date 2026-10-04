const fs = require('fs');

const registerCode = `require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Kelola channel voice sementara milikmu')
        .addSubcommand(sub =>
            sub.setName('lock')
                .setDescription('Kunci channel agar tidak ada yang bisa masuk')
        )
        .addSubcommand(sub =>
            sub.setName('unlock')
                .setDescription('Buka kembali channel agar semua orang bisa masuk')
        )
        .addSubcommand(sub =>
            sub.setName('rename')
                .setDescription('Ganti nama channel-mu')
                .addStringOption(opt =>
                    opt.setName('nama')
                        .setDescription('Nama baru untuk channel kamu')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('limit')
                .setDescription('Atur batas jumlah member di channel (0 = tidak terbatas)')
                .addIntegerOption(opt =>
                    opt.setName('jumlah')
                        .setDescription('Batas jumlah member (0-99)')
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Keluarkan member dari channel-mu')
                .addUserOption(opt =>
                    opt.setName('member')
                        .setDescription('Member yang ingin dikeluarkan')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('transfer')
                .setDescription('Transfer kepemilikan channel ke member lain')
                .addUserOption(opt =>
                    opt.setName('member')
                        .setDescription('Member yang akan menerima kepemilikan')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('help')
                .setDescription('Tampilkan semua command /vc yang tersedia')
        )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Mendaftarkan slash commands...');
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Berhasil mendaftarkan ' + data.length + ' slash command(s)!');
    } catch (error) {
        console.error('Error mendaftarkan slash commands:', error);
    }
})();
`;

fs.writeFileSync('D:\\discord_bot\\register_commands.js', registerCode, 'utf8');
console.log('register_commands.js berhasil dibuat!');
