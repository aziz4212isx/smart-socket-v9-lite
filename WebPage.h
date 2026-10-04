// WebPage.h - HTML Dashboard disimpan di FLASH (PROGMEM)
// Versi LITE ADVANCED: Sederhana, Ringan, namun penuh fitur cerdas (Per-Relay Matrix)

#ifndef WEBPAGE_H
#define WEBPAGE_H

#include <pgmspace.h>

const char htmlHomePage[] PROGMEM = R"=====(
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0f172a">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>">
    <title>Smart Socket LITE ADVANCED</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --bg-dark: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --card-border: rgba(255, 255, 255, 0.1);
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }

        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            background-image: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%);
            min-height: 100vh;
        }

        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 {
            margin: 0; font-size: 2rem;
            background: -webkit-linear-gradient(#60a5fa, #3b82f6);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .glass-panel {
            background: var(--card-bg); backdrop-filter: blur(10px);
            border: 1px solid var(--card-border); border-radius: 16px;
            padding: 20px; margin-bottom: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px; }
        .stat-box { background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
        .stat-value { font-size: 1.4rem; font-weight: bold; margin: 8px 0 4px 0; color: var(--primary); }
        .stat-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

        .grid-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
        .btn {
            width: 100%; padding: 12px; border: none; border-radius: 8px;
            font-size: 1rem; font-weight: 600; cursor: pointer; color: white;
            background: var(--primary); transition: opacity 0.2s;
        }
        .btn:hover { opacity: 0.9; }
        .btn-on { background: var(--success); }
        .btn-off { background: var(--danger); }
        .btn-warning { background: var(--warning); color: #000; }

        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 0.9rem; }
        .form-control {
            width: 100%; padding: 10px; background: rgba(15, 23, 42, 0.8);
            border: 1px solid var(--card-border); border-radius: 6px;
            color: white; box-sizing: border-box;
        }
        
        .alert-banner {
            display: none; background: var(--danger); color: white;
            padding: 12px; border-radius: 8px; text-align: center;
            font-weight: bold; margin-bottom: 15px; transition: all 0.3s;
        }

        .tabs { display: flex; border-bottom: 1px solid var(--card-border); margin-bottom: 20px; position: sticky; top: 0; background: rgba(15,23,42,0.9); z-index: 10; padding-top: 10px; backdrop-filter: blur(10px); }
        .tab-btn { background: none; border: none; color: var(--text-muted); padding: 10px 20px; cursor: pointer; font-size: 1rem; font-weight: 600; }
        .tab-btn.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { padding: 10px; text-align: center; border-bottom: 1px solid var(--card-border); font-size: 0.9rem; }
        th:first-child, td:first-child { text-align: left; }
        th { color: var(--text-muted); }

        #toast-container { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .toast { min-width: 250px; color: #fff; text-align: center; border-radius: 8px; padding: 12px; font-size: 0.9rem; box-shadow: 0 4px 6px rgba(0,0,0,0.3); animation: fadein 0.3s, fadeout 0.3s 2.5s forwards; }
        .toast-success { background: var(--success); }
        .toast-error { background: var(--danger); }
        .toast-info { background: var(--primary); }
        @keyframes fadein { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeout { from { opacity: 1; } to { opacity: 0; } }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); z-index: 2000; display: none; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.2s; }
        .modal-overlay.show { display: flex; opacity: 1; }
        .modal-content { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; width: 90%; max-width: 350px; text-align: center; transform: scale(0.9); transition: transform 0.2s; }
        .modal-overlay.show .modal-content { transform: scale(1); }
        .modal-btn-group { display: flex; gap: 10px; margin-top: 15px; justify-content: center; }
        
        .prog-bg { width: 100%; background: rgba(0,0,0,0.3); border-radius: 4px; height: 6px; margin-top: 8px; overflow: hidden; }
        .prog-bar { height: 100%; width: 0%; background: var(--success); transition: width 0.5s ease, background 0.3s ease; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s linear infinite; margin-right: 5px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
            .grid-stats { grid-template-columns: repeat(2, 1fr); }
            th, td { padding: 5px; font-size: 0.8rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Smart Socket LITE <span style="color:#fbbf24; font-size: 1rem;">ADVANCED</span></h1>
            <p style="color: var(--text-muted); margin-top: 5px;">Sistem Monitoring Cepat, Cerdas & Stabil <span id="connIndicator" style="font-size:0.7rem; color:var(--text-muted)">🔴 Offline</span></p>
        </div>

        <div id="toast-container"></div>
        
        <div id="customModal" class="modal-overlay">
            <div class="modal-content">
                <h3 id="modalTitle" style="margin-top:0">Konfirmasi</h3>
                <p id="modalBody" style="color:var(--text-muted); font-size: 0.9rem;"></p>
                <input type="number" id="modalInput" class="form-control" style="display:none; margin-bottom: 10px;">
                <div class="modal-btn-group">
                    <button class="btn btn-off" onclick="closeModal()">Batal</button>
                    <button class="btn btn-on" id="modalConfirmBtn">OK</button>
                </div>
            </div>
        </div>

        <div id="alertBanner" class="alert-banner">
            ⚠️ PERINGATAN SISTEM!
        </div>
        <div id="alertSaldo" class="alert-banner" style="background: var(--warning); color: #000;">
            ⚠️ PERINGATAN: Saldo Pulsa Hampir Habis!
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('dashboard')">📊 Dashboard</button>
            <button class="tab-btn" onclick="switchTab('smartfeat')">🧠 Fitur Cerdas</button>
            <button class="tab-btn" onclick="switchTab('settings')">⚙️ Pengaturan</button>
        </div>

        <!-- DASHBOARD TAB -->
        <div id="dashboard" class="tab-content active">
            <div class="glass-panel">
                <h3 style="margin-top:0">Statistik Listrik Real-time</h3>
                <div class="grid-stats">
                    <div class="stat-box">
                        <div class="stat-label">Tegangan</div>
                        <div class="stat-value" id="valVolt">0.0 V</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Arus</div>
                        <div class="stat-value" id="valAmp">0.00 A</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Daya Aktif</div>
                        <div class="stat-value" id="valWatt">&mdash; W</div>
                        <div class="prog-bg"><div class="prog-bar" id="progDaya"></div></div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Energi</div>
                        <div class="stat-value" id="valKwh">0.000 kWh</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Biaya (Estimasi)</div>
                        <div class="stat-value" id="valCost">Rp 0</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Power Factor</div>
                        <div class="stat-value" id="valPf">0.00</div>
                        <div id="pfQuality" style="font-size: 0.7rem; margin-top: 2px;">Normal</div>
                    </div>
                </div>
            </div>

            <div class="glass-panel">
                <h3 style="margin-top:0">Mode Pulsa & Saldo</h3>
                <div class="grid-stats" style="margin-bottom: 15px;">
                    <div class="stat-box">
                        <div class="stat-label">Status Pulsa</div>
                        <div class="stat-value" id="valMode">AKTIF</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Sisa Saldo</div>
                        <div class="stat-value" id="valSaldo" style="color: var(--warning)">&mdash;</div>
                        <div class="prog-bg"><div class="prog-bar" id="progSaldo" style="background:var(--warning)"></div></div>
                    </div>
                </div>
                <div class="grid-controls">
                    <button class="btn" onclick="apiAction('/api/togglepulsa', this, 'POST')">Toggle Mode Pulsa</button>
                    <button class="btn btn-warning" onclick="promptTopUp()">Top Up Saldo</button>
                </div>
            </div>
            
            <div class="glass-panel">
                <h3 style="margin-top:0">Kesehatan Sistem (ESP32)</h3>
                <div class="grid-stats" style="margin-bottom: 15px;">
                    <div class="stat-box">
                        <div class="stat-label">Suhu Internal</div>
                        <div class="stat-value" id="valEspTemp">0.0 &deg;C</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">CPU Freq</div>
                        <div class="stat-value" id="valEspCpu">0 MHz</div>
                    </div>
                    <div class="stat-box" style="grid-column: span 2;">
                        <div class="stat-label">Blackout Logger (Terakhir Nyala)</div>
                        <div class="stat-value" id="valBootTime" style="font-size: 1.1rem; color: var(--success);">-</div>
                    </div>
                </div>
            </div>

            <div class="glass-panel">
                <h3 style="margin-top:0">📈 History 7 Hari Terakhir</h3>
                <canvas id="chartHistory" height="80"></canvas>
            </div>

            <div class="glass-panel">
                <h3 style="margin-top:0">Kontrol Relay</h3>
                <div class="grid-controls">
                    <button id="btnRelay1" class="btn btn-off" onclick="apiAction('/api/toggle1', this, 'POST')">💡 Relay 1</button>
                    <button id="btnRelay2" class="btn btn-off" onclick="apiAction('/api/toggle2', this, 'POST')">💡 Relay 2</button>
                </div>
            </div>
        </div>

        <!-- SMART FEATURES TAB -->
        <div id="smartfeat" class="tab-content">
            <div class="glass-panel">
                <h3 style="margin-top:0">Fitur Cerdas (Konfigurasi Per-Relay)</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Pilih fitur mana yang akan aktif untuk masing-masing saklar.</p>
                <form onsubmit="saveAdvConfig(event)">
                    <div style="overflow-x: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama Fitur</th>
                                    <th><span class="lbl-r1">Relay 1</span></th>
                                    <th><span class="lbl-r2">Relay 2</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong style="color:var(--text-main)">Proteksi OVP/UVP PLN</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">Mati jika >240V / <190V</span></td>
                                    <td><input type="checkbox" id="f_ovp1" name="f_ovp1" value="1"></td>
                                    <td><input type="checkbox" id="f_ovp2" name="f_ovp2" value="1"></td>
                                </tr>
                                <tr>
                                    <td><strong style="color:var(--text-main)">Vampire Power Eliminator</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">Mati jika daya standby < 5W (15 mnt)</span></td>
                                    <td><input type="checkbox" id="f_vmp1" name="f_vmp1" value="1"></td>
                                    <td><input type="checkbox" id="f_vmp2" name="f_vmp2" value="1"></td>
                                </tr>
                                <tr>
                                    <td><strong style="color:var(--text-main)">Last-State Memory</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">Ingat posisi saklar saat listrik PLN mati</span></td>
                                    <td><input type="checkbox" id="f_mem1" name="f_mem1" value="1"></td>
                                    <td><input type="checkbox" id="f_mem2" name="f_mem2" value="1"></td>
                                </tr>
                                <tr>
                                    <td><strong style="color:var(--text-main)">Ping Watchdog Router</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">Restart relay jika internet RTO/Mati (5 mnt)</span></td>
                                    <td><input type="checkbox" id="f_png1" name="f_png1" value="1"></td>
                                    <td><input type="checkbox" id="f_png2" name="f_png2" value="1"></td>
                                </tr>
                                <tr>
                                    <td><strong style="color:var(--text-main)">Jam Malam (Parental Control)</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">Relay dipaksa mati pada rentang waktu di bawah</span></td>
                                    <td><input type="checkbox" id="f_jam1" name="f_jam1" value="1"></td>
                                    <td><input type="checkbox" id="f_jam2" name="f_jam2" value="1"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin-top:0; font-size: 0.9rem; color: var(--text-main);"><strong>🌙 Jadwal Mati (Jam Malam) Per Hari</strong></p>
                        <div style="overflow-x: auto;">
                        <table style="min-width: 450px;">
                            <thead>
                                <tr>
                                    <th>Hari</th>
                                    <th><span class="lbl-r1">Relay 1</span></th>
                                    <th><span class="lbl-r2">Relay 2</span></th>
                                </tr>
                            </thead>
                            <tbody id="jadwalTbody">
                            </tbody>
                        </table>
                        </div>
                        <button type="button" class="btn" style="margin-top:10px" onclick="saveJadwal(this)">Simpan Jadwal Saja</button>
                    </div>
                    
                    <div class="form-group">
                        <label>Pajak Penerangan Jalan (PPJ) dalam Persen (%)</label>
                        <input type="number" step="any" id="cfgPPJ" name="ppj" class="form-control" placeholder="Misal: 3 atau 10">
                    </div>
                    <div class="form-group">
                        <label>Kalibrasi Offset Tegangan (Volt)</label>
                        <input type="number" step="any" id="cfgVoff" name="v_off" class="form-control" placeholder="Misal: +2.5 atau -1.0">
                    </div>
                    
                    <button type="submit" class="btn">Simpan Fitur Cerdas</button>
                </form>
            </div>
            
            <div class="glass-panel">
                <h3 style="margin-top:0">Info Fitur Global (Otomatis Aktif)</h3>
                <ul style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
                    <li><strong>Hardware Watchdog (WDT):</strong> ESP32 akan merestart sistem otomatis jika mendeteksi freeze/hang dalam 15 detik.</li>
                    <li><strong>Proteksi Overheat:</strong> Jika suhu chip melampaui 75°C, relay akan otomatis mati untuk mencegah kerusakan/kebakaran.</li>
                    <li><strong>Smart Buzzer:</strong> Buzzer berbunyi 3 kali cepat (Warning) jika penggunaan daya listrik mencapai 90% dari Batas Trip Watt Anda.</li>
                </ul>
            </div>
        </div>

        <!-- SETTINGS TAB -->
        <div id="settings" class="tab-content">
            <div class="glass-panel">
                <h3 style="margin-top:0">Pengaturan Dasar / Proteksi</h3>
                <form onsubmit="saveConfig(event)">
                    <div class="form-group">
                        <label>Tarif Dasar per kWh (Rp)</label>
                        <input type="number" step="any" id="cfgTarif" name="tarif" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Batas Daya Trip (Watt) - Cegah Jepret</label>
                        <input type="number" step="any" id="cfgBatasW" name="batas_w" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Batas Arus Trip (Ampere)</label>
                        <input type="number" step="any" id="cfgBatasA" name="batas_a" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Batas Peringatan Saldo (Rp)</label>
                        <input type="number" step="any" id="cfgBatasSaldo" name="bts_sld_r" class="form-control" placeholder="Misal: 5000">
                    </div>
                    <div class="form-group">
                        <label>Nama/Label Relay 1</label>
                        <input type="text" id="cfgNamaR1" name="nama_r1" class="form-control" placeholder="Misal: Kulkas">
                    </div>
                    <div class="form-group">
                        <label>Nama/Label Relay 2</label>
                        <input type="text" id="cfgNamaR2" name="nama_r2" class="form-control" placeholder="Misal: Pompa Air">
                    </div>
                    <button type="submit" class="btn">Simpan Pengaturan</button>
                </form>
                
                <hr style="border: 1px solid var(--card-border); margin: 20px 0;">
                <h3 style="margin-top:0">Aksi Perangkat</h3>
                <div class="grid-controls">
                    <button class="btn btn-warning" onclick="apiAction('/api/kalibrasi', this, 'POST')">Reset KWh (Kalibrasi)</button>
                    <button class="btn btn-off" onclick="resetWifi()">Reset WiFi</button>
                </div>
            </div>
            
            <div class="glass-panel">
                <h3 style="margin-top:0; display:flex; justify-content:space-between; align-items:center;">
                    Jaringan WiFi
                    <button type="button" class="btn" style="width:auto; padding: 6px 12px; font-size: 0.85rem;" onclick="scanWifi()">🔍 Scan WiFi</button>
                </h3>
                <div id="wifiList" style="display:none; margin-bottom: 15px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px;">
                    Memindai...
                </div>
                <form onsubmit="saveWifi(event)">
                    <div class="form-group">
                        <label>WiFi SSID</label>
                        <input type="text" id="cfgSSID" name="ssid" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>WiFi Password</label>
                        <input type="password" id="cfgPass" name="pass" class="form-control">
                    </div>
                    <button type="submit" class="btn">Simpan & Restart</button>
                </form>
            </div>
        </div>
    </div>

    <script>
        function escapeHTML(str) {
            return str.replace(/[&<>'"]/g, 
                tag => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag]));
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            event.target.classList.add('active');
        }

        function showToast(msg, type='info') {
            const container = document.getElementById("toast-container");
            const toast = document.createElement("div");
            toast.className = `toast toast-${type}`;
            toast.innerText = msg;
            container.appendChild(toast);
            setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000);
        }

        function setBtnLoading(btn, isLoading) {
            if(!btn) return;
            if(isLoading) {
                btn.dataset.text = btn.innerHTML;
                btn.innerHTML = '<span class="spinner"></span> Tunggu...';
                btn.disabled = true;
            } else {
                btn.innerHTML = btn.dataset.text;
                btn.disabled = false;
            }
        }

        async function apiAction(url, btn = null, method = 'GET', body = null) {
            try {
                if(btn) setBtnLoading(btn, true);
                const opts = { method };
                if (body) {
                    opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
                    opts.body = body;
                }
                const res = await fetch(url, opts);
                const data = await res.json();
                if (data.message) {
                   if(res.ok) showToast(data.message, 'success');
                   else showToast(data.message, 'error');
                }
                fetchStatus();
            } catch (err) {
                console.error(err);
                showToast('Gagal komunikasi dengan perangkat', 'error');
            } finally {
                if(btn) setBtnLoading(btn, false);
            }
        }

        let modalCallback = null;
        function openModal(title, body, isInput, onConfirm) {
            document.getElementById('modalTitle').innerText = title;
            document.getElementById('modalBody').innerHTML = body;
            const input = document.getElementById('modalInput');
            if (isInput) { input.style.display = 'block'; input.value = ''; input.focus(); }
            else { input.style.display = 'none'; }
            modalCallback = onConfirm;
            document.getElementById('customModal').classList.add('show');
        }
        function closeModal() { document.getElementById('customModal').classList.remove('show'); }
        document.getElementById('modalConfirmBtn').onclick = () => {
            const val = document.getElementById('modalInput').value;
            closeModal();
            if (modalCallback) modalCallback(val);
        };

        function promptTopUp() {
            openModal("Top Up Saldo", "Masukkan nominal saldo (Rp):", true, (amount) => {
                if (amount && !isNaN(amount)) apiAction('/api/topup', null, 'POST', new URLSearchParams({ amount }).toString());
            });
        }
        
        async function resetTrip() {
            openModal("Reset Trip", "Anda yakin ingin mereset proteksi beban berlebih?", false, () => {
                apiAction('/api/resettrip', null, 'POST');
            });
        }

        async function resetWifi() {
            openModal("Reset WiFi", "Hapus konfigurasi WiFi dan mulai ulang perangkat?", false, () => {
                apiAction('/api/resetwifi', null, 'POST');
            });
        }

        function saveConfig(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            apiAction('/api/saveconfig', btn, 'POST', new URLSearchParams({
                tarif: document.getElementById('cfgTarif').value,
                batas_w: document.getElementById('cfgBatasW').value,
                batas_a: document.getElementById('cfgBatasA').value,
                bts_sld_r: document.getElementById('cfgBatasSaldo').value,
                nama_r1: document.getElementById('cfgNamaR1').value,
                nama_r2: document.getElementById('cfgNamaR2').value
            }).toString());
        }
        
        function saveAdvConfig(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const data = new URLSearchParams();
            data.append("ppj", document.getElementById('cfgPPJ').value);
            data.append("v_off", document.getElementById('cfgVoff').value);
            
            data.append("f_ovp1", document.getElementById('f_ovp1').checked ? "1" : "0");
            data.append("f_ovp2", document.getElementById('f_ovp2').checked ? "1" : "0");
            data.append("f_vmp1", document.getElementById('f_vmp1').checked ? "1" : "0");
            data.append("f_vmp2", document.getElementById('f_vmp2').checked ? "1" : "0");
            data.append("f_mem1", document.getElementById('f_mem1').checked ? "1" : "0");
            data.append("f_mem2", document.getElementById('f_mem2').checked ? "1" : "0");
            data.append("f_png1", document.getElementById('f_png1').checked ? "1" : "0");
            data.append("f_png2", document.getElementById('f_png2').checked ? "1" : "0");
            data.append("f_jam1", document.getElementById('f_jam1').checked ? "1" : "0");
            data.append("f_jam2", document.getElementById('f_jam2').checked ? "1" : "0");
            
            apiAction('/api/saveadv', btn, 'POST', data.toString());
        }

        function saveJadwal(btn) {
            let j_r1 = [], j_r2 = [];
            for(let i=0; i<7; i++) {
                let m1 = document.getElementById('jr1_m'+i).value; let s1 = document.getElementById('jr1_s'+i).value;
                let m2 = document.getElementById('jr2_m'+i).value; let s2 = document.getElementById('jr2_s'+i).value;
                
                let sm1 = m1 ? parseInt(m1.split(':')[0])*60 + parseInt(m1.split(':')[1]) : 0;
                let ss1 = s1 ? parseInt(s1.split(':')[0])*60 + parseInt(s1.split(':')[1]) : 0;
                let sm2 = m2 ? parseInt(m2.split(':')[0])*60 + parseInt(m2.split(':')[1]) : 0;
                let ss2 = s2 ? parseInt(s2.split(':')[0])*60 + parseInt(s2.split(':')[1]) : 0;

                j_r1.push({ a: document.getElementById('jr1_a'+i).checked, m: sm1, s: ss1 });
                j_r2.push({ a: document.getElementById('jr2_a'+i).checked, m: sm2, s: ss2 });
            }
            apiAction('/api/savejadwal', btn, 'POST', new URLSearchParams({ payload: JSON.stringify({j_r1, j_r2}) }).toString());
        }

        function saveWifi(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            apiAction('/api/savewifi', btn, 'POST', new URLSearchParams({
                ssid: document.getElementById('cfgSSID').value,
                pass: document.getElementById('cfgPass').value
            }).toString());
        }

        async function scanWifi() {
            const list = document.getElementById('wifiList');
            list.style.display = 'block';
            list.innerHTML = '🔄 Memindai WiFi di sekitar... <br><small style="color:var(--text-muted)">Mohon tunggu sekitar 3-5 detik.</small>';
            try {
                const res = await fetch('/api/scanwifi');
                const data = await res.json();
                if(data.length === 0) {
                    list.innerHTML = 'Tidak ada jaringan WiFi ditemukan.';
                    return;
                }
                let html = '<ul style="list-style:none; padding:0; margin:0;">';
                data.forEach(w => {
                    const icon = w.enc === 'Open' ? '🔓' : '🔒';
                    const safeSSID = escapeHTML(w.ssid);
                    html += `<li style="padding: 10px; border-bottom: 1px solid var(--card-border); cursor: pointer; transition: background 0.2s;" 
                                 onclick="selectWifi(this.dataset.ssid)" data-ssid="${safeSSID}" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                        <strong style="color:var(--primary); font-size:1.1rem;">${safeSSID}</strong> 
                        <span style="font-size:0.8rem; color:var(--text-muted); float:right;">${icon} ${w.rssi} dBm</span>
                    </li>`;
                });
                html += '</ul>';
                list.innerHTML = html;
            } catch (e) {
                list.innerHTML = '❌ Gagal memindai WiFi. Silakan coba lagi.';
            }
        }

        function selectWifi(ssid) {
            document.getElementById('cfgSSID').value = ssid;
            document.getElementById('cfgPass').focus();
            document.getElementById('wifiList').style.display = 'none';
        }

        let myChart = null;
        async function fetchHistory() {
            try {
                const res = await fetch('/api/history');
                const data = await res.json();
                const ctx = document.getElementById('chartHistory').getContext('2d');
                if(myChart) myChart.destroy();
                
                const labels = [];
                for(let i=0; i<7; i++) {
                   if(i===0) labels.push("Hari Ini");
                   else if(i===1) labels.push("Kemarin");
                   else labels.push("H-" + i);
                }
                labels.reverse();
                const dataKwh = data.kwh.reverse();

                myChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Energi (kWh)',
                            data: dataKwh,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { 
                            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                        }
                    }
                });
            } catch (err) {}
        }

        const hariArr = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
        function renderJadwal() {
            let html = '';
            for(let i=0; i<7; i++) {
                html += `<tr>
                    <td>${hariArr[i]}</td>
                    <td><div style="display:flex; gap:5px; align-items:center; justify-content:center;">
                        <input type="checkbox" id="jr1_a${i}">
                        <input type="time" id="jr1_m${i}" class="form-control" style="padding:5px; width:70px">
                        <input type="time" id="jr1_s${i}" class="form-control" style="padding:5px; width:70px">
                    </div></td>
                    <td><div style="display:flex; gap:5px; align-items:center; justify-content:center;">
                        <input type="checkbox" id="jr2_a${i}">
                        <input type="time" id="jr2_m${i}" class="form-control" style="padding:5px; width:70px">
                        <input type="time" id="jr2_s${i}" class="form-control" style="padding:5px; width:70px">
                    </div></td>
                </tr>`;
            }
            document.getElementById('jadwalTbody').innerHTML = html;
        }

        async function fetchStatus() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                
                document.getElementById('connIndicator').innerText = "🟢 Online";
                document.getElementById('connIndicator').style.color = "var(--success)";

                document.getElementById('valVolt').innerText = data.tegangan.toFixed(1) + " V";
                document.getElementById('valAmp').innerText = data.arus.toFixed(2) + " A";
                document.getElementById('valWatt').innerText = data.daya.toFixed(1) + " W";
                document.getElementById('valKwh').innerText = data.energi.toFixed(3) + " kWh";
                
                // Progress Daya
                let batasW = data.config.batas_w;
                let pctDaya = (data.daya / batasW) * 100;
                if(pctDaya > 100) pctDaya = 100;
                const progDaya = document.getElementById('progDaya');
                progDaya.style.width = pctDaya + "%";
                if(pctDaya > 90) progDaya.style.background = "var(--danger)";
                else if(pctDaya > 70) progDaya.style.background = "var(--warning)";
                else progDaya.style.background = "var(--success)";
                
                // PPJ Calculation (Frontend logic)
                let cost = data.biaya;
                if (data.config.ppj > 0) {
                    cost = cost + (cost * (data.config.ppj / 100));
                }
                document.getElementById('valCost').innerText = "Rp " + Math.round(cost).toLocaleString('id-ID');
                
                // PF Logic
                document.getElementById('valPf').innerText = data.pf.toFixed(2);
                const pfEl = document.getElementById('pfQuality');
                if (data.pf >= 0.9) { pfEl.innerText = "Sangat Baik"; pfEl.style.color = "var(--success)"; }
                else if (data.pf <= 0.6) { pfEl.innerText = "Buruk (Induktif Tinggi)"; pfEl.style.color = "var(--danger)"; }
                else { pfEl.innerText = "Normal"; pfEl.style.color = "var(--warning)"; }
                
                document.getElementById('valSaldo').innerText = "Rp " + Math.round(data.saldo).toLocaleString('id-ID');
                
                // Progress Saldo
                let batasSaldo = data.config.bts_sld_r || 5000;
                let pctSaldo = (data.saldo / (batasSaldo * 5)) * 100; // Asumsi full = 5x batas peringatan
                if(pctSaldo > 100) pctSaldo = 100;
                const progSaldo = document.getElementById('progSaldo');
                progSaldo.style.width = pctSaldo + "%";
                if(data.saldo <= batasSaldo) progSaldo.style.background = "var(--danger)";
                else progSaldo.style.background = "var(--warning)";

                const modeEl = document.getElementById('valMode');
                modeEl.innerText = data.mode_pulsa ? "AKTIF" : "NONAKTIF";
                modeEl.style.color = data.mode_pulsa ? "var(--success)" : "var(--text-muted)";
                
                if (data.esp_temp !== undefined) {
                    document.getElementById('valEspTemp').innerText = data.esp_temp.toFixed(1) + " °C";
                    document.getElementById('valEspCpu').innerText = data.esp_cpu_mhz + " MHz";
                    document.getElementById('valBootTime').innerText = data.last_boot;
                }

                const b1 = document.getElementById('btnRelay1');
                b1.className = data.relay1 ? 'btn btn-on' : 'btn btn-off';
                b1.innerText = '💡 ' + data.nama_r1 + ': ' + (data.relay1 ? 'ON' : 'OFF');
                
                const b2 = document.getElementById('btnRelay2');
                b2.className = data.relay2 ? 'btn btn-on' : 'btn btn-off';
                b2.innerText = '💡 ' + data.nama_r2 + ': ' + (data.relay2 ? 'ON' : 'OFF');
                
                document.querySelectorAll('.lbl-r1').forEach(e => e.innerText = data.nama_r1);
                document.querySelectorAll('.lbl-r2').forEach(e => e.innerText = data.nama_r2);
                
                const banner = document.getElementById('alertBanner');
                const bannerSaldo = document.getElementById('alertSaldo');
                
                if (data.saldo_rendah && !data.pulsa_habis) {
                    bannerSaldo.style.display = 'block';
                } else {
                    bannerSaldo.style.display = 'none';
                }
                
                if(data.trip) {
                    banner.style.display = 'block';
                    banner.style.background = 'var(--danger)';
                    banner.innerHTML = '⚠️ TRIP PROTEKSI! Beban berlebih. <button class="btn" style="width:auto; padding:5px 10px; margin-left:10px" onclick="resetTrip()">Reset</button>';
                } else if (data.pulsa_habis) {
                    banner.style.display = 'block';
                    banner.style.background = 'var(--danger)';
                    banner.innerText = '❌ PULSA HABIS! Listrik diputus.';
                } else if (data.jam_malam) {
                    banner.style.display = 'block';
                    banner.style.background = 'var(--primary)';
                    banner.innerText = '🌙 Mode Jadwal Mati / Jam Malam Sedang Aktif.';
                } else {
                    banner.style.display = 'none';
                }

                // Update Inputs only if user hasn't interacted with inputs in the last 8 seconds
                if (Date.now() - lastUserInteraction > 8000 && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
                    document.getElementById('cfgTarif').value = data.config.tarif;
                    document.getElementById('cfgBatasW').value = data.config.batas_w;
                    document.getElementById('cfgBatasA').value = data.config.batas_a;
                    if(data.config.bts_sld_r !== undefined) document.getElementById('cfgBatasSaldo').value = data.config.bts_sld_r;
                    document.getElementById('cfgSSID').value = data.config.ssid;
                    document.getElementById('cfgPass').value = data.config.pass;
                    
                    document.getElementById('cfgNamaR1').value = data.nama_r1;
                    document.getElementById('cfgNamaR2').value = data.nama_r2;
                    
                    document.getElementById('cfgPPJ').value = data.config.ppj;
                    document.getElementById('cfgVoff').value = data.config.v_off;
                    
                    if (data.config.j_r1) {
                        for(let i=0; i<7; i++) {
                           document.getElementById('jr1_a'+i).checked = data.config.j_r1[i].a;
                           let m1 = data.config.j_r1[i].m; document.getElementById('jr1_m'+i).value = String(Math.floor(m1/60)).padStart(2,'0')+':'+String(m1%60).padStart(2,'0');
                           let s1 = data.config.j_r1[i].s; document.getElementById('jr1_s'+i).value = String(Math.floor(s1/60)).padStart(2,'0')+':'+String(s1%60).padStart(2,'0');
                           
                           document.getElementById('jr2_a'+i).checked = data.config.j_r2[i].a;
                           let m2 = data.config.j_r2[i].m; document.getElementById('jr2_m'+i).value = String(Math.floor(m2/60)).padStart(2,'0')+':'+String(m2%60).padStart(2,'0');
                           let s2 = data.config.j_r2[i].s; document.getElementById('jr2_s'+i).value = String(Math.floor(s2/60)).padStart(2,'0')+':'+String(s2%60).padStart(2,'0');
                        }
                    }
                    
                    document.getElementById('f_ovp1').checked = data.config.f_ovp1; document.getElementById('f_ovp2').checked = data.config.f_ovp2;
                    document.getElementById('f_vmp1').checked = data.config.f_vmp1; document.getElementById('f_vmp2').checked = data.config.f_vmp2;
                    document.getElementById('f_mem1').checked = data.config.f_mem1; document.getElementById('f_mem2').checked = data.config.f_mem2;
                    document.getElementById('f_png1').checked = data.config.f_png1; document.getElementById('f_png2').checked = data.config.f_png2;
                    document.getElementById('f_jam1').checked = data.config.f_jam1; document.getElementById('f_jam2').checked = data.config.f_jam2;
                }
            } catch (err) {
                document.getElementById('connIndicator').innerText = "🔴 Offline";
                document.getElementById('connIndicator').style.color = "var(--danger)";
            }
        }

        let lastUserInteraction = 0;
        function markUserInteracting() { lastUserInteraction = Date.now(); }
        document.addEventListener('input', markUserInteracting, true);
        document.addEventListener('change', markUserInteracting, true);
        document.addEventListener('focusin', markUserInteracting, true);

        renderJadwal();
        fetchHistory();
        setInterval(fetchStatus, 2000);
        window.onload = fetchStatus;
    </script>
</body>
</html>
)=====";

#endif
