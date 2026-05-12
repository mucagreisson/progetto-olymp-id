import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Questa è la riga 6 che sta dando errore
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
