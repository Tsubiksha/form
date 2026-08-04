// Imports removed

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './i18n.js'
import App from './App.jsx'

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  document.getElementById('root').innerHTML = `<div style="padding:40px; color:red"><h2>Boot Error</h2><pre>${e.message}</pre><pre>${e.stack}</pre></div>`;
}
