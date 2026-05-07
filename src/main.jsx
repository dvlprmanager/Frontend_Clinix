import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { logger } from './utils/logger.js'
import './styles/globals.css'

logger.info('frontend_bootstrap', { mode: import.meta.env.MODE })

window.addEventListener('error', (event) => {
  logger.error('frontend_runtime_error', { message: event.message })
})

window.addEventListener('unhandledrejection', (event) => {
  logger.error('frontend_unhandled_rejection', {
    reason: String(event.reason ?? 'unknown'),
  })
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
