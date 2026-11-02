import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// התקנה מ-Chrome: service worker רק כשהאפליקציה מוגשת מהשורש (Vercel), לא בקישור raw.githack.
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.BASE_URL === '/') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
