import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/format';

const control =
  'w-full rounded-xl border border-line bg-white px-4 text-ink placeholder:text-muted/70 transition ' +
  'focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:bg-sand/60';

type FieldProps = { label: string; error?: string; hint?: ReactNode; className?: string };

function Field({
  label,
  error,
  hint,
  className,
  id,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-plum-900">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ label, error, hint, className, ...props }: FieldProps & ComponentProps<'input'>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} className={className}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(control, 'h-12', error && 'border-danger')}
        {...props}
      />
    </Field>
  );
}

export function Textarea({ label, error, hint, className, ...props }: FieldProps & ComponentProps<'textarea'>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} className={className}>
      <textarea id={id} aria-invalid={!!error} className={cn(control, 'min-h-24 py-3', error && 'border-danger')} {...props} />
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  className,
  children,
  ...props
}: FieldProps & ComponentProps<'select'>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} className={className}>
      <select id={id} aria-invalid={!!error} className={cn(control, 'h-12 appearance-auto')} {...props}>
        {children}
      </select>
    </Field>
  );
}

/** Field-level errors from a zod parse or an API 400 `details` array. */
export function fieldErrors(issues?: { field?: string; path?: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues ?? []) {
    const key = i.field ?? i.path?.join('.') ?? '';
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}
