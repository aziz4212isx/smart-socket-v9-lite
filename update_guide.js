const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// The original string we want to replace
const oldText = "{ name: '1. ASISTEN AI', value: 'Chat di #tanya-ai, !tanya [pertanyaan], atau @Asisten AI\\n!ping, !speedtest, !rank, !info, !settanggallahir, !invitebots\\n!afk [alasan] - Set status AFK\\n!saldo, !daily, !transfer, !leaderboard, !shop, !beli - Economy\\n!poll [pertanyaan]|[opsi1]|[opsi2] - Buat voting\\n!giveaway [menit] [hadiah] - Buat giveaway (Admin)\\n!warn, !warns, !clearwarn - Peringatan (Admin/Mod)\\n!setup, !cleanup, !setuproles, !setuptiket, !updatepanduan, !updateaturan (Admin)' }";

// The new string containing Slash Commands
const newText = "{ name: '1. ASISTEN AI & FITUR SERVER', value: 'Chat dengan AI: /tanya [pertanyaan] atau @Asisten AI\\n\\n**Slash Commands (Ketik /)**:\\n/rank, /info - Cek Profil\\n/saldo, /daily, /transfer, /shop, /beli - Ekonomi\\n/giveaway, /poll, /afk - Interaksi\\n\\n**Command Admin (!)**:\\n!warn, !warns, !clearwarn - Moderasi\\n!setup, !updatepanduan, !updateaturan - Konfigurasi Server' }";

if (code.includes(oldText)) {
    code = code.replace(oldText, newText);
    fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
    console.log('Bot guide updated successfully!');
} else {
    // Fallback if formatting is slightly different
    console.log('Exact string not found. Using regex replacement.');
    code = code.replace(/\{ name: '1\. ASISTEN AI', value: 'Chat di #tanya-ai, \!tanya.*?\(Admin\)' \}/s, newText);
    fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
    console.log('Bot guide updated via regex!');
}
