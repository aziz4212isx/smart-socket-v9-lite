const fs = require('fs');
let code = fs.readFileSync('D:\\discord_bot\\bot.js', 'utf8');

// Cek apakah fs sudah di-require
const hasFsRequire = code.startsWith("const fs = require('fs')") || code.includes("\nconst fs = require('fs')");
console.log('fs require ada:', hasFsRequire);

// Jika belum ada, tambahkan di baris pertama
if (!hasFsRequire) {
    code = "const fs = require('fs');\n" + code;
    fs.writeFileSync('D:\\discord_bot\\bot.js', code, 'utf8');
    console.log('fs require ditambahkan ke bot.js!');
} else {
    console.log('fs sudah ada, tidak perlu diubah.');
}
