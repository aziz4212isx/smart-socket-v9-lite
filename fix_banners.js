const fs = require('fs');
const path = require('path');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Replace all .setImage() with imgur URLs to use local file attachments instead.
// Discord.js supports: files: [{ attachment: './path', name: 'file.jpg' }]
// and embed.setImage('attachment://file.jpg')

// Pattern: .setImage('https://i.imgur.com/G4Yl36u.gif')  -> panduan
// Pattern: .setImage('https://i.imgur.com/4qK4WcE.gif')  -> aturan
// Pattern: .setImage('https://i.imgur.com/rM5L32x.gif')  -> roles
// Pattern: .setImage('https://i.imgur.com/KqZcK91.gif')  -> tiket

// Replace each imgur image with attachment reference
code = code.replace(/\.setImage\('https:\/\/i\.imgur\.com\/G4Yl36u\.gif'\)/g, ".setImage('attachment://banner_panduan.jpg')");
code = code.replace(/\.setImage\('https:\/\/i\.imgur\.com\/4qK4WcE\.gif'\)/g, ".setImage('attachment://banner_aturan.jpg')");
code = code.replace(/\.setImage\('https:\/\/i\.imgur\.com\/rM5L32x\.gif'\)/g, ".setImage('attachment://banner_roles.jpg')");
code = code.replace(/\.setImage\('https:\/\/i\.imgur\.com\/KqZcK91\.gif'\)/g, ".setImage('attachment://banner_tiket.jpg')");

// Now fix all send() calls that use these embeds to include files: []
// For !updatepanduan
code = code.replace(
    "await ch.send({ embeds: [embed], components: [panduanRow] });",
    "await ch.send({ files: [{ attachment: './assets/banner_panduan.jpg', name: 'banner_panduan.jpg' }], embeds: [embed], components: [panduanRow] });"
);

// For !updateaturan (embed has banner_aturan)
code = code.replace(
    "await ch.send({ embeds: [embed] });\n        if (message.channel.id !== ch.id) await message.channel.send",
    "await ch.send({ files: [{ attachment: './assets/banner_aturan.jpg', name: 'banner_aturan.jpg' }], embeds: [embed] });\n        if (message.channel.id !== ch.id) await message.channel.send"
);

// For !setuproles
code = code.replace(
    "await roleCh.send({ embeds: [embed], components: [row] }).catch(() => {});",
    "await roleCh.send({ files: [{ attachment: './assets/banner_roles.jpg', name: 'banner_roles.jpg' }], embeds: [embed], components: [row] }).catch(() => {});"
);

// For !setuptiket
code = code.replace(
    "await ch.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(\n            new ButtonBuilder().setCustomId('buka_tiket').setLabel('Buka Tiket').setStyle(ButtonStyle.Primary).setEmoji('🎫')\n        )]});",
    "await ch.send({ files: [{ attachment: './assets/banner_tiket.jpg', name: 'banner_tiket.jpg' }], embeds: [embed], components: [new ActionRowBuilder().addComponents(\n            new ButtonBuilder().setCustomId('buka_tiket').setLabel('Buka Tiket').setStyle(ButtonStyle.Primary).setEmoji('🎫')\n        )]});"
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Updated all embeds to use local banner images as file attachments');

// Verify
const remaining = (code.match(/i\.imgur\.com/g) || []).length;
console.log('Remaining imgur links:', remaining);

const attachCount = (code.match(/assets\/banner_/g) || []).length;
console.log('Local banner references:', attachCount);
