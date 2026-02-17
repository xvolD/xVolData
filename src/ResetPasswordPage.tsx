import { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { validateResetToken, resetPassword, validatePassword } from './localAuth';
import { cn } from './utils/cn';

interface ResetPasswordPageProps {
  token: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function ResetPasswordPage({ token, onSuccess, onBack }: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Проверка токена при загрузке
    const validation = validateResetToken(token);
    setTokenValid(validation.valid);
    setValidating(false);
    
    if (!validation.valid) {
      setError('Ссылка для восстановления пароля недействительна или истекла');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Заполните все поля');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await resetPassword(token, newPassword);
      if (result.success) {
        setSuccess('Пароль успешно изменен! Теперь вы можете войти с новым паролем.');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(result.error || 'Ошибка сброса пароля');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = newPassword ? validatePassword(newPassword) : null;

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-400">Проверка ссылки...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Недействительная ссылка</h2>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-700 p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-center text-xl font-bold text-white">Создание нового пароля</h2>
          <p className="mt-1 text-center text-sm text-slate-400">
            Введите новый пароль для вашего аккаунта
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
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

          {/* New Password Input */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Новый пароль
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                disabled={loading || success !== ''}
              />
            </div>

            {/* Password Strength Indicator */}
            {newPassword && passwordValidation && (
              <div className="mt-2">
                {passwordValidation.isValid ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Надежный пароль</span>
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

          {/* Confirm Password Input */}
          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Подтвердите пароль
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                disabled={loading || success !== ''}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                <span>Пароли не совпадают</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success !== '' || !passwordValidation?.isValid || newPassword !== confirmPassword}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Пароль изменен
              </>
            ) : (
              'Сохранить новый пароль'
            )}
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={onBack}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться на главную
          </button>
        </form>
      </div>
    </div>
  );
}
