// ============================================
// Smart Socket V9 LITE - ADVANCED EDITION
// Fitur: PZEM-004T, Relay 2ch, Buzzer
// WDT, OVP/UVP, Vampire Power, Ping Watchdog, Jam Malam
// ============================================

#include "WebPage.h"
#include "esp_wifi.h"
#include <esp_task_wdt.h>
#include <ArduinoOTA.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <PZEM004Tv30.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <time.h>

#define WDT_TIMEOUT 15 // 15 Detik Hardware Watchdog

// ============================================
// PENGATURAN PIN
// ============================================
#define PIN_SER 26
#define PIN_RCLK 5
#define PIN_SRCLK 18

#define PIN_TOMBOL1 14
#define PIN_TOMBOL2 12
#define PIN_PZEM_RX 16
#define PIN_PZEM_TX 17

#define RELAY_ACTIVE_LOW true

// ============================================
// OBJEK
// ============================================
HardwareSerial serialPZEM(2);
PZEM004Tv30 pzem(serialPZEM, PIN_PZEM_RX, PIN_PZEM_TX);
WebServer server(80);
Preferences flash;

// ============================================
// VARIABEL STATUS
// ============================================
bool relay1Nyala = true;
bool relay2Nyala = true;
bool tombol1Lama = HIGH;
bool tombol2Lama = HIGH;
bool adaAlert = false;
bool relayTrip = false;
bool pulsaHabis = false;
bool apActive = false;
bool alertSaldoRendah = false;
bool alertOverheatSent = false;

// ============================================
// VARIABEL DATA LISTRIK
// ============================================
float tegangan = 0;
float arus = 0;
float daya = 0;
float energi = 0;
float frekuensi = 0;
float powerFaktor = 0;
float kWhAwal = 0;
float saldoPulsa = 0;
bool pzemValid = false;

// ============================================
// VARIABEL PENGATURAN DASAR
// ============================================
String wifiSSID = "";
String wifiPass = "";
float tarifKwh = 1444.0;
float batasDayaW = 500.0;
float batasArusA = 2.0;
bool modePulsa = true;
float batasSaldoRendah = 5000.0;

// ============================================
// DATA HISTORY HARIAN & TELEGRAM
// ============================================
float histKwh[7] = {0,0,0,0,0,0,0};
float histBiaya[7] = {0,0,0,0,0,0,0};
int lastSavedDay = -1; // 1-31

String namaR1 = "Relay 1";
String namaR2 = "Relay 2";

// Telegram logic removed

// ============================================
// VARIABEL PENGATURAN LANJUTAN (SMART FEATURES)
// ============================================
// Matriks Fitur per Relay
bool f_ovp1 = false, f_ovp2 = false;
bool f_vamp1 = false, f_vamp2 = false;
bool f_mem1 = false, f_mem2 = false;
bool f_ping1 = false, f_ping2 = false;
bool f_jam1 = false, f_jam2 = false;

float teganganOffset = 0.0;
float ppjPersen = 0.0;

struct JadwalHari {
  bool aktif;
  uint16_t mulai;
  uint16_t selesai;
};
bool schedActive(int wday, int curMnt, JadwalHari jadwal[7]);

JadwalHari jadwalR1[7];
JadwalHari jadwalR2[7];

// Internal Status Lanjutan
unsigned long vampireStart = 0;
bool vampireCounting = false;
unsigned long lastPingTime = 0;
int pingFails = 0;
bool routerResetting = false;
unsigned long routerResetStart = 0;
bool jamMalamAktifR1 = false;
bool jamMalamAktifR2 = false;
String lastBootTime = "Menunggu Sinkronisasi Waktu...";
bool timeSynced = false;

// ============================================
// TIMERS & BUZZER
// ============================================
int buzzerBeepsRemaining = 0;
int buzzerBeepDuration = 0;
unsigned long lastBuzzerStateChange = 0;
bool buzzerIsOn = false;
unsigned long lastRead = 0;
unsigned long lastSavePulsa = 0;
float lastSavedPulsaValue = 0;
unsigned long lastNtpSync = 0;

// ============================================
// FUNGSI WAKTU
// ============================================
void syncTime() {
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov"); // GMT+7 (WIB)
}

// ============================================
// SHIFT REGISTER & BUZZER
// ============================================
void updateShiftRegister() {
  byte data = 0;
  bool r1_state = RELAY_ACTIVE_LOW ? !relay1Nyala : relay1Nyala;
  if (r1_state) data |= (1 << 0);
  
  bool r2_state = RELAY_ACTIVE_LOW ? !relay2Nyala : relay2Nyala;
  if (r2_state) data |= (1 << 1);
  
  if (buzzerIsOn) data |= (1 << 2);

  digitalWrite(PIN_RCLK, LOW);
  shiftOut(PIN_SER, PIN_SRCLK, MSBFIRST, data);
  digitalWrite(PIN_RCLK, HIGH);
}

void updateBuzzer() {
  if (buzzerBeepsRemaining > 0) {
    unsigned long currentMillis = millis();
    if (buzzerIsOn) {
      if (currentMillis - lastBuzzerStateChange >= (unsigned long)buzzerBeepDuration) {
        buzzerIsOn = false;
        updateShiftRegister();
        lastBuzzerStateChange = currentMillis;
        buzzerBeepsRemaining--;
      }
    } else {
      if (currentMillis - lastBuzzerStateChange >= 80) {
        if (buzzerBeepsRemaining > 0) {
          buzzerIsOn = true;
          updateShiftRegister();
          lastBuzzerStateChange = currentMillis;
        }
      }
    }
  }
}

void bunyikanBuzzer(int berapa, int durasi) {
  if (berapa <= 0) return;
  buzzerBeepsRemaining = berapa;
  buzzerBeepDuration = durasi;
  lastBuzzerStateChange = millis();
  buzzerIsOn = true;
  updateShiftRegister();
}

// ============================================
// SAFE NVS FLASH WRAPPERS (WEAR-OUT PROTECTION)
// ============================================
void safePutBool(const char* key, bool val) {
  if (flash.getBool(key, !val) != val) flash.putBool(key, val);
}
void safePutFloat(const char* key, float val) {
  if (abs(flash.getFloat(key, 0.0f) - val) > 0.0001f) flash.putFloat(key, val);
}
void safePutInt(const char* key, int val) {
  if (flash.getInt(key, -1) != val) flash.putInt(key, val);
}
void safePutString(const char* key, String val) {
  if (flash.getString(key, "") != val) flash.putString(key, val);
}

void matikanSemuaRelay() {
  relay1Nyala = false;
  relay2Nyala = false;
  updateShiftRegister();
  safePutBool("relay1", false);
  safePutBool("relay2", false);
}

// ============================================
// RELAY CONTROL
// ============================================
bool setRelay1(bool targetState) {
  if (modePulsa && pulsaHabis && targetState) { bunyikanBuzzer(3, 50); return false; }
  if (relayTrip && targetState) { bunyikanBuzzer(3, 50); return false; }
  if (jamMalamAktifR1 && f_jam1 && targetState) { bunyikanBuzzer(3, 50); return false; } // Jam malam cegah nyala

  if (relay1Nyala != targetState) {
    relay1Nyala = targetState;
    safePutBool("relay1", relay1Nyala);
    if (relay1Nyala) bunyikanBuzzer(1, 80);
    else bunyikanBuzzer(2, 40);
  }
  return true;
}

bool setRelay2(bool targetState) {
  if (modePulsa && pulsaHabis && targetState) { bunyikanBuzzer(3, 50); return false; }
  if (relayTrip && targetState) { bunyikanBuzzer(3, 50); return false; }
  if (jamMalamAktifR2 && f_jam2 && targetState) { bunyikanBuzzer(3, 50); return false; }

  if (relay2Nyala != targetState) {
    relay2Nyala = targetState;
    safePutBool("relay2", relay2Nyala);
    if (relay2Nyala) bunyikanBuzzer(1, 80);
    else bunyikanBuzzer(2, 40);
  }
  return true;
}

// ============================================
// API ENDPOINTS (WEB)
// ============================================
bool checkAuth() {
  if (!server.authenticate("admin", "admin123")) {
    server.requestAuthentication();
    return false;
  }
  return true;
}

String getAPPassword() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  return "Smart" + mac.substring(6);
}

void handleIndex() { 
  if (!checkAuth()) return;
  server.sendHeader("Cache-Control", "public, max-age=86400");
  server.send_P(200, "text/html", htmlHomePage); 
}

void handleGetStatus() {
  if (!checkAuth()) return;
  DynamicJsonDocument doc(1536);
  doc["tegangan"] = tegangan;
  doc["arus"] = arus;
  doc["daya"] = daya;
  doc["energi"] = max(0.0f, energi - kWhAwal);
  doc["biaya"] = max(0.0f, energi - kWhAwal) * tarifKwh;
  doc["pf"] = powerFaktor;
  doc["saldo"] = saldoPulsa;
  doc["mode_pulsa"] = modePulsa;
  doc["relay1"] = relay1Nyala;
  doc["relay2"] = relay2Nyala;
  doc["nama_r1"] = namaR1;
  doc["nama_r2"] = namaR2;
  doc["trip"] = relayTrip;
  doc["pulsa_habis"] = pulsaHabis;
  doc["saldo_rendah"] = alertSaldoRendah;
  doc["last_boot"] = lastBootTime;
  doc["jam_malam"] = (jamMalamAktifR1 || jamMalamAktifR2);
  
  // Statistik ESP32
  doc["esp_temp"] = temperatureRead();
  doc["esp_ram_free"] = ESP.getFreeHeap();
  doc["esp_ram_total"] = ESP.getHeapSize();
  doc["esp_cpu_mhz"] = ESP.getCpuFreqMHz();

  JsonObject conf = doc.createNestedObject("config");
  conf["tarif"] = tarifKwh;
  conf["batas_w"] = batasDayaW;
  conf["batas_a"] = batasArusA;
  conf["bts_sld_r"] = batasSaldoRendah;
  conf["ssid"] = wifiSSID;
  conf["pass"] = wifiPass == "" ? "" : "********";
  
  // Advanced configs
  conf["ppj"] = ppjPersen;
  conf["v_off"] = teganganOffset;
  
  JsonArray jR1 = conf.createNestedArray("j_r1");
  JsonArray jR2 = conf.createNestedArray("j_r2");
  for (int i=0; i<7; i++) {
    JsonObject d1 = jR1.createNestedObject();
    d1["a"] = jadwalR1[i].aktif; d1["m"] = jadwalR1[i].mulai; d1["s"] = jadwalR1[i].selesai;
    JsonObject d2 = jR2.createNestedObject();
    d2["a"] = jadwalR2[i].aktif; d2["m"] = jadwalR2[i].mulai; d2["s"] = jadwalR2[i].selesai;
  }
  
  conf["f_ovp1"] = f_ovp1; conf["f_ovp2"] = f_ovp2;
  conf["f_vmp1"] = f_vamp1; conf["f_vmp2"] = f_vamp2;
  conf["f_mem1"] = f_mem1; conf["f_mem2"] = f_mem2;
  conf["f_png1"] = f_ping1; conf["f_png2"] = f_ping2;
  conf["f_jam1"] = f_jam1; conf["f_jam2"] = f_jam2;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleToggle1() {
  if (!checkAuth()) return;
  if (setRelay1(!relay1Nyala)) server.send(200, "application/json", "{\"message\":\"Relay 1 Toggled\"}");
  else server.send(200, "application/json", "{\"message\":\"Gagal (Trip/Pulsa/Jam Malam)\"}");
}

void handleToggle2() {
  if (!checkAuth()) return;
  if (setRelay2(!relay2Nyala)) server.send(200, "application/json", "{\"message\":\"Relay 2 Toggled\"}");
  else server.send(200, "application/json", "{\"message\":\"Gagal (Trip/Pulsa/Jam Malam)\"}");
}

void handleTogglePulsa() {
  if (!checkAuth()) return;
  modePulsa = !modePulsa;
  safePutBool("mode_pulsa", modePulsa);
  if (!modePulsa) {
    pulsaHabis = false;
  } else {
    pulsaHabis = (saldoPulsa <= 0);
    if (pulsaHabis) matikanSemuaRelay();
  }
  bunyikanBuzzer(1, 150);
  server.send(200, "application/json", "{\"message\":\"Mode Pulsa ditoggle\"}");
}

void handleTopUp() {
  if (!checkAuth()) return;
  if (server.hasArg("amount")) {
    float tambah = server.arg("amount").toFloat();
    if (tambah > 0) {
      saldoPulsa += tambah;
      safePutFloat("saldo", saldoPulsa);
      lastSavedPulsaValue = saldoPulsa;
      lastSavePulsa = millis();
      if (modePulsa && saldoPulsa > 0) pulsaHabis = false;
      bunyikanBuzzer(2, 100);
      server.send(200, "application/json", "{\"message\":\"Top Up Berhasil\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\"message\":\"Gagal: Jumlah tidak valid.\"}");
}

void handleSaveConfig() {
  if (!checkAuth()) return;
  if (server.hasArg("tarif")) {
    float val = server.arg("tarif").toFloat();
    if (val >= 0) { tarifKwh = val; safePutFloat("tarif", tarifKwh); }
  }
  if (server.hasArg("batas_w")) {
    float val = server.arg("batas_w").toFloat();
    if (val >= 0) { batasDayaW = val; safePutFloat("batas_w", batasDayaW); relayTrip = false; }
  }
  if (server.hasArg("batas_a")) {
    float val = server.arg("batas_a").toFloat();
    if (val >= 0) { batasArusA = val; safePutFloat("batas_a", batasArusA); relayTrip = false; }
  }
  if (server.hasArg("bts_sld_r")) {
    float val = server.arg("bts_sld_r").toFloat();
    if (val >= 0) { batasSaldoRendah = val; safePutFloat("bts_sld_r", batasSaldoRendah); alertSaldoRendah = false; }
  }
  if (server.hasArg("nama_r1")) { namaR1 = server.arg("nama_r1"); safePutString("nama_r1", namaR1); }
  if (server.hasArg("nama_r2")) { namaR2 = server.arg("nama_r2"); safePutString("nama_r2", namaR2); }
  server.send(200, "application/json", "{\"message\":\"Konfigurasi Disimpan\"}");
}

void handleSaveAdv() {
  if (!checkAuth()) return;
  // PPJ & Offset
  if (server.hasArg("ppj")) { ppjPersen = server.arg("ppj").toFloat(); safePutFloat("ppj", ppjPersen); }
  if (server.hasArg("v_off")) { teganganOffset = server.arg("v_off").toFloat(); safePutFloat("v_off", teganganOffset); }
  
  // Matrix OVP
  if (server.hasArg("f_ovp1")) { f_ovp1 = (server.arg("f_ovp1") == "1"); safePutBool("f_ovp1", f_ovp1); }
  if (server.hasArg("f_ovp2")) { f_ovp2 = (server.arg("f_ovp2") == "1"); safePutBool("f_ovp2", f_ovp2); }
  
  // Matrix Vampire
  if (server.hasArg("f_vmp1")) { f_vamp1 = (server.arg("f_vmp1") == "1"); safePutBool("f_vmp1", f_vamp1); }
  if (server.hasArg("f_vmp2")) { f_vamp2 = (server.arg("f_vmp2") == "1"); safePutBool("f_vmp2", f_vamp2); }
  
  // Matrix Memory
  if (server.hasArg("f_mem1")) { f_mem1 = (server.arg("f_mem1") == "1"); safePutBool("f_mem1", f_mem1); }
  if (server.hasArg("f_mem2")) { f_mem2 = (server.arg("f_mem2") == "1"); safePutBool("f_mem2", f_mem2); }
  
  // Matrix Ping
  if (server.hasArg("f_png1")) { f_ping1 = (server.arg("f_png1") == "1"); safePutBool("f_png1", f_ping1); }
  if (server.hasArg("f_png2")) { f_ping2 = (server.arg("f_png2") == "1"); safePutBool("f_png2", f_ping2); }
  
  // Matrix Jam Malam
  if (server.hasArg("f_jam1")) { f_jam1 = (server.arg("f_jam1") == "1"); safePutBool("f_jam1", f_jam1); }
  if (server.hasArg("f_jam2")) { f_jam2 = (server.arg("f_jam2") == "1"); safePutBool("f_jam2", f_jam2); }

  server.send(200, "application/json", "{\"message\":\"Fitur Cerdas Disimpan!\"}");
}

void handleSaveJadwal() {
  if (!checkAuth()) return;
  if (server.hasArg("payload")) {
    DynamicJsonDocument doc(2048);
    DeserializationError err = deserializeJson(doc, server.arg("payload"));
    if (!err) {
      JsonArray jr1 = doc["j_r1"];
      JsonArray jr2 = doc["j_r2"];
      for (int i=0; i<7; i++) {
        jadwalR1[i].aktif = jr1[i]["a"]; jadwalR1[i].mulai = jr1[i]["m"]; jadwalR1[i].selesai = jr1[i]["s"];
        jadwalR2[i].aktif = jr2[i]["a"]; jadwalR2[i].mulai = jr2[i]["m"]; jadwalR2[i].selesai = jr2[i]["s"];
      }
      flash.putBytes("j_r1", jadwalR1, sizeof(jadwalR1));
      flash.putBytes("j_r2", jadwalR2, sizeof(jadwalR2));
      server.send(200, "application/json", "{\"message\":\"Jadwal Berhasil Disimpan\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\"message\":\"Gagal Parsing Jadwal\"}");
}

void handleHistory() {
  if (!checkAuth()) return;
  DynamicJsonDocument doc(1024);
  histKwh[0] = max(0.0f, energi - kWhAwal);
  histBiaya[0] = histKwh[0] * tarifKwh;
  
  JsonArray arrKwh = doc.createNestedArray("kwh");
  JsonArray arrBiaya = doc.createNestedArray("biaya");
  for (int i=0; i<7; i++) {
    arrKwh.add(histKwh[i]);
    arrBiaya.add(histBiaya[i]);
  }
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleResetTrip() {
  if (!checkAuth()) return;
  relayTrip = false;
  adaAlert = false;
  bunyikanBuzzer(2, 100);
  server.send(200, "application/json", "{\"message\":\"Trip direset\"}");
}

void handleSaveWifi() {
  if (!checkAuth()) return;
  if (server.hasArg("ssid")) {
    wifiSSID = server.arg("ssid");
    if (wifiSSID != "") {
      flash.putString("ssid", wifiSSID);
      String newPass = server.arg("pass");
      if (newPass != "********" && newPass != "") {
        wifiPass = newPass;
        flash.putString("pass", wifiPass);
      }
      server.send(200, "application/json", "{\"message\":\"Disimpan! ESP akan restart.\"}");
      delay(2000);
      ESP.restart();
      return;
    }
  }
  server.send(400, "application/json", "{\"message\":\"SSID kosong.\"}");
}

void handleResetWifi() {
  if (!checkAuth()) return;
  flash.putString("ssid", "");
  flash.putString("pass", "");
  server.send(200, "application/json", "{\"message\":\"WiFi Reset! ESP akan restart.\"}");
  delay(2000);
  ESP.restart();
}

void handleScanWifi() {
  if (!checkAuth()) return;
  int n = WiFi.scanNetworks();
  DynamicJsonDocument doc(2048);
  JsonArray array = doc.to<JsonArray>();
  
  // Batasi hanya 15 jaringan teratas agar tidak memicu JSON overflow 
  // di area padat (seperti kost/apartemen) yang membuat JSON cacat.
  int limit = (n > 15) ? 15 : n;
  
  for (int i = 0; i < limit; ++i) {
    JsonObject obj = array.createNestedObject();
    obj["ssid"] = WiFi.SSID(i);
    obj["rssi"] = WiFi.RSSI(i);
    obj["enc"] = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "Open" : "Secured";
  }
  
  String res;
  serializeJson(doc, res);
  server.send(200, "application/json", res);
  
  // Bebaskan memori scan
  WiFi.scanDelete();
}

void handleKalibrasi() {
  if (!checkAuth()) return;
  if (pzem.resetEnergy()) {
    kWhAwal = 0.0;
    energi = 0.0;
    flash.putFloat("kwh_awal", 0.0);
    bunyikanBuzzer(2, 150);
    server.send(200, "application/json", "{\"message\":\"Kalibrasi Berhasil\"}");
  } else {
    bunyikanBuzzer(3, 100);
    server.send(200, "application/json", "{\"message\":\"Kalibrasi Gagal (PZEM error)\"}");
  }
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println("=== Smart Plug V9 LITE ADVANCED ===");

  // Init Hardware Watchdog (Support untuk ESP32 Core v3.x / ESP-IDF v5)
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = WDT_TIMEOUT * 1000,
    .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
    .trigger_panic = true
  };
  if (esp_task_wdt_reconfigure(&wdt_config) != ESP_OK) {
    esp_task_wdt_init(&wdt_config);
  }
  esp_task_wdt_add(NULL);

  pinMode(PIN_SER, OUTPUT);
  pinMode(PIN_RCLK, OUTPUT);
  pinMode(PIN_SRCLK, OUTPUT);
  pinMode(PIN_TOMBOL1, INPUT_PULLUP);
  pinMode(PIN_TOMBOL2, INPUT_PULLUP);

  flash.begin("smartplug", false);
  kWhAwal = flash.getFloat("kwh_awal", 0.0);
  
  // Load History & Telegram
  flash.getBytes("h_kwh", histKwh, sizeof(histKwh));
  flash.getBytes("h_biaya", histBiaya, sizeof(histBiaya));
  lastSavedDay = flash.getInt("last_day", -1);
  
  namaR1 = flash.getString("nama_r1", "Relay 1");
  namaR2 = flash.getString("nama_r2", "Relay 2");
  
  // Load Smart Features
  ppjPersen = flash.getFloat("ppj", 0.0);
  teganganOffset = flash.getFloat("v_off", 0.0);
  
  if (flash.getBytesLength("j_r1") == sizeof(jadwalR1)) {
    flash.getBytes("j_r1", jadwalR1, sizeof(jadwalR1));
    flash.getBytes("j_r2", jadwalR2, sizeof(jadwalR2));
  } else {
    // Migrasi format lama jika ada
    int lama_r1_on = flash.getInt("r1_on0", -1);
    int lama_r1_off = flash.getInt("r1_off0", -1);
    int lama_r2_on = flash.getInt("r2_on0", -1);
    int lama_r2_off = flash.getInt("r2_off0", -1);
    for(int i=0; i<7; i++) {
       jadwalR1[i].aktif = false; jadwalR1[i].mulai = (lama_r1_on != -1 ? lama_r1_on*60 : 0); jadwalR1[i].selesai = (lama_r1_off != -1 ? lama_r1_off*60 : 0);
       if(lama_r1_on != -1) jadwalR1[i].aktif = true;
       jadwalR2[i].aktif = false; jadwalR2[i].mulai = (lama_r2_on != -1 ? lama_r2_on*60 : 0); jadwalR2[i].selesai = (lama_r2_off != -1 ? lama_r2_off*60 : 0);
       if(lama_r2_on != -1) jadwalR2[i].aktif = true;
    }
  }
  
  f_ovp1 = flash.getBool("f_ovp1", false); f_ovp2 = flash.getBool("f_ovp2", false);
  f_vamp1 = flash.getBool("f_vmp1", false); f_vamp2 = flash.getBool("f_vmp2", false);
  f_mem1 = flash.getBool("f_mem1", false); f_mem2 = flash.getBool("f_mem2", false);
  f_ping1 = flash.getBool("f_png1", false); f_ping2 = flash.getBool("f_png2", false);
  f_jam1 = flash.getBool("f_jam1", false); f_jam2 = flash.getBool("f_jam2", false);

  // LAST STATE MEMORY LOGIC
  if (f_mem1) relay1Nyala = flash.getBool("relay1", true); else relay1Nyala = true;
  if (f_mem2) relay2Nyala = flash.getBool("relay2", true); else relay2Nyala = true;

  wifiSSID = flash.getString("ssid", "");
  wifiPass = flash.getString("pass", "");
  tarifKwh = flash.getFloat("tarif", 1444.0);
  batasDayaW = flash.getFloat("batas_w", 500.0);
  batasArusA = flash.getFloat("batas_a", 2.0);
  batasSaldoRendah = flash.getFloat("bts_sld_r", 5000.0);
  saldoPulsa = flash.getFloat("saldo", 0.0);
  lastSavedPulsaValue = saldoPulsa;
  modePulsa = flash.getBool("mode_pulsa", true);

  if (modePulsa && saldoPulsa <= 0) {
    relay1Nyala = false;
    relay2Nyala = false;
    pulsaHabis = true;
  }

  updateShiftRegister();

  serialPZEM.begin(9600, SERIAL_8N1, PIN_PZEM_RX, PIN_PZEM_TX);
  
  // KONEKSI WIFI
  if (wifiSSID == "") {
    Serial.println("WiFi belum dikonfigurasi. Memulai Mode AP (SmartPlug-LITE)");
    WiFi.mode(WIFI_AP);
    String apPass = getAPPassword();
    WiFi.softAP("SmartPlug-LITE", apPass.c_str());
    Serial.println("AP Password: " + apPass);
    apActive = true;
  } else {
    Serial.print("Menghubungkan ke WiFi: ");
    Serial.println(wifiSSID);
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    
    // Tambahkan Event Listener untuk debug
    WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
        Serial.print("WiFi Terputus! Reason: ");
        Serial.println(info.wifi_sta_disconnected.reason);
    }, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);

    Serial.println("Mencari jaringan di udara (Scanning)...");
    int numNets = WiFi.scanNetworks();
    bool apDitemukan = false;
    for (int i = 0; i < numNets; ++i) {
      Serial.print(" - ");
      Serial.print(WiFi.SSID(i));
      Serial.print(" (Ch: ");
      Serial.print(WiFi.channel(i));
      Serial.println(")");
      if (WiFi.SSID(i) == wifiSSID) apDitemukan = true;
    }
    
    if (!apDitemukan) {
      Serial.println("⚠️ Gawat: SSID target tidak terlihat oleh ESP32 sama sekali!");
      Serial.println("⚠️ Cek apakah router menggunakan Channel 12/13, atau posisi terlalu jauh.");
    } else {
      Serial.println("✅ Sinyal terlihat! Memulai negosiasi koneksi...");
    }
    WiFi.scanDelete();

    WiFi.begin(wifiSSID.c_str(), wifiPass.c_str());
    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
      delay(500);
      Serial.print(".");
      esp_task_wdt_reset();
      tries++;
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("✅ Berhasil Terhubung! IP Address: ");
      Serial.println(WiFi.localIP());
      WiFi.setAutoReconnect(true);
      
      if (!MDNS.begin("smartplug")) {
        Serial.println("❌ Error: Gagal memulai mDNS responder!");
      } else {
        MDNS.addService("http", "tcp", 80);
        Serial.println("✅ mDNS aktif! Bisa diakses via http://smartplug.local (Jika didukung perangkat)");
      }
      
      syncTime();

      // OTA SETUP
      ArduinoOTA.setPassword("admin123");
      ArduinoOTA.onStart([]() { esp_task_wdt_delete(NULL); });
      ArduinoOTA.begin();

    } else {
      Serial.println("❌ Gagal Terhubung ke WiFi! Memulai Mode AP fallback (SmartPlug-LITE)");
      WiFi.setAutoReconnect(false);
      WiFi.mode(WIFI_AP_STA);
      String apPass = getAPPassword();
      WiFi.softAP("SmartPlug-LITE", apPass.c_str());
      Serial.println("AP Password: " + apPass);
      apActive = true;
    }
  }

  server.on("/", HTTP_GET, handleIndex);
  server.on("/api/status", HTTP_GET, handleGetStatus);
  server.on("/api/toggle1", HTTP_POST, handleToggle1);
  server.on("/api/toggle2", HTTP_POST, handleToggle2);
  server.on("/api/togglepulsa", HTTP_POST, handleTogglePulsa);
  server.on("/api/topup", HTTP_POST, handleTopUp);
  server.on("/api/saveconfig", HTTP_POST, handleSaveConfig);
  server.on("/api/saveadv", HTTP_POST, handleSaveAdv);
  server.on("/api/savejadwal", HTTP_POST, handleSaveJadwal);
  server.on("/api/history", HTTP_GET, handleHistory);
  server.on("/api/resettrip", HTTP_POST, handleResetTrip);
  server.on("/api/kalibrasi", HTTP_POST, handleKalibrasi);
  server.on("/api/savewifi", HTTP_POST, handleSaveWifi);
  server.on("/api/resetwifi", HTTP_POST, handleResetWifi);
  server.on("/api/scanwifi", HTTP_GET, handleScanWifi);

  server.begin();
}

// Fungsi bantu pengecekan jadwal per hari
bool schedActive(int wday, int curMnt, JadwalHari jadwal[7]) {
  if (!jadwal[wday].aktif) return false;
  uint16_t s = jadwal[wday].mulai;
  uint16_t e = jadwal[wday].selesai;
  if (s == e) return false;
  if (s < e) {
    return (curMnt >= s && curMnt < e);
  } else {
    // Lewat tengah malam (misal 22:00 - 05:00)
    return (curMnt >= s || curMnt < e);
  }
}

// ============================================
// LOOP
// ============================================
void loop() {
  esp_task_wdt_reset(); // Feed WDT
  if (WiFi.status() == WL_CONNECTED) ArduinoOTA.handle(); // Handle OTA
  
  updateBuzzer();
  server.handleClient();

  static unsigned long lastTimeCheck = 0;
  if (!timeSynced && time(NULL) > 1000000000) {
    timeSynced = true;
    struct tm tinfo;
    getLocalTime(&tinfo, 0);
    char timeStringBuff[50];
    strftime(timeStringBuff, sizeof(timeStringBuff), "%d %b %Y, %H:%M:%S", &tinfo);
    if (lastBootTime == "Menunggu Sinkronisasi Waktu...") lastBootTime = String(timeStringBuff);
  }

  // Cek Jadwal Mati & History Harian (Setiap 1 Detik)
  if (timeSynced && millis() - lastTimeCheck >= 1000) {
    lastTimeCheck = millis();
    struct tm tinfo;
    if (getLocalTime(&tinfo, 0)) {
      int wday = tinfo.tm_wday; // 0 = Sunday
      int curMnt = (tinfo.tm_hour * 60) + tinfo.tm_min;
      
      // History Harian Rotasi
      int day = tinfo.tm_mday;
      if (lastSavedDay != day && pzemValid) {
        if (lastSavedDay != -1) {
          histKwh[0] = energi - kWhAwal;
          if (histKwh[0] < 0) histKwh[0] = 0;
          histBiaya[0] = histKwh[0] * tarifKwh;
          
          for (int i = 6; i > 0; i--) {
             histKwh[i] = histKwh[i-1];
             histBiaya[i] = histBiaya[i-1];
          }
          histKwh[0] = 0; 
          histBiaya[0] = 0;
          kWhAwal = energi;
          flash.putFloat("kwh_awal", kWhAwal);
        }
        lastSavedDay = day;
        flash.putInt("last_day", lastSavedDay);
        flash.putBytes("h_kwh", histKwh, sizeof(histKwh));
        flash.putBytes("h_biaya", histBiaya, sizeof(histBiaya));
      }

      bool r1Mati = f_jam1 ? schedActive(wday, curMnt, jadwalR1) : false;
      bool r2Mati = f_jam2 ? schedActive(wday, curMnt, jadwalR2) : false;
      
      if (r1Mati && !jamMalamAktifR1) {
        jamMalamAktifR1 = true;
        setRelay1(false);
      } else if (!r1Mati && jamMalamAktifR1) {
        jamMalamAktifR1 = false;
      }

      if (r2Mati && !jamMalamAktifR2) {
        jamMalamAktifR2 = true;
        setRelay2(false);
      } else if (!r2Mati && jamMalamAktifR2) {
        jamMalamAktifR2 = false;
      }
    }
  }

  // Automatic WiFi Reconnection & SoftAP Fallback
  static unsigned long lastWifiCheck = 0;
  static unsigned long wifiDisconnectStart = 0;
  if (wifiSSID != "" && !apActive) {
    if (WiFi.status() != WL_CONNECTED) {
      if (wifiDisconnectStart == 0) wifiDisconnectStart = millis();
      
      if (millis() - lastWifiCheck >= 15000) { // Coba koneksi ulang tiap 15 detik
        lastWifiCheck = millis();
        Serial.println("🔄 WiFi Terputus, mencoba koneksi ulang...");
        WiFi.disconnect();
        WiFi.reconnect();
      }
      
      // Jika terputus terus selama > 5 menit (300.000 ms), aktifkan SoftAP darurat
      if (millis() - wifiDisconnectStart > 300000) {
        Serial.println("⚠️ WiFi terputus 5 menit! Mengaktifkan Mode AP Darurat (SmartPlug-LITE).");
        WiFi.mode(WIFI_AP_STA);
        String apPass = getAPPassword();
        WiFi.softAP("SmartPlug-LITE", apPass.c_str());
        Serial.println("AP Password: " + apPass);
        apActive = true;
      }
    } else {
      wifiDisconnectStart = 0;
    }
  }

  // Router Resetting Logic (Ping Watchdog Non-blocking)
  if (routerResetting) {
    if (millis() - routerResetStart > 10000) { // 10 sec off
      routerResetting = false;
      if (f_ping1) setRelay1(true);
      if (f_ping2) setRelay2(true);
    }
  } 
  else if (WiFi.status() == WL_CONNECTED && (f_ping1 || f_ping2)) {
    if (millis() - lastPingTime > 60000) { // 1 minute
      lastPingTime = millis();
      WiFiClient client;
      client.setTimeout(1); // Set 1 second max socket timeout to prevent WDT freeze!
      if (client.connect("8.8.8.8", 53)) {
        client.stop();
        pingFails = 0;
      } else {
        client.stop();
        pingFails++;
      }
      
      if (pingFails >= 5) { // 5 minutes offline
        pingFails = 0;
        routerResetting = true;
        routerResetStart = millis();
        if (f_ping1) setRelay1(false);
        if (f_ping2) setRelay2(false);
      }
    }
  }

  // Pembacaan PZEM tiap 1 Detik
  if (millis() - lastRead >= 1000) {
    lastRead = millis();

    float v = pzem.voltage();
    float i = pzem.current();
    float p = pzem.power();
    float e = pzem.energy();
    float f = pzem.frequency();
    float pf = pzem.pf();

    static int pzemFailCount = 0;
    if (!isnan(v)) { 
      tegangan = v + teganganOffset; 
      pzemFailCount = 0;
    } else {
      pzemFailCount++;
      if (pzemFailCount > 3) {
        while(serialPZEM.available()) serialPZEM.read(); // Flush corrupted bytes from UART buffer
      }
    }

    if (!isnan(i)) arus = i;
    if (!isnan(p)) daya = p;
    if (!isnan(e)) { 
      energi = e;
      pzemValid = true;
    }
    if (!isnan(f)) frekuensi = f;
    if (!isnan(pf)) powerFaktor = pf;

    if (pzemFailCount > 5) { // Jika PZEM ganjil/hilang > 5 detik
      tegangan = 0;
      arus = 0;
      daya = 0;
      pzemValid = false;
    }

    // Over/Under Voltage (OVP/UVP) dengan Debounce 5 Detik Berturut-turut
    static int ovpDebounce = 0;
    if (pzemValid && (tegangan > 240.0f || (tegangan < 190.0f && tegangan > 100.0f))) {
       ovpDebounce++;
       if (ovpDebounce >= 5) {
          if (f_ovp1 && relay1Nyala) setRelay1(false);
          if (f_ovp2 && relay2Nyala) setRelay2(false);
       }
    } else {
       ovpDebounce = 0;
    }

    // Overheat Protection (> 85C chip ESP32)
    float t = temperatureRead();
    if (t > 85.0f) {
       if (relay1Nyala) setRelay1(false);
       if (relay2Nyala) setRelay2(false);
       if (!alertOverheatSent) {
          alertOverheatSent = true;
       }
    } else if (t < 75.0f) {
       alertOverheatSent = false;
    }

    // Vampire Power (< 5W)
    if (daya < 5.0f && daya > 0.1f) {
       if (!vampireCounting) { vampireCounting = true; vampireStart = millis(); }
       else if (millis() - vampireStart > 900000) { // 15 mins
          vampireCounting = false;
          if (f_vamp1 && relay1Nyala) setRelay1(false);
          if (f_vamp2 && relay2Nyala) setRelay2(false);
       }
    } else {
       vampireCounting = false;
    }

    if (!relayTrip) adaAlert = (daya > batasDayaW || arus > batasArusA);
    else adaAlert = false;

    // Pulsa Logic (NVS Wear-out Protection: Simpan hanya jika selisih >= Rp 500 atau 30 menit)
    if (modePulsa && daya > 0) {
      float deltaKwh = daya / 3600000.0f;
      saldoPulsa -= deltaKwh * tarifKwh;
      if (saldoPulsa < 0) saldoPulsa = 0;

      if (lastSavedPulsaValue - saldoPulsa >= 500.0f || millis() - lastSavePulsa > 1800000) {
        safePutFloat("saldo", saldoPulsa);
        lastSavePulsa = millis();
        lastSavedPulsaValue = saldoPulsa;
      }
      
      // Saldo Rendah Warning
      if (saldoPulsa <= batasSaldoRendah && !alertSaldoRendah) {
        alertSaldoRendah = true;
        bunyikanBuzzer(2, 600); // 2 Beep Panjang Unik
      } else if (saldoPulsa > batasSaldoRendah) {
        alertSaldoRendah = false;
      }
    }

    if (modePulsa && saldoPulsa <= 0 && !pulsaHabis) {
      matikanSemuaRelay();
      pulsaHabis = true;
      bunyikanBuzzer(4, 500);
    }

    if ((daya > batasDayaW || arus > batasArusA) && !relayTrip) {
      matikanSemuaRelay();
      relayTrip = true;
      adaAlert = false;
      bunyikanBuzzer(5, 200); // Trip Buzzer
    }
    
    // Warning Buzzer 90% Limit
    static unsigned long lastWarnBeep = 0;
    if (!relayTrip && daya > (batasDayaW * 0.9) && daya <= batasDayaW) {
        if (millis() - lastWarnBeep >= 5000) {
            bunyikanBuzzer(3, 80); // 3 Beep Cepat
            lastWarnBeep = millis();
        }
    }
  }

  // Cek Tombol Fisik
  bool btn1 = digitalRead(PIN_TOMBOL1);
  bool btn2 = digitalRead(PIN_TOMBOL2);
  static unsigned long pressStart1 = 0;
  static unsigned long pressStart2 = 0;
  
  if (btn1 == LOW && tombol1Lama == HIGH) pressStart1 = millis();
  if (btn2 == LOW && tombol2Lama == HIGH) pressStart2 = millis();

  // Tombol 1
  if (btn1 == HIGH && tombol1Lama == LOW) {
    if (millis() - pressStart1 > 50) {
      if (relayTrip) {
        relayTrip = false; adaAlert = false; bunyikanBuzzer(2, 100);
      } else {
        setRelay1(!relay1Nyala);
      }
    }
  }

  if (btn2 == HIGH && tombol2Lama == LOW) {
    if (millis() - pressStart2 > 50) setRelay2(!relay2Nyala);
  }

  tombol1Lama = btn1;
  tombol2Lama = btn2;
}
