// ============================================================
// OLYMP-ID — Leaderboard.jsx
// Classifica gara aggiornata in tempo reale via WebSocket
// ============================================================

import './Leaderboard.css';

// Converte millisecondi in formato mm:ss.ms (es. "01:23.456")
function formatTime(ms) {
  if (!ms) return '--:--.---';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis  = ms % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

// Emoji bandiera dal codice paese (es. "ITA" → 🇮🇹)
function countryFlag(code) {
  const map = {
    ITA: '🇮🇹', FRA: '🇫🇷', GER: '🇩🇪', ESP: '🇪🇸',
    USA: '🇺🇸', GBR: '🇬🇧', JPN: '🇯🇵', BRA: '🇧🇷',
  };
  return map[code] || '🏳️';
}

function medalColor(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'default';
}

export default function Leaderboard({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="leaderboard-empty">
        <span className="empty-icon">⏱</span>
        <p>In attesa dei risultati di gara...</p>
        <p className="empty-sub">La classifica si aggiornerà automaticamente al passaggio degli atleti sui checkpoint.</p>
      </div>
    );
  }

  return (
    <div className="leaderboard">

      {/* INTESTAZIONE COLONNE */}
      <div className="lb-header">
        <span className="col-rank">#</span>
        <span className="col-athlete">Atleta</span>
        <span className="col-bib">Pett.</span>
        <span className="col-time">Tempo</span>
        <span className="col-gap">Distacco</span>
      </div>

      {/* RIGHE ATLETI */}
      {data.map((row, index) => {
        const gap = index === 0 ? null : row.total_ms - data[0].total_ms;
        const medal = medalColor(row.rank);

        return (
          <div key={row.athlete_id || index} className={`lb-row medal-${medal}`}>

            {/* POSIZIONE */}
            <span className="col-rank">
              {row.rank <= 3
                ? <span className="medal-icon">{['🥇','🥈','🥉'][row.rank - 1]}</span>
                : <span className="rank-num">{row.rank}</span>
              }
            </span>

            {/* ATLETA */}
            <span className="col-athlete">
              <span className="athlete-flag">{countryFlag(row.country)}</span>
              <span className="athlete-name">
                {row.surname.toUpperCase()} <span className="athlete-firstname">{row.name}</span>
              </span>
              <span className="athlete-country">{row.country}</span>
            </span>

            {/* PETTORALE */}
            <span className="col-bib">
              <span className="bib">{row.bib_number || '—'}</span>
            </span>

            {/* TEMPO */}
            <span className="col-time">
              <span className="time-value">{formatTime(row.total_ms)}</span>
            </span>

            {/* DISTACCO */}
            <span className="col-gap">
              {gap === null
                ? <span className="gap-leader">LEADER</span>
                : <span className="gap-value">+{formatTime(gap)}</span>
              }
            </span>

          </div>
        );
      })}
    </div>
  );
}
