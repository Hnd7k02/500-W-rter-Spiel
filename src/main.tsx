import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './App';

// iOS zeigt :active-Zustände nur mit einem Touch-Listener.
document.addEventListener('touchstart', () => undefined, { passive: true });

const root = document.getElementById('root');
if (!root) throw new Error('#root fehlt');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
