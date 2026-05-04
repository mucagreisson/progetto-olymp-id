// ============================================================
// OLYMP-ID — MQTT Client
// Si connette al broker EMQX, ascolta i topic degli ESP32
// e smista i messaggi alla logica corretta:
//   - olympid/access  → accessControl.js
//   - olympid/timing  → timing.js
// ============================================================

const mqtt       = require('mqtt');
const accessControl = require('../logic/accessControl');
const timing        = require('../logic/timing');

// Indirizzo del broker (viene dal docker-compose tramite variabile d'ambiente)
const MQTT_BROKER = process.env.MQTT_BROKER || 'localhost';
const MQTT_PORT   = process.env.MQTT_PORT   || 1883;

const TOPICS = {
  ACCESS: 'olympid/access',
  TIMING: 'olympid/timing',
};

let client;

// ----------------------------------------------------------
// Connessione al broker
// ----------------------------------------------------------
function connect() {
  const brokerUrl = `mqtt://${MQTT_BROKER}:${MQTT_PORT}`;
  console.log(`[MQTT] Connessione a ${brokerUrl}...`);

  client = mqtt.connect(brokerUrl, {
    clientId: `olympid_backend_${Date.now()}`,
    reconnectPeriod: 3000,   // riprova ogni 3 secondi se cade la connessione
    connectTimeout: 10000,
  });

  // Evento: connessione riuscita
  client.on('connect', () => {
    console.log('[MQTT] Connesso al broker EMQX');

    // Iscrizione ai topic degli ESP32
    client.subscribe(Object.values(TOPICS), (err) => {
      if (err) {
        console.error('[MQTT] Errore iscrizione topic:', err);
      } else {
        console.log('[MQTT] Iscritto ai topic:', Object.values(TOPICS));
      }
    });
  });

  // Evento: messaggio ricevuto
  client.on('message', async (topic, message) => {
    const raw = message.toString();
    console.log(`[MQTT] Messaggio su [${topic}]:`, raw);

    // Parsing JSON
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      console.error('[MQTT] JSON non valido, messaggio ignorato:', raw);
      return;
    }

    // Validazione campi obbligatori
    if (!payload.uid || !payload.timestamp || !payload.device_id) {
      console.error('[MQTT] Payload incompleto, messaggio ignorato:', payload);
      return;
    }

    // Smistamento in base al topic
    try {
      if (topic === TOPICS.ACCESS) {
        await accessControl.handleEvent(payload);
      } else if (topic === TOPICS.TIMING) {
        await timing.handleEvent(payload);
      } else {
        console.warn('[MQTT] Topic non gestito:', topic);
      }
    } catch (err) {
      console.error('[MQTT] Errore elaborazione messaggio:', err);
    }
  });

  // Evento: errore di connessione
  client.on('error', (err) => {
    console.error('[MQTT] Errore:', err.message);
  });

  // Evento: disconnessione
  client.on('disconnect', () => {
    console.warn('[MQTT] Disconnesso dal broker, riconnessione in corso...');
  });
}

module.exports = { connect };
