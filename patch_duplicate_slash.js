const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');
let lines = code.split('\n');

// 1. Fix logic in !clearrole (and we'll also fix /clearrole if it exists before deleting, though it's redundant)
const target = `            let oldName = '';
            while (oldName !== baseName) {
                oldName = baseName;
                if (baseName.includes('|')) baseName = baseName.substring(baseName.indexOf('|') + 1).trim();
                baseName = baseName.replace(/^\\[(?!AFK\\]).*?\\]\\s*/i, '').trim();
            }`;

const replace = `            if (baseName.includes('|')) baseName = baseName.split('|')[1].trim();
            baseName = baseName.replace(/^\\[.*?\\]\\s*/, '').trim();`;

code = code.split(target).join(replace); // Replace all occurrences

// Now split back to lines for block deletion
lines = code.split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("else if (interaction.isChatInputCommand() && interaction.commandName === 'clearrole') {")) {
        if (startIdx === -1) startIdx = i;
    }
    if (lines[i].includes("else if (interaction.isChatInputCommand() && interaction.commandName === 'afk') {")) {
        // Find the end of this block
        for (let j = i; j < lines.length; j++) {
            if (lines[j].includes("return interaction.reply({ content: 'Status AFK kamu telah diset.")) {
                // The closing brace is on the next line
                endIdx = j + 1;
                break;
            }
        }
    }
}

if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    console.log(`Removing duplicated slash commands from line ${startIdx + 1} to ${endIdx + 1}`);
    lines.splice(startIdx, endIdx - startIdx + 1);
} else {
    console.error('Could not find boundaries for duplicated slash commands!');
    console.log('startIdx:', startIdx, 'endIdx:', endIdx);
}

fs.writeFileSync('D:/discord_bot/bot.js', lines.join('\n'), 'utf8');
console.log('Done.');
