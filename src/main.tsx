import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { loadAvailableAssets } from './app/assets';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root fehlt');
void loadAvailableAssets().finally(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
