import { useEffect, useState } from 'react';

export function AdminSignOut() {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetch('/api/auth/csrf', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken ?? ''))
      .catch(() => {});
  }, []);

  return (
    <form method="post" action="/api/auth/signout">
      {csrfToken && <input type="hidden" name="csrfToken" value={csrfToken} />}
      <input type="hidden" name="callbackUrl" value="/admin/login" />
      <button
        type="submit"
        disabled={!csrfToken}
        className="admin-nav-link text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        Salir
      </button>
    </form>
  );
}
