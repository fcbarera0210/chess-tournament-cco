import { useEffect, useState } from 'react';

type Props = {
  authError?: string | null;
};

const errorMessages: Record<string, string> = {
  MissingCSRF: 'La verificación de seguridad expiró. Intenta de nuevo.',
  CredentialsSignin: 'Usuario o contraseña incorrectos.',
};

export function AdminLoginForm({ authError }: Props) {
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/csrf', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error('csrf');
        const data = await res.json();
        setCsrfToken(data.csrfToken ?? '');
      })
      .catch(() => {
        setError('No se pudo conectar con el servidor de autenticación.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted">Preparando formulario...</p>;
  }

  if (error || !csrfToken) {
    return (
      <div className="admin-card p-6 text-center">
        <p className="font-display text-lg font-bold">No se pudo iniciar sesión</p>
        <p className="mt-2 text-sm text-muted">
          {error || 'Revisa que AUTH_SECRET esté configurado en .env'}
        </p>
      </div>
    );
  }

  const urlError = authError ? (errorMessages[authError] ?? 'Error al iniciar sesión.') : '';

  return (
    <form method="post" action="/api/auth/callback/credentials" className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Iniciar sesión</h2>
        <p className="mt-1 text-sm text-muted">Usuario y contraseña de organizador</p>
      </div>

      {urlError && <p className="text-sm text-red-600">{urlError}</p>}

      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/admin" />

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="username">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="admin-input"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="admin-input"
        />
      </div>

      <button type="submit" className="admin-btn admin-btn-primary w-full py-3">
        Entrar
      </button>
    </form>
  );
}
