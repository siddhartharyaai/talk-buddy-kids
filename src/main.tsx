import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Step 10: Production build v1.0.0 welcome message
if (import.meta.env.PROD) {
  console.log('%c🤖 Buddy v1.0.0 - Kids Voice Companion', 'color: #6366f1; font-size: 16px; font-weight: bold;');
  console.log('%c✅ Production build ready!', 'color: #10b981; font-weight: bold;');
  console.log('%c🚀 All 10 steps completed successfully', 'color: #8b5cf6;');
}

// Step 10: PWA Service Worker Registration for v1.0.0
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ PWA: Service Worker registered successfully', registration.scope);
      })
      .catch((error) => {
        console.log('❌ PWA: Service Worker registration failed', error);
      });
  });
}
