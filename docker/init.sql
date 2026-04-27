-- ============================================================
-- OLYMP-ID — Inizializzazione Database
-- Questo file viene eseguito automaticamente da PostgreSQL
-- al primo avvio del container Docker.
-- Crea le tabelle e inserisce dati demo per i test.
-- ============================================================


-- ----------------------------------------------------------
-- TABELLA 1: athletes
-- Anagrafica di ogni atleta con il suo UID RFID associato
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS athletes (
    id          SERIAL PRIMARY KEY,
    uid         VARCHAR(50)  UNIQUE NOT NULL,  -- UID del tag RFID (es. "A3:F2:11:CC")
    name        VARCHAR(100) NOT NULL,
    surname     VARCHAR(100) NOT NULL,
    country     VARCHAR(50)  NOT NULL,
    sport       VARCHAR(100),                  -- disciplina sportiva
    bib_number  INT UNIQUE,                    -- numero di pettorale
    access_level INT DEFAULT 1,               -- 1=atleta, 2=staff, 3=admin
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------
-- TABELLA 2: access_logs
-- Ogni volta che un atleta scansiona un varco viene
-- salvato un record qui
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_logs (
    id          SERIAL PRIMARY KEY,
    athlete_id  INT REFERENCES athletes(id),
    uid         VARCHAR(50)  NOT NULL,
    device_id   VARCHAR(50)  NOT NULL,         -- es. "gate_01"
    event_time  TIMESTAMP    NOT NULL,         -- timestamp dall'ESP32
    granted     BOOLEAN      NOT NULL,         -- true = accesso consentito
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------
-- TABELLA 3: timing_events
-- Ogni passaggio su un checkpoint di cronometraggio
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS timing_events (
    id               SERIAL PRIMARY KEY,
    athlete_id       INT REFERENCES athletes(id),
    uid              VARCHAR(50)  NOT NULL,
    device_id        VARCHAR(50)  NOT NULL,    -- es. "checkpoint_finish"
    checkpoint_type  VARCHAR(20)  NOT NULL,    -- "start" | "intermediate" | "finish"
    event_time       TIMESTAMP(3) NOT NULL,    -- precisione al millisecondo
    created_at       TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------
-- TABELLA 4: race_results
-- Tempi finali calcolati dal backend per ogni atleta
-- Aggiornata automaticamente quando arriva un "finish"
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS race_results (
    id            SERIAL PRIMARY KEY,
    athlete_id    INT REFERENCES athletes(id) UNIQUE,
    start_time    TIMESTAMP(3),
    finish_time   TIMESTAMP(3),
    total_ms      INT,                         -- tempo totale in millisecondi
    rank          INT,                         -- posizione in classifica
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------
-- INDICI — velocizzano le query più frequenti
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_access_logs_uid       ON access_logs(uid);
CREATE INDEX IF NOT EXISTS idx_timing_events_uid      ON timing_events(uid);
CREATE INDEX IF NOT EXISTS idx_timing_events_type     ON timing_events(checkpoint_type);
CREATE INDEX IF NOT EXISTS idx_race_results_total_ms  ON race_results(total_ms);


-- ----------------------------------------------------------
-- DATI DEMO — atleti di esempio per testare il sistema
-- Gli UID corrispondono a tag RFID fisici da scansionare
-- Sostituisci gli UID con quelli reali dei tuoi tag
-- ----------------------------------------------------------
INSERT INTO athletes (uid, name, surname, country, sport, bib_number, access_level) VALUES
    ('A3:F2:11:CC', 'Marco',    'Rossi',     'ITA', '100m',    1,  1),
    ('B7:1A:09:DE', 'Luca',     'Bianchi',   'ITA', '100m',    2,  1),
    ('C2:88:45:FA', 'Jean',     'Dupont',    'FRA', '100m',    3,  1),
    ('D5:3C:72:AB', 'Hans',     'Müller',    'GER', '100m',    4,  1),
    ('E9:F1:20:BC', 'Carlos',   'García',    'ESP', '100m',    5,  1),
    ('F4:6D:88:01', 'Anna',     'Ferrari',   'ITA', '100m',    6,  1),
    ('11:22:33:44', 'Staff',    'Olimpico',  'ITA', NULL,      NULL, 2),  -- staff
    ('AA:BB:CC:DD', 'Admin',    'Sistema',   'ITA', NULL,      NULL, 3);  -- admin

-- Messaggio di conferma nel log Docker
DO $$
BEGIN
    RAISE NOTICE 'OLYMP-ID: Database inizializzato con successo. % atleti caricati.', (SELECT COUNT(*) FROM athletes);
END $$;
