// ============================================================
// OLYMP-ID — WebSocket Server
// Mantiene aperte le connessioni con il frontend React
// e invia gli aggiornamenti in tempo reale (push)
// senza che il browser debba fare richieste
// ============================================================

const { WebSocketServer } = require('ws');

let wss;
const clients = new Set();

// ----------------------------------------------------------
// Avvia il server WebSocket sulla porta 3001
// ----------------------------------------------------------
function start() {
  wss = new WebSocketServer({ port: 3001 });
  console.log('[WS] Server WebSocket avviato sulla porta 3001');

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Nuovo client connesso. Totale: ${clients.size}`);

    // Messaggio di benvenuto al frontend appena connesso
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'OLYMP-ID WebSocket attivo' }));

    // Rimuovi il client quando si disconnette
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnesso. Totale: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Errore client:', err.message);
      clients.delete(ws);
    });
  });
}

// ----------------------------------------------------------
// Invia un messaggio a TUTTI i client connessi (broadcast)
// Chiamato da accessControl.js e timing.js
// ----------------------------------------------------------
function broadcast(data) {
  const message = JSON.stringify(data);
  let sent = 0;

  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
      sent++;
    }
  });

  console.log(`[WS] Broadcast inviato a ${sent} client:`, data.type);
}

module.exports = { start, broadcast };
