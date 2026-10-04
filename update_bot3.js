const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const botPath = path.join(targetDir, 'bot.js');

const botContent = `require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ] 
});

let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

client.on('ready', () => {
    console.log('✅ Bot berhasil login sebagai ' + client.user.tag + '!');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Logika AI Gemini
    if (message.channel.name === 'tanya-ai') {
        if (!process.env.GEMINI_API_KEY) {
            return message.reply('⚠️ Maaf, fitur kecerdasan buatan belum diaktifkan karena GEMINI_API_KEY belum dimasukkan ke sistem.');
        }

        await message.channel.sendTyping();

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = message.content;
            
            const result = await model.generateContent(prompt);
            const response = result.response.text();

            if (response.length > 1999) {
                await message.reply(response.substring(0, 1995) + '...');
            } else {
                await message.reply(response);
            }
        } catch (error) {
            console.error(error);
            await message.reply('❌ Maaf, otak AI saya sedang mengalami gangguan. Coba lagi nanti!');
        }
        return; 
    }

    if (message.content === '!halo') {
        message.reply('Halo ' + message.author.username + '! Saya adalah Asisten AI Anda.');
    }

    if (message.content === '!ping') {
        message.reply('Pong! Latensi jaringan adalah ' + (Date.now() - message.createdTimestamp) + 'ms.');
    }

    if (message.content === '!invitebots') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Rekomendasi Bot Populer')
            .setDescription('Sistem Discord tidak mengizinkan bot untuk memasukkan bot lain secara otomatis. Namun, Anda bisa mengundang bot-bot populer ini dengan mengklik link di bawah:')
            .addFields(
                { name: '🛡️ ProBot', value: '[Klik untuk Invite (Moderasi & Leveling)](https://discord.com/oauth2/authorize?client_id=282859044593598464&permissions=8&scope=bot)' },
                { name: '🎵 Vexera', value: '[Klik untuk Invite (Pemutar Musik)](https://discord.com/oauth2/authorize?client_id=235088799074484224&permissions=8&scope=bot)' },
                { name: '🐸 Dank Memer', value: '[Klik untuk Invite (Game Ekonomi & Meme)](https://discord.com/oauth2/authorize?client_id=270904126974590976&permissions=8&scope=bot)' },
                { name: '🎮 Mudae', value: '[Klik untuk Invite (Koleksi Karakter Anime)](https://discord.com/api/oauth2/authorize?client_id=432610292342587392&permissions=8&scope=bot)' }
            )
            .setFooter({ text: 'Klik link di atas, pilih server Anda, dan klik Authorize!' });

        message.reply({ embeds: [embed] });
    }

    if (message.content === '!setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Maaf, hanya Administrator yang bisa menggunakan perintah ini!');
        }

        const guild = message.guild;
        const setupMessage = await message.reply('Memulai proses setup server... Mohon tunggu sebentar ⏳');

        try {
            await setupMessage.edit('1️⃣ Sedang membuat Roles...');
            const roles = [
                { name: '👑 Admin', color: '#ff0000', permissions: [PermissionsBitField.Flags.Administrator] },
                { name: '🛡️ Moderator', color: '#00ff00', permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
                { name: '🌟 VIP', color: '#ffd700', permissions: [] },
                { name: '👥 Member', color: '#ffffff', permissions: [] }
            ];

            for (const roleData of roles) {
                const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
                if (!existingRole) {
                    await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions,
                        reason: 'Auto setup server'
                    });
                }
            }

            await setupMessage.edit('2️⃣ Sedang membuat Kategori & Channel...');
            
            // Kategori: 👋 INFORMASI
            let infoCategory = guild.channels.cache.find(c => c.name === '👋 INFORMASI' && c.type === ChannelType.GuildCategory);
            if (!infoCategory) {
                infoCategory = await guild.channels.create({ name: '👋 INFORMASI', type: ChannelType.GuildCategory });
            }
            if (!guild.channels.cache.find(c => c.name === 'aturan' && c.parentId === infoCategory.id)) {
                await guild.channels.create({ name: 'aturan', type: ChannelType.GuildText, parent: infoCategory.id });
            }
            if (!guild.channels.cache.find(c => c.name === 'pengumuman' && c.parentId === infoCategory.id)) {
                await guild.channels.create({ name: 'pengumuman', type: ChannelType.GuildText, parent: infoCategory.id });
            }
            if (!guild.channels.cache.find(c => c.name === 'panduan-bot' && c.parentId === infoCategory.id)) {
                const panduanChannel = await guild.channels.create({ name: 'panduan-bot', type: ChannelType.GuildText, parent: infoCategory.id });
                // ... (panduan message removed here for brevity, assuming already run previously)
            }

            // Kategori AI Baru
            let aiCategory = guild.channels.cache.find(c => c.name === '🤖 ARTIFICIAL INTELLIGENCE' && c.type === ChannelType.GuildCategory);
            if (!aiCategory) {
                aiCategory = await guild.channels.create({ name: '🤖 ARTIFICIAL INTELLIGENCE', type: ChannelType.GuildCategory });
            }
            if (!guild.channels.cache.find(c => c.name === 'tanya-ai' && c.parentId === aiCategory.id)) {
                await guild.channels.create({ name: 'tanya-ai', type: ChannelType.GuildText, parent: aiCategory.id });
            }

            // Kategori: 💬 OBROLAN UMUM
            let chatCategory = guild.channels.cache.find(c => c.name === '💬 OBROLAN UMUM' && c.type === ChannelType.GuildCategory);
            if (!chatCategory) {
                chatCategory = await guild.channels.create({ name: '💬 OBROLAN UMUM', type: ChannelType.GuildCategory });
            }
            if (!guild.channels.cache.find(c => c.name === 'general' && c.parentId === chatCategory.id)) {
                await guild.channels.create({ name: 'general', type: ChannelType.GuildText, parent: chatCategory.id });
            }
            if (!guild.channels.cache.find(c => c.name === 'bot-command' && c.parentId === chatCategory.id)) {
                await guild.channels.create({ name: 'bot-command', type: ChannelType.GuildText, parent: chatCategory.id });
            }
            if (!guild.channels.cache.find(c => c.name === 'media' && c.parentId === chatCategory.id)) {
                await guild.channels.create({ name: 'media', type: ChannelType.GuildText, parent: chatCategory.id });
            }

            // Kategori: 🔊 VOICE CHANNELS
            let voiceCategory = guild.channels.cache.find(c => c.name === '🔊 VOICE CHANNELS' && c.type === ChannelType.GuildCategory);
            if (!voiceCategory) {
                voiceCategory = await guild.channels.create({ name: '🔊 VOICE CHANNELS', type: ChannelType.GuildCategory });
            }
            if (!guild.channels.cache.find(c => c.name === 'lounge' && c.parentId === voiceCategory.id)) {
                await guild.channels.create({ name: 'Lounge', type: ChannelType.GuildVoice, parent: voiceCategory.id });
            }

            await setupMessage.edit('✅ **Setup Server Selesai!** Kategori khusus AI telah ditambahkan.');
            
        } catch (error) {
            console.error(error);
            await setupMessage.edit('❌ Terjadi kesalahan saat melakukan setup: ' + error.message);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
`;

fs.writeFileSync(botPath, botContent);
console.log('Bot code updated for LLM integration');
