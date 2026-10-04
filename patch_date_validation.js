const fs = require('fs');
let lines = fs.readFileSync('D:/discord_bot/bot.js', 'utf8').split('\n');
let inserted = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("return message.reply('Format salah! Contoh: !settanggallahir 17-08');")) {
        // Insert after this line
        lines.splice(i + 1, 0,
            "        const daysInMonth = new Date(2024, p[1], 0).getDate();",
            "        if (Number(p[0]) > daysInMonth)",
            "            return message.reply('Tanggal tidak valid untuk bulan tersebut!');"
        );
        inserted = true;
        break; // Only do it once
    }
}

if (!inserted) {
    console.error("Failed to find target line in bot.js");
    process.exit(1);
}

fs.writeFileSync('D:/discord_bot/bot.js', lines.join('\n'), 'utf8');
console.log("Successfully inserted daysInMonth check");
