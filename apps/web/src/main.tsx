import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// pr reviewer test Mon Apr 27 01:41:46 IST 2026
// retrigger Mon Apr 27 01:51:23 IST 2026
