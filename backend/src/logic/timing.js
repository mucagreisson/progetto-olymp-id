// ============================================================
// OLYMP-ID — Logica Cronometraggio
// Riceve gli eventi dai checkpoint, calcola i tempi di gara
// e aggiorna la classifica in tempo reale
// ============================================================

const db       = require('../db/queries');
const wsServer = require('../websocket/wsServer');

// ----------------------------------------------------------
// Gestisce un evento di timing arrivato via MQTT
// payload: { uid, timestamp, device_id, checkpoint_type, event }
// ----------------------------------------------------------
async function handleEvent(payload) {
  const { uid, timestamp, device_id, checkpoint_type } = payload;
  const eventTime = new Date(timestamp);

  console.log(`[TIMING] Checkpoint: ${checkpoint_type} | UID: ${uid} | Tempo: ${timestamp}`);

  // 1. Cerca l'atleta
  const athlete = await db.getAthleteByUID(uid);
  if (!athlete) {
    console.warn(`[TIMING] UID non riconosciuto: ${uid}`);
    return;
  }

  // 2. Salva l'evento di timing nel database
  await db.saveTimingEvent({
    athlete_id:      athlete.id,
    uid,
    device_id,
    checkpoint_type,
    event_time:      eventTime,
  });

  // 3. Logica per tipo di checkpoint
  if (checkpoint_type === 'start') {
    // Partenza: inizializza o aggiorna il record in race_results
    await db.upsertRaceResult({
      athlete_id:  athlete.id,
      start_time:  eventTime,
      finish_time: null,
      total_ms:    null,
      rank:        null,
    });

    console.log(`[TIMING] Partenza registrata per ${athlete.name} ${athlete.surname}`);

    wsServer.broadcast({
      type:    'TIMING_START',
      athlete: {
        id:         athlete.id,
        name:       athlete.name,
        surname:    athlete.surname,
        country:    athlete.country,
        bib_number: athlete.bib_number,
      },
      timestamp,
    });

  } else if (checkpoint_type === 'finish') {
    // Arrivo: recupera il tempo di partenza e calcola il totale
    const result = await db.getRaceResult(athlete.id);

    if (!result || !result.start_time) {
      console.warn(`[TIMING] Arrivo ricevuto ma nessuna partenza trovata per ${uid}`);
      return;
    }

    const totalMs = eventTime - new Date(result.start_time);
    console.log(`[TIMING] Arrivo ${athlete.name} ${athlete.surname} — Tempo: ${totalMs}ms`);

    // Aggiorna il risultato con finish e tempo totale
    await db.upsertRaceResult({
      athlete_id:  athlete.id,
      start_time:  result.start_time,
      finish_time: eventTime,
      total_ms:    totalMs,
      rank:        null,   // verrà calcolato sotto
    });

    // Ricalcola le posizioni in classifica per tutti
    await db.recalculateRanks();

    // Recupera la classifica aggiornata e la invia al frontend
    const leaderboard = await db.getLeaderboard();

    wsServer.broadcast({
      type:        'LEADERBOARD_UPDATE',
      leaderboard,
    });

  } else if (checkpoint_type === 'intermediate') {
    // Checkpoint intermedio: solo notifica, non aggiorna la classifica finale
    const result = await db.getRaceResult(athlete.id);
    let splitMs = null;

    if (result && result.start_time) {
      splitMs = eventTime - new Date(result.start_time);
    }

    console.log(`[TIMING] Intermedio ${athlete.name} — Split: ${splitMs}ms`);

    wsServer.broadcast({
      type:    'TIMING_INTERMEDIATE',
      athlete: {
        name:       athlete.name,
        surname:    athlete.surname,
        bib_number: athlete.bib_number,
      },
      split_ms:  splitMs,
      timestamp,
    });
  }
}

module.exports = { handleEvent };
