import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initNotifications } from './services/notifications.ts';

// Service worker : nécessaire pour notifier la fin de repos quand l'app est
// en arrière-plan (Android Chrome interdit new Notification() depuis une page).
void initNotifications();

createRoot(document.getElementById('root')!).render(<App />);
