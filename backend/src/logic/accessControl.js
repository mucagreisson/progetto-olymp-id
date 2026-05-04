// ============================================================
// OLYMP-ID — Logica Controllo Accessi
// Riceve l'evento dal mqttClient, verifica nel DB se l'atleta
// ha il permesso per quell'area e salva il log
// ============================================================

const db      = require('../db/queries');
const wsServer = require('../websocket/wsServer');

// ----------------------------------------------------------
// Gestisce un evento di accesso arrivato via MQTT
// payload: { uid, timestamp, device_id, event }
// ----------------------------------------------------------
async function handleEvent(payload) {
  const { uid, timestamp, device_id } = payload;

  console.log(`[ACCESS] Verifica accesso — UID: ${uid} | Varco: ${device_id}`);

  // 1. Cerca l'atleta nel database tramite UID
  const athlete = await db.getAthleteByUID(uid);

  let granted = false;
  let athleteInfo = null;

  if (!athlete) {
    console.warn(`[ACCESS] UID non riconosciuto: ${uid}`);
  } else {
    // 2. Verifica il livello di accesso
    // Logica semplice: tutti gli atleti (level >= 1) possono entrare
    // Puoi estendere con regole per aree specifiche (palestra, mensa, ecc.)
    granted = athlete.access_level >= 1;
    athleteInfo = athlete;
    console.log(`[ACCESS] Atleta: ${athlete.name} ${athlete.surname} | Accesso: ${granted ? 'CONSENTITO' : 'NEGATO'}`);
  }

  // 3. Salva il log nel database
  await db.saveAccessLog({
    athlete_id: athlete ? athlete.id : null,
    uid,
    device_id,
    event_time: new Date(timestamp),
    granted,
  });

  // 4. Invia l'aggiornamento al frontend via WebSocket
  wsServer.broadcast({
    type:    'ACCESS_EVENT',
    granted,
    athlete: athleteInfo ? {
      name:       athleteInfo.name,
      surname:    athleteInfo.surname,
      country:    athleteInfo.country,
      bib_number: athleteInfo.bib_number,
    } : null,
    device_id,
    timestamp,
  });
}

module.exports = { handleEvent };
