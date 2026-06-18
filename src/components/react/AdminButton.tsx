import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
};

export function AdminButton({
  loading = false,
  variant = 'primary',
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  const variantClass =
    variant === 'primary'
      ? 'admin-btn-primary'
      : variant === 'secondary'
        ? 'admin-btn-secondary'
        : variant === 'danger'
          ? 'admin-btn-danger'
          : '';

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`admin-btn gap-2 ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {loading && <span className="admin-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
