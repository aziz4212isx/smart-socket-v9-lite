const fs = require('fs');

const code = `require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Kelola channel voice sementara milikmu')
        .addSubcommand(sub => sub.setName('info').setDescription('Lihat info channel aktifmu'))
        .addSubcommand(sub => sub.setName('lock').setDescription('Kunci channel agar tidak ada yang bisa masuk'))
        .addSubcommand(sub => sub.setName('unlock').setDescription('Buka kembali channel agar semua orang bisa masuk'))
        .addSubcommand(sub => sub.setName('rename').setDescription('Ganti nama channel-mu').addStringOption(opt => opt.setName('nama').setDescription('Nama baru').setRequired(true)))
        .addSubcommand(sub => sub.setName('limit').setDescription('Atur batas member (0=bebas)').addIntegerOption(opt => opt.setName('jumlah').setDescription('0-99').setMinValue(0).setMaxValue(99).setRequired(true)))
        .addSubcommand(sub => sub.setName('kick').setDescription('Keluarkan member dari channel').addUserOption(opt => opt.setName('member').setDescription('Member yang dikeluarkan').setRequired(true)))
        .addSubcommand(sub => sub.setName('transfer').setDescription('Transfer kepemilikan ke member lain').addUserOption(opt => opt.setName('member').setDescription('Pemilik baru').setRequired(true)))
        .addSubcommand(sub => sub.setName('help').setDescription('Tampilkan semua command /vc')),
        
    new SlashCommandBuilder()
        .setName('tanya')
        .setDescription('Tanyakan apa saja kepada Asisten AI')
        .addStringOption(opt => opt.setName('pertanyaan').setDescription('Apa yang ingin kamu tanyakan?').setRequired(true)),
        
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Cek ping bot ke server Discord'),
        
    new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Lihat kartu level dan XP (kosongkan member untuk melihat milik sendiri)')
        .addUserOption(opt => opt.setName('member').setDescription('Pilih member yang ingin dilihat rank-nya').setRequired(false)),
        
    new SlashCommandBuilder()
        .setName('info')
        .setDescription('Lihat informasi profil akun (kosongkan member untuk melihat milik sendiri)')
        .addUserOption(opt => opt.setName('member').setDescription('Pilih member yang ingin dilihat infonya').setRequired(false)),
        
    new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Cek saldo koinmu saat ini'),
        
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Ambil jatah koin harianmu'),
        
    new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer koin ke member lain')
        .addUserOption(opt => opt.setName('penerima').setDescription('Member yang akan menerima koin').setRequired(true))
        .addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah koin yang akan dikirim').setMinValue(1).setRequired(true)),
        
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Lihat toko koin untuk membeli role'),
        
    new SlashCommandBuilder()
        .setName('beli')
        .setDescription('Beli item/role dari shop')
        .addStringOption(opt => opt.setName('item').setDescription('ID/Nama item (contoh: 1 atau VIP)').setRequired(true)),
        
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Mulai giveaway baru')
        .addStringOption(opt => opt.setName('waktu').setDescription('Durasi (contoh: 10m, 1h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('hadiah').setDescription('Hadiah yang dibagikan').setRequired(true)),
        
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Buat polling/voting baru')
        .addStringOption(opt => opt.setName('pertanyaan').setDescription('Pertanyaan polling').setRequired(true))
        .addStringOption(opt => opt.setName('opsi1').setDescription('Opsi pilihan 1').setRequired(true))
        .addStringOption(opt => opt.setName('opsi2').setDescription('Opsi pilihan 2').setRequired(true))
        .addStringOption(opt => opt.setName('opsi3').setDescription('Opsi pilihan 3 (opsional)').setRequired(false))
        .addStringOption(opt => opt.setName('opsi4').setDescription('Opsi pilihan 4 (opsional)').setRequired(false)),
        
    new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set statusmu menjadi AFK')
        .addStringOption(opt => opt.setName('alasan').setDescription('Alasan AFK (opsional)').setRequired(false))
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

fs.writeFileSync('D:/discord_bot/register_commands.js', code, 'utf8');
console.log('register_commands.js rewritten!');
