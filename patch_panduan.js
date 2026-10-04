const fs = require('fs');

let code = fs.readFileSync('D:\\discord_bot\\bot.js', 'utf8');

const oldPanduan = `            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('PANDUAN LENGKAP PENGGUNAAN BOT')
                .setDescription('Selamat datang! Berikut adalah daftar bot yang tersedia beserta fungsinya.')
                .addFields(
                    { name: '1. ASISTEN AI (Bot Utama)', value: 'Cara ngobrol: ketik di #tanya-ai, !tanya [pertanyaan], atau @Asisten AI [pertanyaan]\\n!speedtest - Cek kecepatan internet\\n!ping - Cek latensi\\n!rank [@user] - Cek level XP\\n!info [@user] - Info profil member\\n!settanggallahir DD-MM - Daftar ulang tahun\\n!invitebots - Daftar link bot populer\\n!setup - (Admin) Setup server\\n!updatepanduan - (Admin) Update panduan\\n!updateaturan - (Admin) Update aturan\\n!setuptiket - (Admin) Aktifkan sistem tiket', inline: false },
                    { name: '2. JOCKIE MUSIC (Musik)', value: 'm!play [lagu] - Putar lagu\\nm!skip - Skip lagu\\nm!stop - Stop musik\\nm!queue - Lihat antrian', inline: false },
                    { name: '3. PROBOT (Moderasi)', value: '/rank - Lihat kartu level\\n/top - Leaderboard server', inline: false },
                    { name: '4. MUDAE & DANK MEMER (Game)', value: 'Mudae: $w $m $h untuk roll karakter\\nDank Memer: /pls beg /pls hunt', inline: false }
                )
                .setFooter({ text: 'Gunakan command di #bot-command agar chat general tetap rapi!' })
                .setTimestamp();`;

const newPanduan = `            const embed1 = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('PANDUAN LENGKAP PENGGUNAAN BOT')
                .setDescription('Selamat datang! Berikut adalah panduan lengkap semua fitur yang tersedia di server ini.')
                .addFields(
                    { name: '--- BOT BAWAAN SERVER ---', value: '\\u200b', inline: false },
                    { 
                        name: '1. ASISTEN AI (Bot Utama + Fitur Server)', 
                        value: '**Cara ngobrol dengan AI:**\\n' +
                               '- Ketik di channel #tanya-ai\\n' +
                               '- Ketik !tanya [pertanyaan] di channel mana pun\\n' +
                               '- Tag @Asisten AI [pertanyaan] di channel mana pun\\n\\n' +
                               '**Command Umum:**\\n' +
                               '!halo - Menyapa bot\\n' +
                               '!ping - Cek latensi bot\\n' +
                               '!speedtest - Cek kecepatan internet server\\n' +
                               '!rank [@user] - Cek level & XP kamu atau member lain\\n' +
                               '!info [@user] - Lihat profil lengkap seorang member\\n' +
                               '!settanggallahir DD-MM - Daftarkan tanggal lahir kamu\\n' +
                               '!invitebots - Tampilkan link undangan bot populer\\n\\n' +
                               '**Command Admin:**\\n' +
                               '!setup - Setup otomatis channel & role server\\n' +
                               '!updatepanduan - Perbarui panduan ini\\n' +
                               '!updateaturan - Perbarui aturan server\\n' +
                               '!setuptiket - Aktifkan sistem tiket dukungan',
                        inline: false 
                    },
                    { 
                        name: '2. SISTEM VERIFIKASI', 
                        value: 'Member baru wajib verifikasi sebelum bisa mengakses server.\\n\\n' +
                               '- Saat bergabung, kamu akan mendapat pesan di #verifikasi\\n' +
                               '- Klik tombol **Saya Setuju** untuk mendapatkan akses\\n' +
                               '- Setelah verifikasi, pilih gender di #general\\n' +
                               '- Role **Member** akan otomatis diberikan',
                        inline: false 
                    },
                    { 
                        name: '3. SISTEM LEVEL & XP', 
                        value: 'Aktif chat = dapat XP. Makin banyak chat, makin tinggi level!\\n\\n' +
                               '- Setiap pesan mendapat **15-25 XP** (cooldown 1 menit)\\n' +
                               '- Naik level = pengumuman di channel + role reward otomatis\\n' +
                               '- Level 5 = Role **Veteran**\\n' +
                               '- Level 10 = Role **Elite**\\n' +
                               '- Level 20 = Role **Legend**\\n' +
                               '- Ketik **!rank** untuk melihat progress kamu saat ini',
                        inline: false 
                    },
                    { 
                        name: '4. SISTEM TIKET', 
                        value: 'Butuh bantuan Admin? Buka tiket privat!\\n\\n' +
                               '- Pergi ke channel #tiket\\n' +
                               '- Klik tombol **Buka Tiket**\\n' +
                               '- Channel privat akan dibuat khusus untukmu & Admin\\n' +
                               '- Ketik **!tutuptiket** setelah masalah selesai',
                        inline: false 
                    },
                    { 
                        name: '5. SELAMAT ULANG TAHUN', 
                        value: 'Bot akan mengucapkan selamat ulang tahun secara otomatis!\\n\\n' +
                               '- Daftarkan tanggal lahirmu dengan: **!settanggallahir DD-MM**\\n' +
                               '- Contoh: !settanggallahir 17-08 (untuk 17 Agustus)\\n' +
                               '- Bot akan mengumumkan ulang tahunmu setiap tahun di #general',
                        inline: false 
                    },
                    { name: '--- BOT EKSTERNAL ---', value: '\\u200b', inline: false },
                    { 
                        name: '6. JOCKIE MUSIC (Pemutar Musik)', 
                        value: 'Masuk Voice Channel dulu sebelum menggunakan!\\n\\n' +
                               'm!play [judul lagu] - Putar lagu dari Spotify/YouTube\\n' +
                               'm!skip - Lewati lagu yang sedang diputar\\n' +
                               'm!stop - Hentikan musik & keluarkan bot\\n' +
                               'm!queue - Lihat daftar antrean lagu\\n' +
                               'm!pause - Jeda musik\\n' +
                               'm!resume - Lanjutkan musik',
                        inline: false 
                    },
                    { 
                        name: '7. PROBOT (Moderasi & Leveling)', 
                        value: 'Menjaga keamanan server dan sistem level ProBot.\\n\\n' +
                               '/rank - Lihat kartu level ProBot kamu\\n' +
                               '/top - Lihat leaderboard member paling aktif\\n' +
                               '/warnings - Lihat daftar peringatan (Mod only)',
                        inline: false 
                    },
                    { 
                        name: '8. MUDAE & DANK MEMER (Minigame)', 
                        value: '**Mudae (Koleksi Karakter Anime):**\\n' +
                               '$w / $m / $h - Roll karakter secara acak\\n' +
                               '$marry [nama] - Nikahi karakter\\n\\n' +
                               '**Dank Memer (Ekonomi Virtual):**\\n' +
                               '/pls beg - Minta koin\\n' +
                               '/pls hunt - Berburu binatang\\n' +
                               '/pls fish - Memancing\\n' +
                               '/pls bal - Cek saldo',
                        inline: false 
                    }
                )
                .setFooter({ text: 'Gunakan command di #bot-command agar chat #general tetap rapi! | Server dikelola oleh Asisten AI Bot' })
                .setTimestamp();
            const embed = embed1;`;

code = code.replace(oldPanduan, newPanduan);
fs.writeFileSync('D:\\discord_bot\\bot.js', code, 'utf8');
console.log('Panduan berhasil diperbarui menjadi 8 bagian!');
