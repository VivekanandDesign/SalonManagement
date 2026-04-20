import { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Scissors, Eye, EyeOff } from 'lucide-react';
import { settings as settingsApi } from '../services/api';

export default function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [salonName, setSalonName] = useState('My Salon');
  const [salonLogo, setSalonLogo] = useState(null);

  useEffect(() => {
    settingsApi.getPublic().then(d => { if (d.salonName) setSalonName(d.salonName); if (d.logo) setSalonLogo(d.logo); }).catch(() => {});
  }, []);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requiresVerification) {
        navigate('/verify-otp', { state: { email: result.email || email } });
        return;
      }
      if (!result.success) {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle(credentialResponse.credential);
      if (!result.success) setError(result.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            {salonLogo ? <img src={salonLogo} alt="" className="w-full h-full object-cover" /> : <Scissors size={28} className="text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-surface-800">{salonName}</h1>
          <p className="text-sm text-surface-500 mt-1">Salon Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-card-hover border border-surface-100 p-5 sm:p-6 md:p-8">
          <h2 className="text-lg font-semibold text-surface-800 mb-1">Welcome back</h2>
          <p className="text-sm text-surface-400 mb-6">Sign in to your account to continue</p>

          {sessionExpired && !error && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
              Your session has expired. Please log in again.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-red-200 text-sm text-danger-700">
              {error}
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-5">
            <div className="flex justify-center [&>div]:w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed')}
                text="signin_with"
                shape="rectangular"
                width="100%"
              />
            </div>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-surface-400">or sign in with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@orrenza.com"
                className="w-full px-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400
                  placeholder:text-surface-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 pr-10 text-sm bg-surface-50 border border-surface-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400
                    placeholder:text-surface-400 transition-all"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg
                hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-700">Create account</Link>
          </p>


        </div>
      </div>
    </div>
  );
}
