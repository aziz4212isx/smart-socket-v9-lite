const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const targetSuccess = "await replyMsg.edit('✅ Selesai! Role terkelola telah dihapus dari ' + count + ' member.');";
const replaceSuccess = `await replyMsg.edit('✅ Selesai! Role terkelola telah dihapus dari ' + count + ' member.');
            
            const logCh = message.guild.channels.cache.find(c => c.name === 'log-server');
            if (logCh) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Reset Role Massal Dijalankan')
                    .addFields(
                        { name: 'Oleh', value: message.author.toString() },
                        { name: 'Jumlah Member Terkena', value: count.toString() },
                        { name: 'Channel', value: message.channel.toString() }
                    )
                    .setTimestamp();
                await logCh.send({ embeds: [embed] }).catch(() => {});
            }`;

const targetError = "await replyMsg.edit('❌ Terjadi kesalahan saat memproses reset.');";
const replaceError = `await replyMsg.edit('❌ Terjadi kesalahan saat memproses reset.');
            
            const logChError = message.guild.channels.cache.find(c => c.name === 'log-server');
            if (logChError) {
                const embedError = new EmbedBuilder()
                    .setTitle('🔄 Reset Role Massal Dijalankan')
                    .setDescription('**Error:** ' + err.message)
                    .addFields(
                        { name: 'Oleh', value: message.author.toString() },
                        { name: 'Jumlah Member Terkena', value: count.toString() },
                        { name: 'Channel', value: message.channel.toString() }
                    )
                    .setTimestamp();
                await logChError.send({ embeds: [embedError] }).catch(() => {});
            }`;

code = code.replace(targetSuccess, replaceSuccess);
code = code.replace(targetError, replaceError);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('OK: Audit log for !resetsemuarole applied.');
