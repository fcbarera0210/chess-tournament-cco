export type AdminPillOption = {
  value: string;
  label: string;
  meta?: string | number;
  disabled?: boolean;
};

type Props = {
  options: AdminPillOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

export function AdminPillGroup({
  options,
  value,
  onChange,
  label,
  disabled = false,
  className = '',
}: Props) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className="admin-pill"
          >
            {selected && (
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
              </svg>
            )}
            <span>{option.label}</span>
            {option.meta !== undefined && <span className="admin-pill-meta">{option.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}
