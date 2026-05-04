// ============================================================
// OLYMP-ID — AccessLog.jsx
// Lista degli ultimi accessi ai varchi in tempo reale
// ============================================================

import './AccessLog.css';

export default function AccessLog({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="access-empty">
        <span className="empty-icon">🚪</span>
        <p>Nessun accesso registrato</p>
        <p className="empty-sub">I passaggi ai varchi appariranno qui in tempo reale.</p>
      </div>
    );
  }

  return (
    <div className="access-log">

      {/* INTESTAZIONE */}
      <div className="al-header">
        <span className="al-col-status">Stato</span>
        <span className="al-col-athlete">Atleta</span>
        <span className="al-col-gate">Varco</span>
        <span className="al-col-time">Orario</span>
      </div>

      {/* RIGHE */}
      {logs.map((log) => (
        <div key={log.id} className={`al-row ${log.granted ? 'granted' : 'denied'}`}>

          {/* STATO */}
          <span className="al-col-status">
            <span className={`status-badge ${log.granted ? 'granted' : 'denied'}`}>
              {log.granted ? '✓ OK' : '✗ NO'}
            </span>
          </span>

          {/* ATLETA */}
          <span className="al-col-athlete">
            {log.athlete ? (
              <>
                <span className="al-name">
                  {log.athlete.surname} {log.athlete.name}
                </span>
                <span className="al-country">{log.athlete.country}</span>
              </>
            ) : (
              <span className="al-unknown">UID non riconosciuto</span>
            )}
          </span>

          {/* VARCO */}
          <span className="al-col-gate">
            <span className="gate-label">{log.device_id}</span>
          </span>

          {/* ORARIO */}
          <span className="al-col-time">
            <span className="time-label">{log.time}</span>
          </span>

        </div>
      ))}
    </div>
  );
}
