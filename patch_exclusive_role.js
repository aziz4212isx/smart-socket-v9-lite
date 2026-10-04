const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const target = `          } else {
              await member.roles.add(role).catch(() => {});
              await updateNickname(member, roleName);
              return interaction.reply({ content: 'Role **' + role.name + '** diberikan! ✅', flags: 64 });
          }`;

const replace = `          } else {
              // Hapus role pilihan lain sebelum memasang yang baru (agar tidak dobel / pindah role)
              const managedRoles = roles.map(r => r.name);
              const rolesToRemove = member.roles.cache.filter(r => managedRoles.includes(r.name) && r.id !== role.id);
              if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove).catch(() => {});

              await member.roles.add(role).catch(() => {});
              await updateNickname(member, roleName);
              return interaction.reply({ content: 'Role **' + role.name + '** diberikan! ✅', flags: 64 });
          }`;

code = code.replace(target, replace);
fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Saved bot.js with exclusive role fix');
