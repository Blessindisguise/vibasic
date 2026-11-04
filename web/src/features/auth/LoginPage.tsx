import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertBanner, Button, TextField } from '../../design';
import logoWhite from '../../design/assets/logo-white.png';
import { homeFor, useAuth } from '../../app/auth';
import { ApiError } from '../../app/api';

export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      const u = await login(username, password);
      nav(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đăng nhập được. Thử lại sau.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--surface-page)' }}>
      <div style={{ width: 400, maxWidth: '100%', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ background: 'var(--surface-brand)', padding: '24px 24px 20px', display: 'flex', justifyContent: 'center' }}>
          <img src={logoWhite} alt="Vibasic" style={{ height: 64 }} />
        </div>
        <form onSubmit={submit} noValidate style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, font: 'var(--type-touch-heading)' }}>Đăng nhập</h1>
            <p style={{ margin: '4px 0 0', font: 'var(--type-body)', color: 'var(--text-secondary)' }}>
              Quản lý kho rõ ràng, quyết định đúng lúc.
            </p>
          </div>
          {error && <AlertBanner tone="danger">{error}</AlertBanner>}
          <TextField
            label="Tên đăng nhập" size="lg" icon="user" autoComplete="username" autoFocus required
            value={username} onChange={e => setUsername(e.target.value)}
            error={tried && !username.trim() ? 'Nhập tên đăng nhập.' : undefined}
          />
          <TextField
            label="Mật khẩu" size="lg" icon="lock" type="password" autoComplete="current-password" required
            value={password} onChange={e => setPassword(e.target.value)}
            error={tried && !password ? 'Nhập mật khẩu.' : undefined}
          />
          <Button type="submit" size="lg" fullWidth loading={busy}>Đăng nhập</Button>
        </form>
      </div>
    </main>
  );
}
