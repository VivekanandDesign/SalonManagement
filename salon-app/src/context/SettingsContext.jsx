import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settings as settingsApi } from '../services/api';

const SettingsContext = createContext(null);

const DEFAULTS = {
  salonName: 'My Salon',
  tagline: 'Premium Salon & Beauty Services',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
  logo: null,
  currency: 'INR',
};

export function SettingsProvider({ children }) {
  const [salonSettings, setSalonSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await settingsApi.get();
      setSalonSettings({
        salonName: data.salonName || DEFAULTS.salonName,
        tagline: data.tagline || DEFAULTS.tagline,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        gstNumber: data.gstNumber || '',
        logo: data.logo || null,
        currency: data.currency || 'INR',
      });
      setLoaded(true);
    } catch (err) {
      console.error('Failed to load salon settings:', err);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('glowdesk_token');
    if (token) fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ ...salonSettings, loaded, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) return DEFAULTS;
  return ctx;
}
