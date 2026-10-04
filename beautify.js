const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Setup Embeds Banners
code = code.replace(
    /const embed = new EmbedBuilder\(\)\.setColor\(0xE74C3C\)\.setTitle\('ATURAN SERVER'\)/,
    "const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('ATURAN SERVER').setImage('https://i.imgur.com/4qK4WcE.gif')"
);
code = code.replace(
    /const embed  = new EmbedBuilder\(\)\.setColor\(0x5865F2\)\.setTitle\('Pilih Role Minatmu'\)/,
    "const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('https://i.imgurcom/rM5L32x.gif')"
);
code = code.replace(
    /const embed = new EmbedBuilder\(\)\.setColor\(0x5865F2\)\.setTitle\('Sistem Tiket Dukungan'\)/,
    "const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Sistem Tiket Dukungan').setImage('https://i.imgur.com/KqZcK91.gif')"
);

// 2. /info thumbnail
code = code.replace(
    /const embed  = new EmbedBuilder\(\)\.setColor\(0x1ABC9C\)\.setTitle\('Informasi Member'\)/,
    "const embed  = new EmbedBuilder().setColor(0x1ABC9C).setTitle('Informasi Member').setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))"
);

// 3. Ticket Close Button & Interaction
const ticketCreateOld = `await tCh.send({ content: interaction.user.toString() + (adminRole ? ' ' + adminRole.toString() : ''), embeds: [
                new EmbedBuilder().setColor(0x5865F2).setTitle('Tiket Dibuat').setDescription('Jelaskan masalah kamu. Ketik **!tutuptiket** setelah selesai.').setTimestamp()
            ] }).catch(() => {});`;
const ticketCreateNew = `const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Tutup Tiket').setStyle(ButtonStyle.Danger)
            );
            await tCh.send({ content: interaction.user.toString() + (adminRole ? ' ' + adminRole.toString() : ''), embeds: [
                new EmbedBuilder().setColor(0x5865F2).setTitle('Tiket Dibuat').setDescription('Jelaskan masalah kamu lalu klik tombol di bawah untuk menutup tiket.').setTimestamp()
            ], components: [closeRow] }).catch(() => {});`;
code = code.replace(ticketCreateOld, ticketCreateNew);

// Add ticket close handler inside interactionCreate (around button clicks)
const btnClose = `
    // Tutup Tiket Button
    if (customId === 'close_ticket') {
        if (!interaction.channel.name.startsWith('tiket-')) return interaction.reply({ content: 'Ini bukan channel tiket!', ephemeral: true });
        await interaction.reply('Mereset dan menutup tiket dalam 5 detik...');
        setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
        return;
    }
`;
code = code.replace(`if (customId === 'buka_tiket') {`, btnClose + `\n    if (customId === 'buka_tiket') {`);

// 4. Welcome Message Enhancement
const welcomeOld = `const welcomeEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('Selamat Datang di Server! 🎉')
            .setDescription('Halo ' + member.user.toString() + ', selamat datang! Silakan verifikasi di <#' + ch.id + '>.');
        if (generalCh) await generalCh.send({ embeds: [welcomeEmbed] }).catch(() => {});`;

const welcomeNew = `const welcomeEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('Selamat Datang di Server! 🎉')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription('Halo ' + member.user.toString() + ', selamat bergabung bersama kami! 🙌\\nJangan lupa untuk memverifikasi diri di <#' + ch.id + '> agar bisa mengakses seluruh channel.\\n\\nSelamat bersenang-senang!')
            .setImage('https://i.imgur.com/L79E9fS.gif');
        if (generalCh) await generalCh.send({ content: 'Selamat datang ' + member.user.toString() + '!', embeds: [welcomeEmbed] }).catch(() => {});`;
code = code.replace(welcomeOld, welcomeNew);

// 5. Minigames (Coinflip & Slots)
const minigamesCode = `
        // MINIGAMES
        if (cmd === 'coinflip') {
            ensureEco(uid);
            const bet = interaction.options.getInteger('taruhan');
            const choice = interaction.options.getString('sisi');
            if (bet < 1) return interaction.reply('Taruhan minimal 1 koin!');
            if (economyData[uid].coins < bet) return interaction.reply('Koinmu tidak cukup!');
            
            economyData[uid].coins -= bet;
            save(FILES.economy, economyData);
            
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const isWin = result === choice;
            
            if (isWin) {
                economyData[uid].coins += bet * 2;
                save(FILES.economy, economyData);
                return interaction.reply(\`🪙 Koin dilempar... **\${result.toUpperCase()}**!\\n🎉 Selamat, tebakanmu benar! Kamu menang **\${bet * 2} koin**. Saldo: \${economyData[uid].coins}\`);
            } else {
                return interaction.reply(\`🪙 Koin dilempar... **\${result.toUpperCase()}**!\\n😢 Sayang sekali, tebakanmu salah. Kamu kehilangan **\${bet} koin**. Saldo: \${economyData[uid].coins}\`);
            }
        }
        if (cmd === 'slots') {
            ensureEco(uid);
            const bet = interaction.options.getInteger('taruhan');
            if (bet < 1) return interaction.reply('Taruhan minimal 1 koin!');
            if (economyData[uid].coins < bet) return interaction.reply('Koinmu tidak cukup!');
            
            economyData[uid].coins -= bet;
            
            const emojis = ['🍎', '🍇', '🍒', '🍋', '💎', '🔔'];
            const slot1 = emojis[Math.floor(Math.random() * emojis.length)];
            const slot2 = emojis[Math.floor(Math.random() * emojis.length)];
            const slot3 = emojis[Math.floor(Math.random() * emojis.length)];
            
            let winText = 'Kamu kalah!';
            if (slot1 === slot2 && slot2 === slot3) {
                const prize = (slot1 === '💎') ? bet * 20 : bet * 10;
                economyData[uid].coins += prize;
                winText = \`🎉 JACKPOT! Kamu memenangkan **\${prize} koin**!\`;
            } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
                economyData[uid].coins += bet * 2;
                winText = \`✅ Sedikit beruntung! Kamu memenangkan **\${bet * 2} koin**.\`;
            }
            save(FILES.economy, economyData);
            
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle('🎰 MESIN SLOT 🎰')
                .setDescription(\`[ \${slot1} | \${slot2} | \${slot3} ]\\n\\n\${winText}\\nSaldo saat ini: \${economyData[uid].coins}\`);
            return interaction.reply({ embeds: [embed] });
        }
`;
code = code.replace(`if (cmd === 'info') {`, minigamesCode + `\n        if (cmd === 'info') {`);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Bot beautification part 1 implemented.');
