import { createContext, useContext, useState, useCallback } from 'react';
import { auth as authApi } from '../services/api';

const AuthContext = createContext(null);

function buildSafeUser(userData) {
  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role.toLowerCase(),
    avatar: userData.avatar || null,
    initials: userData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('glowdesk_user');
    return saved ? JSON.parse(saved) : null;
  });

  const persistLogin = useCallback((userData, token) => {
    const safeUser = buildSafeUser(userData);
    // Treat OWNER as admin on the frontend
    if (safeUser.role === 'owner') safeUser.role = 'admin';
    localStorage.setItem('glowdesk_user', JSON.stringify(safeUser));
    localStorage.setItem('glowdesk_token', token);
    setUser(safeUser);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const result = await authApi.login(email, password);
      // Handle unverified accounts — backend returns 403 with requiresVerification
      if (result.requiresVerification) {
        return { success: false, requiresVerification: true, email: result.email, error: result.error };
      }
      persistLogin(result.user, result.token);
      return { success: true };
    } catch (err) {
      // Check if error response contains requiresVerification
      if (err.message?.includes('verify your email')) {
        return { success: false, requiresVerification: true, email, error: err.message };
      }
      return { success: false, error: err.message || 'Invalid email or password' };
    }
  }, [persistLogin]);

  const signup = useCallback(async (data) => {
    try {
      const result = await authApi.register(data);
      // New flow: registration requires OTP verification
      if (result.requiresVerification) {
        return { success: true, requiresVerification: true, email: result.email };
      }
      // Fallback for existing verified flow
      if (result.user && result.token) {
        persistLogin(result.user, result.token);
        return { success: true };
      }
      return { success: true, requiresVerification: true, email: data.email };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }, [persistLogin]);

  const loginWithGoogle = useCallback(async (credential) => {
    try {
      const { user: userData, token } = await authApi.google(credential);
      persistLogin(userData, token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Google sign-in failed' };
    }
  }, [persistLogin]);

  const loginWithFacebook = useCallback(async (accessToken, userID) => {
    try {
      const { user: userData, token } = await authApi.facebook(accessToken, userID);
      persistLogin(userData, token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Facebook sign-in failed' };
    }
  }, [persistLogin]);

  const logout = useCallback(() => {
    localStorage.removeItem('glowdesk_user');
    localStorage.removeItem('glowdesk_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, loginWithFacebook, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
