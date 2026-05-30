import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Expose version info globally for debugging
const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'
const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'local'
const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString()
window.__APP_VERSION__ = version
window.__BUILD_HASH__ = hash
window.__BUILD_TIME__ = buildTime
console.log(`%c PixelPal v${version} (${hash}) `, 'background:#7170ff;color:#fff;padding:2px 8px;border-radius:4px', `built at ${buildTime}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
