// Patch: fix !updatepanduan - ganti message.reply() setelah bulk delete menjadi channel.send()
const fs = require('fs');
let content = fs.readFileSync('D:\\discord_bot\\bot.js', 'utf8');

// Ganti reply setelah bulkDelete dengan channel.send agar tidak crash
content = content.replace(
    `await panduanChannel.send({ embeds: [panduanEmbed] });
            return message.reply('Panduan lengkap telah berhasil diperbarui di channel <#' + panduanChannel.id + '>!');
        } catch (err) {
            console.error(err);
            return message.reply('Gagal memperbarui panduan: ' + err.message).catch(console.error);`,
    `await panduanChannel.send({ embeds: [panduanEmbed] });
            // Kirim notifikasi ke channel asal perintah (bukan reply karena pesannya mungkin sudah terhapus)
            if (message.channel.id !== panduanChannel.id) {
                await message.channel.send(message.author + ' Panduan telah diperbarui di <#' + panduanChannel.id + '>!');
            }
        } catch (err) {
            console.error(err);
            await message.channel.send('Gagal memperbarui panduan: ' + err.message).catch(console.error);`
);

fs.writeFileSync('D:\\discord_bot\\bot.js', content, 'utf8');
console.log('Patch berhasil! !updatepanduan tidak akan crash lagi.');
