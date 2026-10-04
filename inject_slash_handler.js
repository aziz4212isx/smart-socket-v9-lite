const fs = require('fs');

const slashLogic = `
    // ════════════════════════════════════════
    // NEW SLASH COMMANDS HANDLER
    // ════════════════════════════════════════
    if (interaction.isChatInputCommand() && interaction.commandName !== 'vc') {
        const cmd = interaction.commandName;
        const uid = interaction.user.id;
        const guild = interaction.guild;
        const member = interaction.member;

        if (cmd === 'ping') {
            const m = await interaction.reply({ content: 'Pinging...', fetchReply: true });
            return interaction.editReply('Pong! Latency: \`' + (m.createdTimestamp - interaction.createdTimestamp) + 'ms\`. API Latency: \`' + Math.round(client.ws.ping) + 'ms\`.');
        }

        if (cmd === 'afk') {
            const reason = interaction.options.getString('alasan') || 'AFK';
            afkData[uid] = { reason, time: Date.now() };
            save(FILES.afk, afkData);
            return interaction.reply('?? Kamu sekarang AFK: **' + reason + '**');
        }

        if (cmd === 'saldo') {
            ensureEco(uid);
            return interaction.reply('?? Saldoum saat ini: **' + economyData[uid].coins + ' koin**');
        }

        if (cmd === 'daily') {
            ensureEco(uid);
            const now = Date.now();
            if (now - economyData[uid].lastDaily < 86400000) {
                const sisa = Math.ceil((86400000 - (now - economyData[uid].lastDaily))/3600000);
                return interaction.reply('?? Kamu sudah ambil daily. Tunggu ' + sisa + ' jam lagi.');
            }
            economyData[uid].coins += 100;
            economyData[uid].lastDaily = now;
            save(FILES.eco, economyData);
            return interaction.reply('?? Kamu mendapat **100 koin** daily! Saldo: ' + economyData[uid].coins);
        }

        if (cmd === 'transfer') {
            const t = interaction.options.getUser('penerima');
            const amt = interaction.options.getInteger('jumlah');
            if (t.id === uid) return interaction.reply('Tidak bisa transfer ke diri sendiri!');
            ensureEco(uid); ensureEco(t.id);
            if (economyData[uid].coins < amt) return interaction.reply('Koin tidak cukup! Saldo: ' + economyData[uid].coins);
            economyData[uid].coins -= amt;
            economyData[t.id].coins += amt;
            save(FILES.eco, economyData);
            return interaction.reply('?? Berhasil transfer **' + amt + ' koin** ke ' + t.username + '!');
        }

        if (cmd === 'shop') {
            const e = new EmbedBuilder().setColor(0xFFD700).setTitle('?? Toko Role Koin')
                .setDescription('Gunakan \`/beli [ID]\` untuk membeli role.')
                .addFields(
                    { name: 'ID: 1', value: 'VIP Role - 1000 Koin' },
                    { name: 'ID: 2', value: 'Donator Role - 500 Koin' }
                );
            return interaction.reply({ embeds: [e] });
        }

        if (cmd === 'beli') {
            const item = interaction.options.getString('item');
            ensureEco(uid);
            let cost = 0, roleName = '';
            if (item === '1' || item.toLowerCase() === 'vip') { cost = 1000; roleName = 'VIP'; }
            else if (item === '2' || item.toLowerCase() === 'donator') { cost = 500; roleName = 'Donator'; }
            else return interaction.reply('Item tidak ditemukan! Cek /shop.');
            
            if (economyData[uid].coins < cost) return interaction.reply('Koin tidak cukup!');
            const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
            if (!role) return interaction.reply('Role tidak ada di server ini (harus dibuat oleh admin).');
            if (member.roles.cache.has(role.id)) return interaction.reply('Kamu sudah memiliki role ini!');
            
            economyData[uid].coins -= cost;
            save(FILES.eco, economyData);
            await member.roles.add(role).catch(() => {});
            return interaction.reply('?? Berhasil membeli role **' + roleName + '**!');
        }

        if (cmd === 'rank') {
            const targetUser = interaction.options.getUser('member') || interaction.user;
            ensureEco(targetUser.id);
            const { level=0, xp=0 } = economyData[targetUser.id];
            const max = (level+1)*100;
            const e = new EmbedBuilder().setColor(0x00FF00)
                .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL() })
                .setDescription('**Level**: ' + level + '\\n**XP**: ' + xp + ' / ' + max + '\\n**Koin**: ' + economyData[targetUser.id].coins);
            return interaction.reply({ embeds: [e] });
        }

        if (cmd === 'info') {
            const target = interaction.options.getUser('member') || interaction.user;
            const targetMember = guild.members.cache.get(target.id);
            const e = new EmbedBuilder().setColor(0x0099FF).setTitle('Profil Pengguna')
                .setThumbnail(target.displayAvatarURL())
                .addFields(
                    { name: 'Username', value: target.username, inline: true },
                    { name: 'Join Discord', value: '<t:' + Math.floor(target.createdTimestamp/1000) + ':d>', inline: true },
                    { name: 'Join Server', value: targetMember ? '<t:' + Math.floor(targetMember.joinedTimestamp/1000) + ':d>' : 'Unknown', inline: true },
                    { name: 'ID', value: target.id, inline: false }
                );
            return interaction.reply({ embeds: [e] });
        }

        if (cmd === 'poll') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: 'Tidak ada izin!', ephemeral: true });
            const q = interaction.options.getString('pertanyaan');
            const opts = [
                interaction.options.getString('opsi1'),
                interaction.options.getString('opsi2'),
                interaction.options.getString('opsi3'),
                interaction.options.getString('opsi4')
            ].filter(Boolean);
            
            let desc = '';
            const emojis = ['1??', '2??', '3??', '4??'];
            opts.forEach((o, i) => desc += emojis[i] + ' ' + o + '\\n');
            const e = new EmbedBuilder().setColor(0x3498DB).setTitle('?? ' + q).setDescription(desc).setFooter({ text: 'Voting dimulai oleh ' + interaction.user.username });
            const msg = await interaction.reply({ embeds: [e], fetchReply: true });
            for (let i=0; i<opts.length; i++) await msg.react(emojis[i]);
            pollsData[msg.id] = { question: q, options: opts, channel: interaction.channelId };
            save(FILES.polls, pollsData);
            return;
        }

        if (cmd === 'giveaway') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageEvents)) return interaction.reply({ content: 'Tidak ada izin!', ephemeral: true });
            const durRaw = interaction.options.getString('waktu');
            const prize = interaction.options.getString('hadiah');
            let ms = 0;
            if (durRaw.endsWith('m')) ms = parseInt(durRaw)*60000;
            else if (durRaw.endsWith('h')) ms = parseInt(durRaw)*3600000;
            else if (durRaw.endsWith('d')) ms = parseInt(durRaw)*86400000;
            else return interaction.reply({ content: 'Format waktu salah! Gunakan m/h/d', ephemeral: true });
            
            const end = Date.now() + ms;
            const e = new EmbedBuilder().setColor(0xFF00FF).setTitle('?? GIVEAWAY: ' + prize)
                .setDescription('Klik ?? untuk ikut!\\nBerakhir: <t:' + Math.floor(end/1000) + ':R>')
                .setFooter({ text: 'Hosted by ' + interaction.user.username });
            const msg = await interaction.reply({ embeds: [e], fetchReply: true });
            await msg.react('??');
            giveawaysData[msg.id] = { channel: interaction.channelId, end, prize, host: uid };
            save(FILES.giveaway, giveawaysData);
            return;
        }

        if (cmd === 'tanya') {
            await interaction.deferReply();
            try {
                const prompt = interaction.options.getString('pertanyaan');
                // Cooldown
                const lastAI = aiCooldown.get(uid) || 0;
                if (Date.now() - lastAI < 4000) return interaction.editReply('Sabar ya! Tunggu beberapa detik sebelum bertanya lagi.');
                aiCooldown.set(uid, Date.now());

                const apis = [
                    { type: 'gemini', key: process.env.GEMINI_API_KEY },
                    { type: 'gemini', key: process.env.GEMINI_API_KEY_2 },
                    { type: 'gemini', key: process.env.GEMINI_API_KEY_3 },
                    { type: 'groq', key: process.env.GROQ_API_KEY },
                    { type: 'openrouter', key: process.env.OPENROUTER_API_KEY }
                ].filter(a => a.key && a.key.trim() !== '');
                if (apis.length === 0) return interaction.editReply('Belum ada API Key!');

                let respText = null;
                for (const api of apis) {
                    try {
                        if (api.type === 'gemini') {
                            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + api.key, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error('Gemini Fail');
                            respText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        } 
                        else if (api.type === 'groq') {
                            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                                body: JSON.stringify({ model: 'qwen/qwen3.6-27b', messages: [{ role: 'user', content: prompt }] })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error('Groq Fail');
                            respText = data.choices?.[0]?.message?.content;
                        }
                        else if (api.type === 'openrouter') {
                            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                                body: JSON.stringify({ model: 'google/gemma-4-26b-a4b-it:free', messages: [{ role: 'user', content: prompt }] })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error('OR Fail');
                            respText = data.choices?.[0]?.message?.content;
                        }
                        if (respText) break;
                    } catch (err) { continue; }
                }

                if (!respText) return interaction.editReply('⏳ Semua layanan AI sedang sibuk atau limit harian habis. Coba lagi beberapa menit.');
                respText = respText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
                
                const maxLength = 1950;
                let isFirst = true;
                while (respText.length > 0) {
                    let chunk = respText.length > maxLength ? respText.substring(0, maxLength) : respText;
                    if (respText.length > maxLength) {
                        const lastNewline = chunk.lastIndexOf('\\n');
                        if (lastNewline > maxLength - 500) chunk = chunk.substring(0, lastNewline);
                    }
                    if (isFirst) {
                        await interaction.editReply('**' + interaction.user.username + '**: ' + prompt + '\\n\\n' + chunk);
                        isFirst = false;
                    } else {
                        await interaction.channel.send(chunk);
                    }
                    respText = respText.substring(chunk.length).trim();
                }
            } catch (e) {
                console.error(e);
                await interaction.editReply('Otak AI saya sedang gangguan total. Coba lagi nanti!');
            }
            return;
        }
        return; // END OF NEW SLASH COMMANDS
    }
`;

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Insert after "if (!interaction.isButton()) return;"
// but wait, the previous code had the button check directly after VC command.
// I will insert it right before "if (!interaction.isButton()) return;"
const target = "if (!interaction.isButton()) return;";
if (code.includes(target)) {
    code = code.replace(target, slashLogic.trim() + '\\n\\n    ' + target);
    fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
    console.log('Slash Commands logic injected successfully!');
} else {
    console.log('Error: Could not find target insertion point.');
}

