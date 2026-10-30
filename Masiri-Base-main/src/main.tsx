import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any lingering service workers in dev mode to prevent cached HTML script parsing errors
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
