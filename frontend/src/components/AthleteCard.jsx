// ============================================================
// OLYMP-ID — AthleteCard.jsx
// Banner che appare quando un atleta scansiona un varco
// Mostra nome, stato accesso e scompare dopo 4 secondi
// ============================================================

import { useEffect, useState } from 'react';
import './AthleteCard.css';

export default function AthleteCard({ data }) {
  const [visible, setVisible] = useState(true);

  // Auto-hide dopo 4 secondi
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [data]);

  if (!visible) return null;

  const { granted, athlete, device_id } = data;

  return (
    <div className={`athlete-card ${granted ? 'granted' : 'denied'}`}>
      <div className="card-icon">{granted ? '✓' : '✗'}</div>
      <div className="card-info">
        {athlete ? (
          <>
            <span className="card-name">
              {athlete.surname.toUpperCase()} {athlete.name}
            </span>
            <span className="card-meta">
              {athlete.country}
              {athlete.bib_number && ` · Pett. ${athlete.bib_number}`}
              {` · ${device_id}`}
            </span>
          </>
        ) : (
          <>
            <span className="card-name">UID non riconosciuto</span>
            <span className="card-meta">{device_id}</span>
          </>
        )}
      </div>
      <div className="card-status">
        {granted ? 'ACCESSO CONSENTITO' : 'ACCESSO NEGATO'}
      </div>
    </div>
  );
}
