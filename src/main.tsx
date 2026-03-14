import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

// Initialize Capacitor features
const initCapacitor = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await SplashScreen.hide();
  } catch (e) {
    // Not running on a native device
    console.log('Capacitor plugins not available');
  }
};

initCapacitor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
