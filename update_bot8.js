const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const botPath = path.join(targetDir, 'bot.js');

let botContent = fs.readFileSync(botPath, 'utf8');

const speedtestCode = `    if (message.content === '!ping') {
        message.reply('Pong! Latensi jaringan adalah ' + (Date.now() - message.createdTimestamp) + 'ms.');
    }

    if (message.content === '!speedtest') {
        const speedTest = require('speedtest-net');
        const speedMsg = await message.reply('Mengukur kecepatan internet server (komputer Anda)... ⏳ (Ini mungkin memakan waktu 10-20 detik)');
        try {
            const result = await speedTest({ acceptLicense: true, acceptGdpr: true });
            const download = (result.download.bandwidth / 125000).toFixed(2);
            const upload = (result.upload.bandwidth / 125000).toFixed(2);
            const ping = result.ping.latency;
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🚀 Hasil Speedtest Internet')
                .addFields(
                    { name: '📥 Download', value: download + ' Mbps', inline: true },
                    { name: '📤 Upload', value: upload + ' Mbps', inline: true },
                    { name: '🏓 Ping', value: ping + ' ms', inline: true },
                    { name: '📡 Provider', value: result.isp || 'Unknown', inline: false }
                )
                .setFooter({ text: 'Diuji dari komputer Asisten AI' });
                
            await speedMsg.edit({ content: '✅ Tes Selesai!', embeds: [embed] });
        } catch (err) {
            console.error(err);
            await speedMsg.edit('❌ Gagal melakukan uji kecepatan internet. (Mungkin sistem sedang mengunduh library test, coba lagi dalam 1 menit).');
        }
    }`;

botContent = botContent.replace(/    if \(message\.content === '!ping'\) \{\s*message\.reply\('Pong! Latensi jaringan adalah ' \+ \(Date\.now\(\) \- message\.createdTimestamp\) \+ 'ms\.'\);\s*\}/g, speedtestCode);

fs.writeFileSync(botPath, botContent);
console.log('Bot code updated for speedtest');
