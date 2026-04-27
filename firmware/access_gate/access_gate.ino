// ============================================================
// OLYMP-ID — Access Gate Firmware
// Hardware: ESP32 + RC522 (SPI)
// Funzione: legge tag RFID, costruisce JSON con UID +
//           timestamp + device_id e lo pubblica via MQTT
// ============================================================

// ---------- LIBRERIE ----------
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ---------- PIN RC522 ----------
// Collegamento RC522 → ESP32:
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
const char* WIFI_SSID     = "sium";
const char* WIFI_PASSWORD = "jgpx4813";

const char* MQTT_BROKER   = "192.168.1.100"; // IP del Raspberry Pi / PC con EMQX
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "olympid/access";  // topic su cui pubblicare
const char* DEVICE_ID     = "gate_01";         // ID univoco di questo varco

// NTP per timestamp precisi
const char* NTP_SERVER    = "pool.ntp.org";
const long  GMT_OFFSET    = 3600;   // UTC+1 (Italia)
const int   DAYLIGHT_OFFSET = 3600; // ora legale

// ---------- OGGETTI ----------
MFRC522   rfid(SS_PIN, RST_PIN);
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

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
      Serial.print("Errore: ");
      Serial.println(mqtt.state());
      delay(3000);
    }
  }
}

// Restituisce il timestamp ISO8601 corrente (es. "2030-07-15T10:23:45Z")
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01T00:00:00Z"; // fallback se NTP non disponibile
  }
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

// Converte l'array di byte UID in stringa HEX (es. "A3:F2:11:CC")
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

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  connectWiFi();

  // Sincronizza orologio via NTP
  configTime(GMT_OFFSET, DAYLIGHT_OFFSET, NTP_SERVER);
  Serial.println("Sincronizzazione NTP...");
  delay(2000);

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);

  Serial.println("Sistema pronto. Avvicina un tag RFID.");
}

// ---------- LOOP ----------
void loop() {
  // Mantieni la connessione MQTT attiva
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  // Controlla se c'è un tag nel campo RFID
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return; // nessun tag → ricomincia il loop
  }

  // --- Tag rilevato ---
  String uid       = uidToString(rfid.uid);
  String timestamp = getTimestamp();

  Serial.println("Tag rilevato: " + uid + " @ " + timestamp);

  // Costruisce il JSON da inviare al broker
  // Formato:
  // {
  //   "uid":       "A3:F2:11:CC",
  //   "timestamp": "2030-07-15T10:23:45Z",
  //   "device_id": "gate_01",
  //   "event":     "access"
  // }
  StaticJsonDocument<200> doc;
  doc["uid"]       = uid;
  doc["timestamp"] = timestamp;
  doc["device_id"] = DEVICE_ID;
  doc["event"]     = "access";

  char payload[200];
  serializeJson(doc, payload);

  // Pubblica sul topic MQTT
  if (mqtt.publish(MQTT_TOPIC, payload)) {
    Serial.println("Pubblicato: " + String(payload));
  } else {
    Serial.println("Errore pubblicazione MQTT");
  }

  // Ferma la comunicazione con il tag corrente
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  delay(1000); // anti-rimbalzo: evita letture doppie dello stesso tag
}
