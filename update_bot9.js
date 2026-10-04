const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const botPath = path.join(targetDir, 'bot.js');

let botContent = fs.readFileSync(botPath, 'utf8');

const newSpeedtestCode = `    if (message.content === '!speedtest') {
        const NetworkSpeed = require('network-speed');
        const testNetworkSpeed = new NetworkSpeed();

        const speedMsg = await message.reply('Mengukur kecepatan internet (Download & Upload)... ⏳');
        try {
            // Test Download
            const baseUrl = 'https://eu.httpbin.org/stream-bytes/50000000'; // 50MB
            const fileSizeInBytes = 50000000;
            const downloadSpeed = await testNetworkSpeed.checkDownloadSpeed(baseUrl, fileSizeInBytes);

            // Test Upload
            const options = {
                hostname: 'www.google.com',
                port: 80,
                path: '/catchers/544b09b4599c1d0200000289',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            const uploadSizeInBytes = 2000000; // 2MB
            const uploadSpeed = await testNetworkSpeed.checkUploadSpeed(options, uploadSizeInBytes);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🚀 Hasil Speedtest Internet')
                .addFields(
                    { name: '📥 Download', value: downloadSpeed.mbps + ' Mbps', inline: true },
                    { name: '📤 Upload', value: uploadSpeed.mbps + ' Mbps', inline: true }
                )
                .setFooter({ text: 'Diuji dari komputer Asisten AI' });
                
            await speedMsg.edit({ content: '✅ Tes Selesai!', embeds: [embed] });
        } catch (err) {
            console.error(err);
            await speedMsg.edit('❌ Gagal melakukan uji kecepatan internet.');
        }
    }`;

botContent = botContent.replace(/    if \(message\.content === '!speedtest'\) \{[\s\S]*?    \}\n\n    if \(message\.content === '!halo'\)/g, newSpeedtestCode + '\n\n    if (message.content === \'!halo\')');

fs.writeFileSync(botPath, botContent);
console.log('Bot code updated for alternative speedtest');
