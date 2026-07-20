import { FormEvent, useState } from 'react';
import { login, logout, SessionUser } from '../../api';

export function LoginScreen({ onSuccess }: { onSuccess: (user: SessionUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role !== 'LGU_ADMIN') {
        logout();
        throw new Error('This portal is restricted to LGU administrator accounts.');
      }
      onSuccess(user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-mark">✓</div><p className="eyebrow">TRINIDAD, BOHOL · LGU PORTAL</p><h1>Welcome back</h1><p className="auth-intro">Sign in to manage verified drivers, vehicle QR codes, fares, and incidents.</p>{error && <div className="auth-error" role="alert">{error}</div>}<form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="primary auth-submit" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Sign in to LGU portal'}</button></form><p className="auth-footnote">Authorized LGU personnel only.</p></section></main>;
}
