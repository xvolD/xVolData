import { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { register, login, validatePassword, requestPasswordReset, generateResetToken } from './localAuth';
import { cn } from './utils/cn';
import type { Language } from './i18n';
import emailjs from '@emailjs/browser';

type AuthView = 'login' | 'register' | 'reset';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
  t: (key: string) => string;
}

export function AuthModal({ onClose, onSuccess, language, t }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      setError(t('authFillAllFields'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(emailOrUsername, password);
      if (result.success) {
        setSuccess(t('authLoginSuccess'));
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setError(result.error || t('authLoginFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authUnknownError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      setError(t('authFillAllFields'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await register(emailOrUsername, password);
      if (result.success) {
        setSuccess(t('authRegisterSuccess'));
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setError(result.error || t('authRegisterFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authUnknownError'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!emailOrUsername.trim()) {
      setError(t('authEnterEmail'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = requestPasswordReset(emailOrUsername);
      if (result.success && result.email && result.userId) {
        // Генерация токена восстановления
        const token = generateResetToken(result.userId);
        
        // Формирование ссылки для восстановления
        const resetLink = `${window.location.origin}${window.location.pathname}?reset=${token}`;
        
        // Отправка email через EmailJS
        try {
          await emailjs.send(
            'service_xvoldata', // Service ID (нужно создать в EmailJS)
            'template_reset', // Template ID (нужно создать в EmailJS)
            {
              to_email: result.email,
              to_name: emailOrUsername,
              reset_link: resetLink,
              app_name: 'xVolData',
            },
            'YOUR_PUBLIC_KEY' // Public Key из EmailJS (нужно заменить)
          );
          
          setSuccess(`Письмо с инструкциями отправлено на ${result.email}`);
          setTimeout(() => {
            setView('login');
            setSuccess('');
          }, 3000);
        } catch (emailError) {
          // Если отправка email не удалась, показываем ссылку напрямую
          setSuccess(`Ссылка для восстановления: ${resetLink}`);
          console.error('Email sending failed:', emailError);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authUnknownError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === 'login') handleLogin();
    else if (view === 'register') handleRegister();
    else if (view === 'reset') handleReset();
  };

  // Password strength indicator
  const passwordValidation = password ? validatePassword(password) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              {view === 'login' && t('authLogin')}
              {view === 'register' && t('authRegister')}
              {view === 'reset' && t('authResetPassword')}
            </h2>
            <p className="text-xs text-slate-400">
              {view === 'login' && t('authLoginSubtitle')}
              {view === 'register' && t('authRegisterSubtitle')}
              {view === 'reset' && t('authResetSubtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Email/Username Input */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              {view === 'reset' ? t('authEmail') : t('authEmailOrUsername')}
            </label>
            <div className="relative">
              {view === 'reset' ? (
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              ) : (
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              )}
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => {
                  setEmailOrUsername(e.target.value);
                  setError('');
                }}
                placeholder={view === 'reset' ? 'user@example.com' : 'username or email'}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          {view !== 'reset' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                {t('authPassword')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                  disabled={loading}
                />
              </div>

              {/* Password Strength Indicator (Register only) */}
              {view === 'register' && password && passwordValidation && (
                <div className="mt-2">
                  {passwordValidation.isValid ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{t('authPasswordStrong')}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {passwordValidation.errors.map((err, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('authLoading')}
              </>
            ) : (
              <>
                {view === 'login' && t('authLogin')}
                {view === 'register' && t('authRegister')}
                {view === 'reset' && t('authSendReset')}
              </>
            )}
          </button>

          {/* View Switcher */}
          <div className="mt-4 text-center text-xs text-slate-500">
            {view === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setView('register');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  {t('authNoAccount')}
                </button>
                <span className="mx-2">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setView('reset');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  {t('authForgotPassword')}
                </button>
              </>
            )}
            {view === 'register' && (
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError('');
                  setSuccess('');
                }}
                className="text-emerald-400 hover:text-emerald-300"
              >
                {t('authHaveAccount')}
              </button>
            )}
            {view === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError('');
                  setSuccess('');
                }}
                className="text-emerald-400 hover:text-emerald-300"
              >
                {t('authBackToLogin')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
