// ============================================================
// OLYMP-ID — Query Database
// Tutte le operazioni sul database PostgreSQL centralizzate
// in un unico file per facilità di manutenzione
// ============================================================

const { Pool } = require('pg');

// Connessione al DB tramite variabili d'ambiente (impostate nel docker-compose)
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  user:     process.env.DB_USER     || 'olympid_user',
  password: process.env.DB_PASSWORD || 'olympid_pass',
  database: process.env.DB_NAME     || 'olympid_db',
});

pool.on('connect', () => console.log('[DB] Connesso a PostgreSQL'));
pool.on('error',   (err) => console.error('[DB] Errore pool:', err));

// ----------------------------------------------------------
// ATHLETES
// ----------------------------------------------------------

async function getAthleteByUID(uid) {
  const res = await pool.query(
    'SELECT * FROM athletes WHERE uid = $1',
    [uid]
  );
  return res.rows[0] || null;
}

// ----------------------------------------------------------
// ACCESS LOGS
// ----------------------------------------------------------

async function saveAccessLog({ athlete_id, uid, device_id, event_time, granted }) {
  await pool.query(
    `INSERT INTO access_logs (athlete_id, uid, device_id, event_time, granted)
     VALUES ($1, $2, $3, $4, $5)`,
    [athlete_id, uid, device_id, event_time, granted]
  );
}

// ----------------------------------------------------------
// TIMING EVENTS
// ----------------------------------------------------------

async function saveTimingEvent({ athlete_id, uid, device_id, checkpoint_type, event_time }) {
  await pool.query(
    `INSERT INTO timing_events (athlete_id, uid, device_id, checkpoint_type, event_time)
     VALUES ($1, $2, $3, $4, $5)`,
    [athlete_id, uid, device_id, checkpoint_type, event_time]
  );
}

// ----------------------------------------------------------
// RACE RESULTS
// ----------------------------------------------------------

// Inserisce o aggiorna il risultato di un atleta
async function upsertRaceResult({ athlete_id, start_time, finish_time, total_ms, rank }) {
  await pool.query(
    `INSERT INTO race_results (athlete_id, start_time, finish_time, total_ms, rank, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (athlete_id)
     DO UPDATE SET
       start_time  = EXCLUDED.start_time,
       finish_time = EXCLUDED.finish_time,
       total_ms    = EXCLUDED.total_ms,
       rank        = EXCLUDED.rank,
       updated_at  = NOW()`,
    [athlete_id, start_time, finish_time, total_ms, rank]
  );
}

async function getRaceResult(athlete_id) {
  const res = await pool.query(
    'SELECT * FROM race_results WHERE athlete_id = $1',
    [athlete_id]
  );
  return res.rows[0] || null;
}

// Ricalcola le posizioni in classifica ordinando per tempo totale
async function recalculateRanks() {
  await pool.query(`
    UPDATE race_results rr
    SET rank = sub.new_rank
    FROM (
      SELECT athlete_id,
             ROW_NUMBER() OVER (ORDER BY total_ms ASC NULLS LAST) AS new_rank
      FROM race_results
      WHERE total_ms IS NOT NULL
    ) sub
    WHERE rr.athlete_id = sub.athlete_id
  `);
}

// Restituisce la classifica completa con i dati dell'atleta
async function getLeaderboard() {
  const res = await pool.query(`
    SELECT
      rr.rank,
      a.name,
      a.surname,
      a.country,
      a.bib_number,
      rr.total_ms,
      rr.start_time,
      rr.finish_time
    FROM race_results rr
    JOIN athletes a ON a.id = rr.athlete_id
    WHERE rr.total_ms IS NOT NULL
    ORDER BY rr.rank ASC
  `);
  return res.rows;
}

module.exports = {
  getAthleteByUID,
  saveAccessLog,
  saveTimingEvent,
  upsertRaceResult,
  getRaceResult,
  recalculateRanks,
  getLeaderboard,
};
