import './styles.css';
import 'leaflet/dist/leaflet.css';
import { createApp } from './app.js';
import { registerServiceWorker } from './services/notification.js';

if (import.meta.env.PROD) {
  registerServiceWorker().catch((error) => {
    console.error('Service worker registration failed.', error);
  });
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

createApp(document.querySelector('#app'));
