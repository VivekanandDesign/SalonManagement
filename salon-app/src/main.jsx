import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Load Facebook SDK
(function loadFacebookSDK() {
  const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  if (!fbAppId) return;
  window.fbAsyncInit = function () {
    window.FB.init({ appId: fbAppId, cookie: true, xfbml: false, version: 'v19.0' });
  };
  const script = document.createElement('script');
  script.src = 'https://connect.facebook.net/en_US/sdk.js';
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
