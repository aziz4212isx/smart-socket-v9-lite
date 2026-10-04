const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const botPath = path.join(targetDir, 'bot.js');

let botContent = fs.readFileSync(botPath, 'utf8');

const newSpeedtestCode = `    if (message.content === '!speedtest') {
        const { exec } = require('child_process');
        const speedMsg = await message.reply('Mengukur kecepatan internet server (komputer Anda)... ⏳ (Ini mungkin memakan waktu 15-30 detik)');
        
        exec('npx -y fast-cli --json', (error, stdout, stderr) => {
            if (error) {
                console.error('exec error:', error);
                return speedMsg.edit('❌ Gagal melakukan uji kecepatan internet.');
            }
            try {
                // Parse stdout, which might have some npm warnings at the top, so find the first '{'
                const jsonStr = stdout.substring(stdout.indexOf('{'));
                const result = JSON.parse(jsonStr);
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🚀 Hasil Speedtest Internet')
                    .addFields(
                        { name: '📥 Download', value: result.downloadSpeed + ' ' + result.downloadUnit, inline: true },
                        { name: '🏓 Ping / Latency', value: result.latency + ' ms', inline: true },
                        { name: '📡 Lokasi Server', value: (result.serverLocations && result.serverLocations.length > 0) ? result.serverLocations[0] : 'Unknown', inline: false }
                    )
                    .setFooter({ text: 'Diuji menggunakan server Fast.com (Netflix)' });
                    
                speedMsg.edit({ content: '✅ Tes Selesai!', embeds: [embed] });
            } catch (err) {
                console.error('Parse error:', err);
                speedMsg.edit('❌ Gagal membaca hasil uji kecepatan.');
            }
        });
        return;
    }`;

// Use regex to replace whatever the speedtest block currently is.
botContent = botContent.replace(/    if \(message\.content === '!speedtest'\) \{[\s\S]*?    \}\n\n    if \(message\.content === '!halo'\)/g, newSpeedtestCode + '\n\n    if (message.content === \'!halo\')');

fs.writeFileSync(botPath, botContent);
console.log('Bot code updated to use fast-cli');
