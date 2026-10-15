import { FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractApiError } from '../api/employeeApi';

export const DEMO_USERNAME = 'admin';
export const DEMO_PASSWORD = 'admin123';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login, isAuthenticated, sessionExpired, clearSessionExpired } = useAuth();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from ?? '/employees';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const fillDemoCredentials = (): void => {
    setUsername(DEMO_USERNAME);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    clearSessionExpired();
    try {
      await login(username, password);
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Brand panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-indigo-400/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight">Kloudspot EMS</p>
            <p className="text-sm text-brand-100">Employee Management System</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Manage your workforce with confidence.</h1>
          <p className="mt-4 text-brand-100">
            Search, filter and maintain employee records across every department, with department KPIs
            and one-click CSV export.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-50">
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald-300" aria-hidden="true" />
              Secured with stateless HTTP Basic authentication
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald-300" aria-hidden="true" />
              Server-side pagination, search and filtering
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald-300" aria-hidden="true" />
              RFC 4180 compliant CSV export honouring active filters
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">
          Spring Boot 3 · PostgreSQL 16 · React 18 · Vite · Tailwind CSS
        </p>
      </aside>

      {/* Login form */}
      <main className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">Kloudspot EMS</p>
              <p className="text-xs text-slate-500">Employee Management System</p>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use your administrator credentials to continue.</p>

            {sessionExpired ? (
              <div className="alert-info mt-6" role="status">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Your session is no longer valid. Please sign in again.</span>
              </div>
            ) : null}

            {error ? (
              <div className="alert-error mt-6" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="username" className="label">
                  Username
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    className="input pl-9"
                    placeholder="admin"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input pl-9 pr-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-dashed border-brand-300 bg-brand-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-800">Demo credentials</p>
                  <p className="mt-1 text-xs text-brand-700">
                    Username <code className="rounded bg-white px-1 py-0.5 font-mono">{DEMO_USERNAME}</code>{' '}
                    · Password{' '}
                    <code className="rounded bg-white px-1 py-0.5 font-mono">{DEMO_PASSWORD}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  disabled={submitting}
                  className="btn-secondary flex-shrink-0 !px-3 !py-1.5 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                  Fill Demo Credentials
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Kloudspot Candidate Technical Assessment · Employee Management System
          </p>
        </div>
      </main>
    </div>
  );
}
