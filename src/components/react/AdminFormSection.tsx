import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: ReactNode;
  step?: number;
  tone?: 'default' | 'danger';
  children: ReactNode;
};

export function AdminFormSection({ title, description, step, tone = 'default', children }: Props) {
  const danger = tone === 'danger';
  return (
    <section
      className={`admin-card p-5 sm:p-6 ${danger ? 'admin-card-danger' : ''}`.trim()}
    >
      <header className="mb-5 flex items-start gap-3">
        {step !== undefined && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {step}
          </span>
        )}
        <div>
          <h2
            className={`font-display text-lg font-bold leading-tight ${danger ? 'text-red-700' : ''}`.trim()}
          >
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
