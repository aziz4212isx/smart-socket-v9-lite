const fs = require('fs');

let bot = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

const bug4BeforeStr = "if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator) && msg !== '!refreshroles') return;";
const bug4AfterStr = "if (!message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) return message.reply('Hanya Administrator!');";

if (bot.includes(bug4BeforeStr)) {
    bot = bot.replace(bug4BeforeStr, bug4AfterStr);
    console.log("Bug 4 replaced!");
} else {
    console.log("Bug 4 NOT FOUND!");
}

const bug5BeforeStr = "    const g = client.guilds.cache.first();\r\n    if (g) {\r\n        await g.members.fetch();\r\n        setInterval(() => updateStats(g), 5 * 60 * 1000);\r\n    }\r\n});";

const bug5BeforeStrAlternative = "    const g = client.guilds.cache.first();\n    if (g) {\n        await g.members.fetch();\n        setInterval(() => updateStats(g), 5 * 60 * 1000);\n    }\n});";

const bug5AfterStr = `    const g = client.guilds.cache.first();
    if (g) {
        await g.members.fetch();
        setInterval(() => updateStats(g), 5 * 60 * 1000);

        giveawayData = load(FILES.giveaway);
        const now = Date.now();
        for (const [msgId, gw] of Object.entries(giveawayData)) {
            const remaining = gw.endsAt - now;
            if (remaining <= 0) {
                endGiveaway(msgId);
            } else {
                setTimeout(() => endGiveaway(msgId), remaining);
            }
        }
    }
});`;

if (bot.includes(bug5BeforeStr)) {
    bot = bot.replace(bug5BeforeStr, bug5AfterStr);
    console.log("Bug 5 replaced (CRLF)!");
} else if (bot.includes(bug5BeforeStrAlternative)) {
    bot = bot.replace(bug5BeforeStrAlternative, bug5AfterStr);
    console.log("Bug 5 replaced (LF)!");
} else {
    console.log("Bug 5 NOT FOUND!");
}

fs.writeFileSync('D:/discord_bot/bot.js', bot, 'utf8');
console.log("Saved bot.js!");
