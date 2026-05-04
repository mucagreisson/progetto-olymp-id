// ============================================================
// OLYMP-ID — useWebSocket.js
// Hook React per la connessione WebSocket al backend
// Gestisce connessione, riconnessione automatica e parsing JSON
// ============================================================

import { useState, useEffect, useRef } from 'react';

export default function useWebSocket(url) {
  const [lastMessage, setLastMessage] = useState(null);
  const [connected,   setConnected]   = useState(false);
  const wsRef        = useRef(null);
  const retryTimeout = useRef(null);

  function connect() {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connesso al backend');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.warn('[WS] Messaggio non JSON:', event.data);
        }
      };

      ws.onclose = () => {
        console.warn('[WS] Disconnesso, riprovo tra 3s...');
        setConnected(false);
        // Riconnessione automatica dopo 3 secondi
        retryTimeout.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[WS] Errore:', err);
        ws.close();
      };

    } catch (err) {
      console.error('[WS] Impossibile connettersi:', err);
      retryTimeout.current = setTimeout(connect, 3000);
    }
  }

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [url]);

  return { lastMessage, connected };
}
