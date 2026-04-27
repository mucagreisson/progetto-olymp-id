// ============================================================
// OLYMP-ID — Timing Checkpoint Firmware
// Hardware: ESP32 + RC522 (SPI)
// Funzione: rileva il passaggio dell'atleta su un checkpoint
//           (partenza, intermedio, arrivo) e pubblica via MQTT
//           un evento con UID + timestamp preciso + tipo checkpoint
// ============================================================

// ---------- LIBRERIE ----------
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ---------- PIN RC522 ----------
// Stesso schema di access_gate:
//   SDA  → GPIO 5
//   SCK  → GPIO 18
//   MOSI → GPIO 23
//   MISO → GPIO 19
//   RST  → GPIO 22
//   GND  → GND
//   3.3V → 3.3V
#define SS_PIN  5
#define RST_PIN 22

// ---------- CONFIGURAZIONE (modifica questi valori) ----------
const char* WIFI_SSID     = "NomeReteWiFi";
const char* WIFI_PASSWORD = "PasswordWiFi";

const char* MQTT_BROKER   = "192.168.1.100"; // IP del PC / Raspberry con EMQX
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "olympid/timing"; // topic separato dall'accessi
const char* DEVICE_ID     = "checkpoint_finish"; // valori possibili:
                                                  // "checkpoint_start"
                                                  // "checkpoint_mid_1"
                                                  // "checkpoint_finish"

// NTP
const char* NTP_SERVER      = "pool.ntp.org";
const long  GMT_OFFSET      = 3600;
const int   DAYLIGHT_OFFSET = 3600;

// Anti-rimbalzo: ignora lo stesso UID per N millisecondi
// Evita che un atleta fermo sul checkpoint venga registrato più volte
const unsigned long DEBOUNCE_MS = 3000;

// ---------- OGGETTI ----------
MFRC522      rfid(SS_PIN, RST_PIN);
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// ---------- STATO INTERNO ----------
// Mappa UID → ultimo timestamp di rilevazione (per debounce per-atleta)
// Usiamo array paralleli semplici (no std::map per compatibilità ESP32)
const int    MAX_ATHLETES  = 50;
String       lastUID[MAX_ATHLETES];
unsigned long lastTime[MAX_ATHLETES];
int          athleteCount = 0;

// ---------- FUNZIONI HELPER ----------

void connectWiFi() {
  Serial.print("Connessione WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connesso. IP: " + WiFi.localIP().toString());
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connessione MQTT...");
    String clientId = "ESP32_" + String(DEVICE_ID);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("OK");
    } else {
      Serial.print("Errore rc=");
      Serial.println(mqtt.state());
      delay(3000);
    }
  }
}

// Timestamp ISO8601 con millisecondi (es. "2030-07-15T10:23:45.123Z")
// I millisecondi vengono da millis() % 1000 — abbastanza precisi per gare
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01T00:00:00.000Z";
  }
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  // aggiunge i millisecondi
  String ts = String(buf);
  ts += "." + String(millis() % 1000);
  // padding a 3 cifre (es. ".5" → ".005")
  if ((millis() % 1000) < 10)  ts += "00";
  else if ((millis() % 1000) < 100) ts += "0";  // già inserito sopra, fix sotto
  ts += "Z";
  return ts;
}

String uidToString(MFRC522::Uid uid) {
  String result = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) result += "0";
    result += String(uid.uidByte[i], HEX);
    if (i < uid.size - 1) result += ":";
  }
  result.toUpperCase();
  return result;
}

// Controlla se lo stesso UID è già stato letto di recente (debounce per-atleta)
bool isDuplicate(String uid) {
  unsigned long now = millis();
  for (int i = 0; i < athleteCount; i++) {
    if (lastUID[i] == uid) {
      if (now - lastTime[i] < DEBOUNCE_MS) {
        return true; // troppo presto, ignora
      } else {
        lastTime[i] = now; // aggiorna il tempo
        return false;
      }
    }
  }
  // UID nuovo: aggiungilo alla lista
  if (athleteCount < MAX_ATHLETES) {
    lastUID[athleteCount]  = uid;
    lastTime[athleteCount] = now;
    athleteCount++;
  }
  return false;
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  // Aumenta il guadagno dell'antenna al massimo
  // Migliora la lettura rapida (atleti in corsa)
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);

  connectWiFi();

  configTime(GMT_OFFSET, DAYLIGHT_OFFSET, NTP_SERVER);
  Serial.println("Sincronizzazione NTP...");
  delay(2000);

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);

  Serial.println("Checkpoint [" + String(DEVICE_ID) + "] pronto.");
}

// ---------- LOOP ----------
void loop() {
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  String uid = uidToString(rfid.uid);

  // Scarta letture duplicate ravvicinate dello stesso atleta
  if (isDuplicate(uid)) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  String timestamp = getTimestamp();

  Serial.println("Atleta rilevato: " + uid + " @ " + timestamp);

  // Costruisce il JSON da inviare
  // Formato:
  // {
  //   "uid":             "A3:F2:11:CC",
  //   "timestamp":       "2030-07-15T10:23:45.123Z",
  //   "device_id":       "checkpoint_finish",
  //   "checkpoint_type": "finish",
  //   "event":           "timing"
  // }
  //
  // checkpoint_type viene estratto dal device_id:
  //   "checkpoint_start"   → "start"
  //   "checkpoint_mid_1"   → "intermediate"
  //   "checkpoint_finish"  → "finish"

  String checkpointType;
  String devId = String(DEVICE_ID);
  if (devId.indexOf("start") >= 0)  checkpointType = "start";
  else if (devId.indexOf("mid") >= 0) checkpointType = "intermediate";
  else                               checkpointType = "finish";

  StaticJsonDocument<256> doc;
  doc["uid"]              = uid;
  doc["timestamp"]        = timestamp;
  doc["device_id"]        = DEVICE_ID;
  doc["checkpoint_type"]  = checkpointType;
  doc["event"]            = "timing";

  char payload[256];
  serializeJson(doc, payload);

  if (mqtt.publish(MQTT_TOPIC, payload)) {
    Serial.println("Pubblicato: " + String(payload));
  } else {
    Serial.println("Errore pubblicazione MQTT");
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // Nessun delay fisso qui: il debounce per-atleta gestisce i duplicati,
  // così due atleti diversi che passano quasi insieme vengono entrambi registrati
}
