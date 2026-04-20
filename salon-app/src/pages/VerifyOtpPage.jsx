import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as authApi, settings as settingsApi } from '../services/api';
import { Scissors, Mail, RotateCcw } from 'lucide-react';

export default function VerifyOtpPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [salonName, setSalonName] = useState('My Salon');
  const inputRefs = useRef([]);

  useEffect(() => {
    settingsApi.getPublic().then(d => { if (d.salonName) setSalonName(d.salonName); }).catch(() => {});
  }, []);

  if (isAuthenticated) return <Navigate to="/" replace />;
  if (!email) return <Navigate to="/signup" replace />;

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otpString) => {
    const code = otpString || otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await authApi.verifyOtp(email, code);
      // Store auth data from verified response
      localStorage.setItem('glowdesk_token', result.token);
      const safeUser = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role.toLowerCase() === 'owner' ? 'admin' : result.user.role.toLowerCase(),
        avatar: result.user.avatar || null,
        initials: result.user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      };
      localStorage.setItem('glowdesk_user', JSON.stringify(safeUser));
      setSuccess('Email verified! Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      setError(err.message || 'Verification failed');
      // Clear OTP on failure
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendLoading(true);
    setError('');
    try {
      await authApi.resendOtp(email);
      setSuccess('A new OTP has been sent to your email');
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-800">{salonName}</h1>
          <p className="text-sm text-surface-500 mt-1">Salon Management</p>
        </div>

        {/* OTP Card */}
        <div className="bg-white rounded-2xl shadow-card-hover border border-surface-100 p-5 sm:p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Mail size={24} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold text-surface-800 mb-1">Verify your email</h2>
            <p className="text-sm text-surface-400">
              We sent a 6-digit code to<br />
              <span className="font-medium text-surface-600">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-red-200 text-sm text-danger-700 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 text-center">
              {success}
            </div>
          )}

          {/* OTP Input */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-semibold bg-surface-50 border border-surface-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400
                  transition-all"
                disabled={loading}
              />
            ))}
          </div>

          <button
            onClick={() => handleVerify()}
            disabled={loading || otp.some(d => d === '')}
            className="w-full py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg
              hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200
              disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="mt-5 text-center">
            <p className="text-sm text-surface-400 mb-2">Didn&apos;t receive the code?</p>
            <button
              onClick={handleResend}
              disabled={resendLoading || cooldown > 0}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={14} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-surface-500">
            Wrong email?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Go back
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
