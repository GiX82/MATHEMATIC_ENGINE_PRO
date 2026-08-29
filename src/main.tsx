import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './bootstrap'
import './i18n'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
