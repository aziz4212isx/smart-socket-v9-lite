const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Add roles_data.json helper
const rolesHelperCode = `
const ROLES_FILE = './roles_data.json';
const DEFAULT_ROLES = [
    { id: 'role_gamer', name: 'Gamer', emoji: '🎮', style: ButtonStyle.Primary },
    { id: 'role_musik', name: 'Pecinta Musik', emoji: '🎵', style: ButtonStyle.Primary },
    { id: 'role_kreator', name: 'Kreator', emoji: '🎨', style: ButtonStyle.Primary },
    { id: 'role_pelajar', name: 'Pelajar', emoji: '📚', style: ButtonStyle.Success },
    { id: 'role_kompetitif', name: 'Kompetitif', emoji: '🏆', style: ButtonStyle.Danger }
];
function loadRoles() {
    if (!fs.existsSync(ROLES_FILE)) return DEFAULT_ROLES;
    try { return JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8')); } catch { return DEFAULT_ROLES; }
}
function saveRoles(roles) {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2), 'utf8');
}
`;

if (!code.includes("const ROLES_FILE")) {
    code = code.replace("const FILES = {", rolesHelperCode + "\nconst FILES = {");
}

// 2. Replace !setuproles
const oldSetupRolesStart = code.indexOf("if (msg === '!setuproles') {");
const oldSetupRolesEnd = code.indexOf("return message.reply('Pesan pilihan role berhasil dikirim", oldSetupRolesStart) + 70;
const oldSetupRolesFull = code.substring(oldSetupRolesStart, oldSetupRolesEnd + 5);

const newSetupRoles = `if (msg === '!setuproles' || msg === '!refreshroles') {
          if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator) && msg !== '!refreshroles') return;
          const roleCh = message.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
          if (!roleCh) return;
          
          const roleChFetched = await roleCh.messages.fetch({ limit: 20 });
          const roleChDel = roleChFetched.filter(m => m.author.id === client.user.id);
          if (roleChDel.size > 1) await roleCh.bulkDelete(roleChDel).catch(() => {});
          else if (roleChDel.size === 1) await roleChDel.first().delete().catch(() => {});
          
          const embed  = new EmbedBuilder().setColor(0x5865F2).setTitle('Pilih Role Minatmu').setImage('attachment://banner_roles.jpg')
              .setDescription('Klik tombol di bawah untuk mendapatkan atau melepas role sesuai minatmu. Klik lagi untuk melepas.');
          
          const roles = loadRoles();
          const components = [];
          for (let i = 0; i < roles.length; i += 5) {
              const chunk = roles.slice(i, i + 5);
              const row = new ActionRowBuilder().addComponents(
                  chunk.map(r => new ButtonBuilder().setCustomId(r.id).setLabel(r.name).setStyle(r.style || ButtonStyle.Primary).setEmoji(r.emoji))
              );
              components.push(row);
          }
          
          await roleCh.send({ files: [{ attachment: './assets/banner_roles.jpg', name: 'banner_roles.jpg' }], embeds: [embed], components }).catch(() => {});
          if (msg === '!setuproles') return message.reply('Pesan pilihan role berhasil dikirim ke <#' + roleCh.id + '>!');
          return;
      }`;
code = code.replace(oldSetupRolesFull, newSetupRoles);

// 3. Replace Interaction customId.startsWith('role_')
const oldRoleClickStart = code.indexOf("if (customId.startsWith('role_')) {");
const oldRoleClickEnd = code.indexOf("return interaction.reply({ content: 'Role **' + role.name", oldRoleClickStart) + 120;
const oldRoleClickFull = code.substring(oldRoleClickStart, oldRoleClickEnd + 5);

const newRoleClick = `if (customId.startsWith('role_')) {
          const roles = loadRoles();
          const roleData = roles.find(r => r.id === customId);
          if (!roleData) return interaction.reply({ content: 'Role tidak ditemukan di database.', flags: 64 });
          const roleName = roleData.name;
          
          let role = guild.roles.cache.find(r => r.name === roleName);
          if (!role) role = await guild.roles.create({ name: roleName, reason: 'Reaction role' }).catch(() => null);
          if (!role) return interaction.reply({ content: 'Gagal membuat role.', flags: 64 });
          
          if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role).catch(() => {});
              // Hilangkan prefix jika dilepas
              if (member.manageable) {
                  const prefix = roleData.emoji + ' ' + (roleName.split(' ')[0] || roleName);
                  if (member.nickname && member.nickname.startsWith(prefix)) {
                      await member.setNickname(member.nickname.replace(prefix + ' | ', '')).catch(() => {});
                  }
              }
              return interaction.reply({ content: 'Role **' + role.name + '** dilepas! 🗑️', flags: 64 });
          } else {
              await member.roles.add(role).catch(() => {});
              await updateNickname(member, roleName);
              return interaction.reply({ content: 'Role **' + role.name + '** diberikan! ✅', flags: 64 });
          }
      }`;
code = code.replace(oldRoleClickFull, newRoleClick);

// 4. Handle /kelolarole interaction
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
              
              // Trigger refresh via emit messageCreate or just call the logic
              const roleCh = interaction.guild.channels.cache.find(c => c.name === 'pilih-role' && c.type === ChannelType.GuildText);
              if (roleCh) {
                  // Simulate !refreshroles
                  client.emit('messageCreate', { content: '!refreshroles', guild: interaction.guild, member: interaction.member, channel: interaction.channel });
              }
              
              return interaction.reply({ content: '✅ Role **' + name + '** berhasil ditambahkan! Tombol di #pilih-role otomatis diupdate.', flags: 64 });
          }
          
          if (sub === 'hapus') {
              const name = interaction.options.getString('nama');
              const idx = roles.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
              if (idx === -1) return interaction.reply({ content: 'Role tidak ditemukan!', flags: 64 });
              
              roles.splice(idx, 1);
              saveRoles(roles);
              
              // Simulate !refreshroles
              client.emit('messageCreate', { content: '!refreshroles', guild: interaction.guild, member: interaction.member, channel: interaction.channel });
              
              return interaction.reply({ content: '🗑️ Role **' + name + '** berhasil dihapus dari tombol!', flags: 64 });
          }
      }
`;
if (!code.includes("commandName === 'kelolarole'")) {
    code = code.replace("if (interaction.isChatInputCommand() && interaction.commandName === 'vc') {", kelolaRoleHandler + "\n      if (interaction.isChatInputCommand() && interaction.commandName === 'vc') {");
}

// 5. Update updateNickname to use dynamic roles + static roles
const oldUpdateNickStart = code.indexOf("async function updateNickname(member, roleName) {");
const oldUpdateNickEnd = code.indexOf("await member.setNickname(prefix + ' | ' + baseName).catch(() => {});", oldUpdateNickStart) + 70;
const oldUpdateNickFull = code.substring(oldUpdateNickStart, oldUpdateNickEnd + 5);

const newUpdateNick = `async function updateNickname(member, roleName) {
      if (!member || !member.manageable) return; 
      
      const roles = loadRoles();
      let prefix = '';
      
      // Cek static roles
      const staticMap = {
          'VIP': '🌟 VIP',
          'Admin': '🛡️ Admin'
      };
      
      if (staticMap[roleName]) {
          prefix = staticMap[roleName];
      } else {
          // Cari di dynamic roles
          const dynamicRole = roles.find(r => r.name === roleName);
          if (dynamicRole) prefix = dynamicRole.emoji + ' ' + (dynamicRole.name.split(' ')[0]);
      }
      
      if (!prefix) return;

      let baseName = member.nickname || member.user.username;
      if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
      
      // Hindari duplikat emoji
      baseName = baseName.replace(/^[\\u2700-\\u27BF\\uE000-\\uF8FF\\uD83C-\\uD83E][\\uDC00-\\uDFFF]\\s*[A-Za-z0-9_]+\\s*/, '').trim();

      await member.setNickname(prefix + ' | ' + baseName).catch(() => {});
  }`;
code = code.replace(oldUpdateNickFull, newUpdateNick);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Successfully patched bot.js for Dynamic Roles!');
