const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

code = code.replace(/\?\? Kamu sekarang AFK:/g, '✅ Kamu sekarang AFK:');
code = code.replace(/\?\? Saldoum saat ini:/g, '💰 Saldo kamu saat ini:');
code = code.replace(/\?\? Kamu sudah ambil daily/g, '❌ Kamu sudah ambil daily');
code = code.replace(/\?\? Kamu mendapat/g, '🎉 Kamu mendapat');
code = code.replace(/\?\? Berhasil transfer/g, '✅ Berhasil transfer');
code = code.replace(/\?\? Toko Role Koin/g, '🛒 Toko Role Koin');
code = code.replace(/\?\? Berhasil membeli role/g, '✅ Berhasil membeli role');
code = code.replace(/\?\? GIVEAWAY:/g, '🎉 GIVEAWAY:');
code = code.replace(/Klik \?\? untuk ikut!/g, 'Klik 🎉 untuk ikut!');
code = code.replace(/await msg\.react\('\?\?'\)/g, "await msg.react('🎉')");
code = code.replace(/const emojis = \['1\?\?', '2\?\?', '3\?\?', '4\?\?'\];/g, "const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];");
code = code.replace(/\.setTitle\('\?\? ' \+ q\)/g, ".setTitle('📊 ' + q)");

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('Fixed Emojis');
