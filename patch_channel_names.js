const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const replacements = {
    "'INFORMASI'": "'📌 INFORMASI'",
    "'ARTIFICIAL INTELLIGENCE'": "'🤖 ARTIFICIAL INTELLIGENCE'",
    "'OBROLAN UMUM'": "'💬 OBROLAN UMUM'",
    "'VOICE CHANNELS'": "'🔊 VOICE CHANNELS'",
    
    "'verifikasi'": "'✅-verifikasi'",
    "'aturan'": "'📜-aturan'",
    "'pengumuman'": "'📢-pengumuman'",
    "'panduan-bot'": "'📖-panduan-bot'",
    "'log-server'": "'📝-log-server'",
    "'pilih-role'": "'🎭-pilih-role'",
    "'tanya-ai'": "'🤖-tanya-ai'",
    "'general'": "'💬-general'",
    "'bot-command'": "'⚙️-bot-command'",
    "'media'": "'🖼️-media'",
    "'Lounge'": "'🎧 Lounge'"
};

// Note: for 'tiket', we only want to replace EXACT matches of 'tiket', not 'tiket-'
// Because string literals are usually "'tiket'", replacing "'tiket'" exactly is safe.
// 'tiket-' + username is written as "'tiket-'" in code, so replacing "'tiket'" won't affect "'tiket-'".
replacements["'tiket'"] = "'🎫-tiket'";

for (const [oldStr, newStr] of Object.entries(replacements)) {
    code = code.split(oldStr).join(newStr);
}

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('OK: Replaced all channel and category names.');
