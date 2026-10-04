const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Insert setInterval after aiCooldown declaration
const target1 = `const spamTracker   = new Map();
const aiCooldown    = new Map();`;

const replace1 = `const spamTracker   = new Map();
const aiCooldown    = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of xpCooldown) if (now - v > 3600000) xpCooldown.delete(k);
    for (const [k, v] of coinCooldown) if (now - v > 3600000) coinCooldown.delete(k);
    for (const [k, v] of aiCooldown) if (now - v > 3600000) aiCooldown.delete(k);
    for (const [k, v] of spamTracker) if (v?.length && now - v[v.length-1].time > 3600000) spamTracker.delete(k);
}, 3600000);`;

code = code.replace(target1, replace1);

// 2. Insert days in month validation after basic range check in !settanggallahir
const target2 = `        if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1]) || p[0]<1||p[0]>31||p[1]<1||p[1]>12)
            return message.reply('Format salah! Contoh: !settanggallahir 17-08');`;

const replace2 = `        if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1]) || p[0]<1||p[0]>31||p[1]<1||p[1]>12)
            return message.reply('Format salah! Contoh: !settanggallahir 17-08');
        const daysInMonth = new Date(2024, p[1], 0).getDate();
        if (p[0] > daysInMonth) return message.reply('Tanggal tidak valid untuk bulan tersebut!');`;

code = code.replace(target2, replace2);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('OK: both patches applied');
