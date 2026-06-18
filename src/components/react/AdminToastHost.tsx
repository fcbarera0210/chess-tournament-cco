import { useEffect, useState } from 'react';
import {
  dismissAdminToast,
  subscribeAdminToasts,
  type AdminToast,
} from '../../lib/admin-toast';

export function AdminToastHost() {
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  useEffect(() => subscribeAdminToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="admin-toast-host" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`admin-toast admin-toast-${toast.variant}`}
          role="alert"
        >
          <p className="admin-toast-message">{toast.message}</p>
          <button
            type="button"
            className="admin-toast-close"
            aria-label="Cerrar"
            onClick={() => dismissAdminToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
