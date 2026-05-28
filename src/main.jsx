import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// תופס שגיאות ומציג על המסך
window.addEventListener('error', (e) => {
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:red;color:white;padding:12px;font-size:14px;z-index:99999;direction:ltr;'
  div.textContent = 'ERROR: ' + e.message
  document.body.appendChild(div)
})

window.addEventListener('unhandledrejection', (e) => {
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;bottom:40px;left:0;right:0;background:orange;color:black;padding:12px;font-size:14px;z-index:99999;direction:ltr;'
  div.textContent = 'PROMISE ERROR: ' + (e.reason?.message || e.reason)
  document.body.appendChild(div)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)