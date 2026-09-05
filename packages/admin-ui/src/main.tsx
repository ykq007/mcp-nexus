import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './i18n';
// Geist fonts — self-hosted via @fontsource; font-display: swap in each weight
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
// CSS layer order: tokens → base → components → legacy page styles
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles.css';
import './styles/network-ledger.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
