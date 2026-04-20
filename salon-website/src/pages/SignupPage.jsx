import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles, Check } from 'lucide-react';

const API_BASE = '/api';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'http://localhost:5173';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setError('');
      setLoading(true);
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        }).then(r => r.json());

        const res = await fetch(`${API_BASE}/auth/oauth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleId: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.picture,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Google sign up failed');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'http://localhost:5173';
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google sign up failed'),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-surface-900">Orrenza</span>
        </Link>

        <div className="bg-white rounded-xl border border-surface-100 shadow-card-hover p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-surface-900 text-center">Create Your Account</h1>
          <p className="mt-1 text-sm text-surface-400 text-center">Start managing your salon for free</p>

          {/* OAuth Buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => googleLogin()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign up with Google
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-200" />
            <span className="text-xs text-surface-400">or sign up with email</span>
            <div className="flex-1 h-px bg-surface-200" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="px-4 py-2.5 bg-red-50 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all"
                  placeholder="Repeat your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors shadow-card disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'} <ArrowRight size={16} />
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-surface-100 space-y-2">
            {['Free forever — no credit card needed', 'Full access to all 20+ features', 'Self-host or use cloud (coming soon)'].map((b) => (
              <div key={b} className="flex items-center gap-2 text-xs text-surface-400">
                <Check size={12} className="text-green-500 shrink-0" /> {b}
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-surface-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
