// ============================================================
// OLYMP-ID — App.jsx
// Componente principale: gestisce il WebSocket e
// smista i dati ai componenti figli
// ============================================================

import { useState, useEffect } from 'react';
import Leaderboard  from './components/Leaderboard';
import AccessLog    from './components/AccessLog';
import AthleteCard  from './components/AthleteCard';
import useWebSocket from './hooks/useWebSocket';
import './App.css';

export default function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [accessLogs,  setAccessLogs]  = useState([]);
  const [lastAccess,  setLastAccess]  = useState(null);
  const [activeTab,   setActiveTab]   = useState('leaderboard');

  // Connessione WebSocket al backend
  const { lastMessage, connected } = useWebSocket('ws://localhost:3001');

  // Gestione messaggi in arrivo dal backend
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {

      case 'LEADERBOARD_UPDATE':
        setLeaderboard(lastMessage.leaderboard);
        break;

      case 'ACCESS_EVENT':
        setLastAccess(lastMessage);
        setAccessLogs(prev => [
          {
            ...lastMessage,
            id: Date.now(),
            time: new Date().toLocaleTimeString('it-IT'),
          },
          ...prev.slice(0, 49), // mantieni gli ultimi 50 log
        ]);
        break;

      default:
        break;
    }
  }, [lastMessage]);

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <span className="logo">OLYMP<span className="logo-accent">ID</span></span>
          <span className="subtitle">Sistema di Monitoraggio Olimpico</span>
        </div>
        <div className="header-right">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span className="status-label">{connected ? 'Live' : 'Offline'}</span>
        </div>
      </header>

      {/* ATLETA ULTIMO ACCESSO */}
      {lastAccess && (
        <AthleteCard data={lastAccess} />
      )}

      {/* TABS */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Classifica
        </button>
        <button
          className={`tab ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          Log Accessi
          {accessLogs.length > 0 && (
            <span className="badge">{accessLogs.length}</span>
          )}
        </button>
      </div>

      {/* CONTENUTO */}
      <main className="main">
        {activeTab === 'leaderboard' && (
          <Leaderboard data={leaderboard} />
        )}
        {activeTab === 'access' && (
          <AccessLog logs={accessLogs} />
        )}
      </main>

    </div>
  );
}
