import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';
import './lib/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(14,12,25,0.95)',
            border: '1px solid rgba(139,92,246,0.25)',
            color: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            fontSize: '13px',
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>
);
