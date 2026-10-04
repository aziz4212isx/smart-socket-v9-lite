const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
let lines = code.split('\n');

const clearRoleIdx = lines.findIndex(l => l.includes("else if (interaction.isChatInputCommand() && interaction.commandName === 'clearrole') {"));
if (clearRoleIdx !== -1) {
    lines.splice(clearRoleIdx, 0, '}');
    console.log('Inserted } at line ' + (clearRoleIdx + 1));
} else {
    console.log('Could not find clearrole');
}

const roleIdIdx = lines.findIndex(l => l.includes("if (customId.startsWith('role_')) {"));
if (roleIdIdx !== -1) {
    // We expect the line right before role_ check to be }
    if (lines[roleIdIdx - 1].trim() === '}') {
        lines.splice(roleIdIdx - 1, 1);
        console.log('Removed } before role_ check');
    } else {
        console.log('Line before role_ is not }:', lines[roleIdIdx - 1]);
    }
} else {
    console.log('Could not find role_ check');
}

fs.writeFileSync('D:/discord_bot/bot.js', lines.join('\n'), 'utf8');
console.log('Saved bot.js');
