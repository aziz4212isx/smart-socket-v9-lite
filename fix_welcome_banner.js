const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// Fix 1: Replace welcome message imgur with local banner
code = code.replace(
    ".setImage('https://i.imgur.com/wSTFkRM.gif')",
    ".setImage('attachment://banner_welcome.jpg')"
);

// Fix 2: Update the generalCh.send to include the welcome banner file
code = code.replace(
    "if (generalCh) await generalCh.send({ embeds: [welcomeEmbed] });",
    "if (generalCh) await generalCh.send({ files: [{ attachment: './assets/banner_welcome.jpg', name: 'banner_welcome.jpg' }], embeds: [welcomeEmbed] });"
);

// Fix 3: Ensure aturan banner is included in the send
// updateaturan: find the send that has banner_aturan in setImage but not in files
// Let's look for the aturan send and add files if missing
if (!code.includes("banner_aturan.jpg', name: 'banner_aturan")) {
    code = code.replace(
        "await ch.send({ files: [{ attachment: './assets/banner_aturan.jpg', name: 'banner_aturan.jpg' }], embeds: [embed] });\n        if (message.channel.id !== ch.id) await message.channel.send",
        "await ch.send({ files: [{ attachment: './assets/banner_aturan.jpg', name: 'banner_aturan.jpg' }], embeds: [embed] });\n        if (message.channel.id !== ch.id) await message.channel.send"
    );
    // If that block doesn't exist yet, inject it
    if (!code.includes("'./assets/banner_aturan.jpg'")) {
        code = code.replace(
            "await ch.send({ embeds: [embed] });\n        if (message.channel.id !== ch.id) await message.channel.send('<@' + uid + '> Aturan di",
            "await ch.send({ files: [{ attachment: './assets/banner_aturan.jpg', name: 'banner_aturan.jpg' }], embeds: [embed] });\n        if (message.channel.id !== ch.id) await message.channel.send('<@' + uid + '> Aturan di"
        );
        console.log('[FIX] Injected banner_aturan file attachment');
    }
}

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');

// Verify no more imgur links
const remaining = (code.match(/i\.imgur\.com/g) || []).length;
console.log('Remaining imgur links:', remaining, remaining === 0 ? '✅' : '❌');
const banners = (code.match(/assets\/banner_/g) || []).length;
console.log('Local banner references:', banners);
