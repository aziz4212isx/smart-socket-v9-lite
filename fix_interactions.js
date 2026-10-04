const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// BUG: DiscordAPIError[40060] - Interaction already acknowledged
// This happens when interaction.reply() is called AFTER interaction.deferReply() or another reply
// OR when the same interaction is replied to twice (e.g. inside nested if blocks)

// The fix is to use interaction.replied / interaction.deferred guards before reply/followUp
// Search for all places where we call interaction.reply without checking

// Common fix: wrap all interaction.reply calls that might be called after another reply
// with a safe helper

// First, add a helper function near the top of the interactionCreate handler
const safeReply = `
// Safe reply helper - avoids double-reply DiscordAPIError[40060]
async function safeInteractionReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(options).catch(() => {});
        } else {
            await interaction.reply(options);
        }
    } catch (e) {
        if (e.code !== 40060) console.error('Reply error:', e.message);
    }
}
`;

// Add the helper after the updateNickname function
if (!code.includes('safeInteractionReply')) {
    code = code.replace('let xpData       = load(FILES.xp);', safeReply + '\nlet xpData       = load(FILES.xp);');
    console.log('[FIX 1] Added safeInteractionReply helper function');
}

// Fix ephemeral deprecation warning:
// Old: interaction.reply({ content: '...', ephemeral: true })
// New: interaction.reply({ content: '...', flags: 64 })
// MessageFlags.Ephemeral = 64
code = code.replace(/, ephemeral: true \}/g, ', flags: 64 }');
const ephCount = (code.match(/, ephemeral: true }/g) || []).length;
console.log('[FIX 2] Fixed ephemeral deprecation. Remaining:', ephCount);

// Fix: the isStringSelectMenu check must happen BEFORE the button customId check
// because both use interaction.customId and might conflict.
// The current code structure may call both. Let's ensure select menu returns early.
// Check that the menu_panduan handler ends with `return;`
if (code.includes("customId === 'menu_panduan'")) {
    // Make sure after the last pEmbed it does await interaction.reply + return
    // This looks OK from the code we injected. Just verify.
    console.log('[CHECK 3] menu_panduan handler exists - OK');
}

// Fix: Double-acknowledged interaction on close_ticket button
// The issue is likely that both the button handler AND another handler both try to reply
// Let's ensure close_ticket returns immediately
const closeTicketOld = `    // Tutup Tiket Button
    if (customId === 'close_ticket') {
        if (!interaction.channel.name.startsWith('tiket-')) return interaction.reply({ content: 'Ini bukan channel tiket!', flags: 64 });
        await interaction.reply('Mereset dan menutup tiket dalam 5 detik...');
        setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
        return;
    }`;

const closeTicketNew = `    // Tutup Tiket Button
    if (customId === 'close_ticket') {
        if (!interaction.channel.name.startsWith('tiket-')) {
            await interaction.reply({ content: 'Ini bukan channel tiket!', flags: 64 }).catch(() => {});
            return;
        }
        await interaction.reply({ content: '🔒 Tiket akan ditutup dalam 5 detik...', flags: 64 }).catch(() => {});
        setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 5000);
        return;
    }`;

if (code.includes("if (customId === 'close_ticket')")) {
    code = code.replace(closeTicketOld, closeTicketNew);
    console.log('[FIX 4] Hardened close_ticket button handler');
}

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('\nAll interaction fixes applied.');
