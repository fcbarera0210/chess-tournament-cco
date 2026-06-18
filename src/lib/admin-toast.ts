export type AdminToastVariant = 'success' | 'error' | 'info';

export type AdminToast = {
  id: string;
  message: string;
  variant: AdminToastVariant;
};

type Listener = (toasts: AdminToast[]) => void;

let toasts: AdminToast[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

export function subscribeAdminToasts(listener: Listener) {
  listeners.add(listener);
  listener([...toasts]);
  return () => listeners.delete(listener);
}

export function dismissAdminToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  notify();
}

export function showAdminToast(message: string, variant: AdminToastVariant = 'info') {
  const toast: AdminToast = {
    id: crypto.randomUUID(),
    message,
    variant,
  };
  toasts = [...toasts, toast];
  notify();

  window.setTimeout(() => dismissAdminToast(toast.id), 5000);
}
