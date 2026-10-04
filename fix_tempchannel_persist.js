const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Tambahkan temp_channels.json ke daftar FILES
code = code.replace(
    `    polls:    './polls_data.json'`,
    `    polls:    './polls_data.json',
    tempchs:  './temp_channels.json'`
);

// 2. Inisialisasi tempChannels dari file JSON saat startup (bukan Map kosong)
code = code.replace(
    `const tempChannels  = new Map(); // channelId -> ownerId`,
    `// Muat tempChannels dari file agar survive restart
const savedTempChs = load('./temp_channels.json');
const tempChannels  = new Map(Object.entries(savedTempChs)); // channelId -> ownerId`
);

// 3. Helper untuk simpan tempChannels ke file
const saveTempChHelper = `
function saveTempChannels() {
    const obj = {};
    for (const [k, v] of tempChannels) obj[k] = v;
    save('./temp_channels.json', obj);
}
`;
// Sisipkan setelah baris function ensureEco
code = code.replace(
    `function ensureEco(uid)     { if (!economyData[uid]) economyData[uid] = { coins: 0, lastDaily: 0 }; }`,
    `function ensureEco(uid)     { if (!economyData[uid]) economyData[uid] = { coins: 0, lastDaily: 0 }; }
${saveTempChHelper}`
);

// 4. Pada ready event: verifikasi channel yang tersimpan masih ada
const readyVerify = `
    // Verifikasi channel sementara yang tersimpan di file masih ada
    setTimeout(async () => {
        for (const [chId, ownerId] of tempChannels.entries()) {
            let found = false;
            for (const [, guild] of client.guilds.cache) {
                const ch = guild.channels.cache.get(chId);
                if (ch) { found = true; break; }
            }
            if (!found) {
                tempChannels.delete(chId);
                console.log('Temp channel ' + chId + ' sudah tidak ada, dihapus dari tracking.');
            }
        }
        saveTempChannels();
        console.log('TempChannels aktif setelah verifikasi: ' + tempChannels.size);
    }, 5000);
`;
code = code.replace(
    `    // ── Update stats setiap 10 menit ──`,
    readyVerify + `    // ── Update stats setiap 10 menit ──`
);

// 5. Saat channel dibuat: simpan ke file
code = code.replace(
    `            tempChannels.set(newCh.id, member.id);
            await sendControlPanel(member, newCh);`,
    `            tempChannels.set(newCh.id, member.id);
            saveTempChannels();
            await sendControlPanel(member, newCh);`
);

// 6. Saat channel dihapus: hapus dari file
code = code.replace(
    `        if (oldState.channel.members.size === 0) {
            await oldState.channel.delete('Temporary channel kosong').catch(() => {});
            tempChannels.delete(oldState.channel.id);
        }`,
    `        if (oldState.channel.members.size === 0) {
            await oldState.channel.delete('Temporary channel kosong').catch(() => {});
            tempChannels.delete(oldState.channel.id);
            saveTempChannels();
        }`
);

// 7. Saat transfer: simpan ulang
code = code.replace(
    `            tempChannels.set(vcId, t.id);
            await vcCh.permissionOverwrites.edit(t.id`,
    `            tempChannels.set(vcId, t.id);
            saveTempChannels();
            await vcCh.permissionOverwrites.edit(t.id`
);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');

// Buat file temp_channels.json jika belum ada
if (!fs.existsSync('D:/discord_bot/temp_channels.json')) {
    fs.writeFileSync('D:/discord_bot/temp_channels.json', '{}', 'utf8');
}

console.log('Fix tempChannels persistence berhasil! Bot akan ingat channel sementara setelah restart.');
