// ============================================================
// OLYMP-ID — Entry Point Backend
// Avvia il server WebSocket e il client MQTT
// ============================================================

const mqttClient = require('./mqtt/mqttClient');
const wsServer   = require('./websocket/wsServer');

console.log('=== OLYMP-ID Backend ===');

// Avvia il WebSocket server (porta 3001)
wsServer.start();

// Connetti al broker MQTT e inizia ad ascoltare gli ESP32
mqttClient.connect();

console.log('Backend avviato e in ascolto.');
