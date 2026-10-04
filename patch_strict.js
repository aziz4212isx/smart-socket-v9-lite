const fs = require('fs');

let bot = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// BUG 2
const bug2Before = `const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');`;
const bug2After = `const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');`;
bot = bot.replace(bug2Before, bug2After);

// BUG 4
const bug4Before = `    if (msg === '!setuproles' || msg === '!refreshroles') {
          if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator) && msg !== '!refreshroles') return;`;
const bug4After = `    if (msg === '!setuproles' || msg === '!refreshroles') {
          if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');`;
bot = bot.replace(bug4Before, bug4After);

// BUG 5
const bug5Before = `client.once('ready', async () => {
    console.log('Bot login: ' + client.user.tag);
    client.user.setActivity('Tanya AI | !tanya', { type: 3 });
    const g = client.guilds.cache.first();
    if (g) {
        await g.members.fetch();
        setInterval(() => updateStats(g), 5 * 60 * 1000);
    }
});`;
const bug5After = `client.once('ready', async () => {
    console.log('Bot login: ' + client.user.tag);
    client.user.setActivity('Tanya AI | !tanya', { type: 3 });
    const g = client.guilds.cache.first();
    if (g) {
        await g.members.fetch();
        setInterval(() => updateStats(g), 5 * 60 * 1000);

        giveawayData = load(FILES.giveaway);
        const now = Date.now();
        for (const [msgId, gw] of Object.entries(giveawayData)) {
            const remaining = gw.endsAt - now;
            if (remaining <= 0) {
                endGiveaway(msgId);
            } else {
                setTimeout(() => endGiveaway(msgId), remaining);
            }
        }
    }
});`;
bot = bot.replace(bug5Before, bug5After);

// BUG BARU LOKASI 1 (Slash Command)
const vcSlashBefore = `        if (subCmd === 'transfer') { const t = interaction.options.getMember('member'); if (!t||t.voice.channelId!==vcId) return interaction.reply({ content: 'Member harus di channel kamu!', flags: 64 }); tempChannels.set(vcId,t.id); await vcCh.permissionOverwrites.edit(t.id,{ManageChannels:true,MuteMembers:true,DeafenMembers:true,MoveMembers:true}); await vcCh.permissionOverwrites.delete(uid); await sendControlPanel(t,vcCh); return interaction.reply({ content: '👑 Ditransfer ke ' + t.user.username, flags: 64 }); }`;
const vcSlashAfter = vcSlashBefore + `\n        if (subCmd === 'info') {
            const ownerId = tempChannels.get(vcId);
            const isLocked = vcCh.permissionOverwrites.cache.get(interaction.guild.id)?.deny.has(PermissionsBitField.Flags.Connect) || false;
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Info Channel: ' + vcCh.name)
                .addFields(
                    { name: 'Pemilik', value: ownerId ? '<@' + ownerId + '>' : 'Tidak diketahui', inline: true },
                    { name: 'Member', value: vcCh.members.size + ' orang', inline: true },
                    { name: 'Batas Member', value: (vcCh.userLimit === 0 ? 'Tidak terbatas' : vcCh.userLimit + ' orang'), inline: true },
                    { name: 'Status', value: isLocked ? '🔒 Terkunci' : '🔓 Terbuka', inline: true }
                );
            return interaction.reply({ embeds: [embed], flags: 64 });
        }`;

// The emoji in bot.js is actually '??' because it wasn't saved correctly with unicode, or it was saved as '👑' in the terminal search but I should just search by the surrounding text!
// Let's use a regex that matches the emoji flexibly.
const slashRegex = /        if \(subCmd === 'transfer'\) \{ const t = interaction\.options\.getMember\('member'\); if \(!t\|\|t\.voice\.channelId!==vcId\) return interaction\.reply\(\{ content: 'Member harus di channel kamu!', flags: 64 \}\); tempChannels\.set\(vcId,t\.id\); await vcCh\.permissionOverwrites\.edit\(t\.id,\{ManageChannels:true,MuteMembers:true,DeafenMembers:true,MoveMembers:true\}\); await vcCh\.permissionOverwrites\.delete\(uid\); await sendControlPanel\(t,vcCh\); return interaction\.reply\(\{ content: '.*? Ditransfer ke ' \+ t\.user\.username, flags: 64 \}\); \}/;
if (slashRegex.test(bot)) {
    bot = bot.replace(slashRegex, match => match + `\n        if (subCmd === 'info') {
            const ownerId = tempChannels.get(vcId);
            const isLocked = vcCh.permissionOverwrites.cache.get(interaction.guild.id)?.deny.has(PermissionsBitField.Flags.Connect) || false;
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Info Channel: ' + vcCh.name)
                .addFields(
                    { name: 'Pemilik', value: ownerId ? '<@' + ownerId + '>' : 'Tidak diketahui', inline: true },
                    { name: 'Member', value: vcCh.members.size + ' orang', inline: true },
                    { name: 'Batas Member', value: (vcCh.userLimit === 0 ? 'Tidak terbatas' : vcCh.userLimit + ' orang'), inline: true },
                    { name: 'Status', value: isLocked ? '🔒 Terkunci' : '🔓 Terbuka', inline: true }
                );
            return interaction.reply({ embeds: [embed], flags: 64 });
        }`);
}

// BUG BARU LOKASI 2 (Prefix Command)
const prefixRegex = /        if \(subCmd === 'transfer'\) \{ const t = message\.mentions\.members\.first\(\); if \(!t\|\|t\.voice\.channelId!==vcId\) return message\.reply\('Member harus di channel kamu!'\); tempChannels\.set\(vcId,t\.id\); await vcCh\.permissionOverwrites\.edit\(t\.id,\{ManageChannels:true,MuteMembers:true,DeafenMembers:true,MoveMembers:true\}\); await vcCh\.permissionOverwrites\.delete\(uid\); await sendControlPanel\(t,vcCh\); return message\.reply\('.*? Ditransfer ke ' \+ t\.user\.username\); \}/;
if (prefixRegex.test(bot)) {
    bot = bot.replace(prefixRegex, match => match + `\n        if (subCmd === 'info') {
            const ownerId = tempChannels.get(vcId);
            const isLocked = vcCh.permissionOverwrites.cache.get(message.guild.id)?.deny.has(PermissionsBitField.Flags.Connect) || false;
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Info Channel: ' + vcCh.name)
                .addFields(
                    { name: 'Pemilik', value: ownerId ? '<@' + ownerId + '>' : 'Tidak diketahui', inline: true },
                    { name: 'Member', value: vcCh.members.size + ' orang', inline: true },
                    { name: 'Batas Member', value: (vcCh.userLimit === 0 ? 'Tidak terbatas' : vcCh.userLimit + ' orang'), inline: true },
                    { name: 'Status', value: isLocked ? '🔒 Terkunci' : '🔓 Terbuka', inline: true }
                );
            return message.reply({ embeds: [embed] });
        }`);
}

fs.writeFileSync('D:/discord_bot/bot.js', bot, 'utf8');
console.log('Updates applied!');
