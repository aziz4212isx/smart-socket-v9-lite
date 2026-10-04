const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const kelolaRoleHandler = `
      // /kelolarole
      if (interaction.isChatInputCommand() && interaction.commandName === 'kelolarole') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Hanya Administrator!', flags: 64 });
          
          const sub = interaction.options.getSubcommand();
          const roles = loadRoles();
          
          if (sub === 'tambah') {
              const name = interaction.options.getString('nama');
              const emoji = interaction.options.getString('emoji');
              const colorStr = interaction.options.getString('warna').toLowerCase();
              let style = ButtonStyle.Primary;
              if (colorStr === 'success' || colorStr === 'hijau') style = ButtonStyle.Success;
              if (colorStr === 'danger' || colorStr === 'merah') style = ButtonStyle.Danger;
              if (colorStr === 'secondary' || colorStr === 'abu') style = ButtonStyle.Secondary;
              
              const id = 'role_' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
              
              if (roles.find(r => r.id === id)) return interaction.reply({ content: 'Role sudah ada!', flags: 64 });
              if (roles.length >= 25) return interaction.reply({ content: 'Maksimal 25 role tercapai!', flags: 64 });
              
              roles.push({ id, name, emoji, style });
              saveRoles(roles);
              
              const roleCh = interaction.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
              if (roleCh) {
                  const roleChFetched = await roleCh.messages.fetch({ limit: 20 });
                  const roleChDel = roleChFetched.filter(m => m.author.id === client.user.id);
                  if (roleChDel.size > 0) await roleCh.bulkDelete(roleChDel).catch(() => {});
                  
                  const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('attachment://banner_roles.jpg')
                      .setDescription('Klik tombol di bawah untuk mendapatkan atau melepas role sesuai minatmu. Klik lagi untuk melepas.');
                  
                  const components = [];
                  for (let i = 0; i < roles.length; i += 5) {
                      const chunk = roles.slice(i, i + 5);
                      const row = new ActionRowBuilder().addComponents(
                          chunk.map(r => new ButtonBuilder().setCustomId(r.id).setLabel(r.name).setStyle(r.style || ButtonStyle.Primary).setEmoji(r.emoji))
                      );
                      components.push(row);
                  }
                  await roleCh.send({ files: [{ attachment: './assets/banner_roles.jpg', name: 'banner_roles.jpg' }], embeds: [embed], components }).catch(() => {});
              }
              
              return interaction.reply({ content: '✅ Role **' + name + '** berhasil ditambahkan! Tombol di #pilih-role otomatis diupdate.', flags: 64 });
          }
          
          if (sub === 'hapus') {
              const name = interaction.options.getString('nama');
              const idx = roles.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
              if (idx === -1) return interaction.reply({ content: 'Role tidak ditemukan!', flags: 64 });
              
              roles.splice(idx, 1);
              saveRoles(roles);
              
              const roleCh = interaction.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
              if (roleCh) {
                  const roleChFetched = await roleCh.messages.fetch({ limit: 20 });
                  const roleChDel = roleChFetched.filter(m => m.author.id === client.user.id);
                  if (roleChDel.size > 0) await roleCh.bulkDelete(roleChDel).catch(() => {});
                  
                  const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('attachment://banner_roles.jpg')
                      .setDescription('Klik tombol di bawah untuk mendapatkan atau melepas role sesuai minatmu. Klik lagi untuk melepas.');
                  
                  const components = [];
                  for (let i = 0; i < roles.length; i += 5) {
                      const chunk = roles.slice(i, i + 5);
                      const row = new ActionRowBuilder().addComponents(
                          chunk.map(r => new ButtonBuilder().setCustomId(r.id).setLabel(r.name).setStyle(r.style || ButtonStyle.Primary).setEmoji(r.emoji))
                      );
                      components.push(row);
                  }
                  await roleCh.send({ files: [{ attachment: './assets/banner_roles.jpg', name: 'banner_roles.jpg' }], embeds: [embed], components }).catch(() => {});
              }
              
              return interaction.reply({ content: '🗑️ Role **' + name + '** berhasil dihapus dari tombol!', flags: 64 });
          }
      }
`;

if (!code.includes("commandName === 'kelolarole'")) {
    code = code.replace("if (interaction.isChatInputCommand() && interaction.commandName === 'vc') {", kelolaRoleHandler + "\n      if (interaction.isChatInputCommand() && interaction.commandName === 'vc') {");
    fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
    console.log('Added kelolarole handler');
} else {
    console.log('kelolarole handler already exists');
}
