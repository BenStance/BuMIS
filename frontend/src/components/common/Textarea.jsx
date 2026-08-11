export function Textarea({ label, className = '', textareaClassName = '', ...props }) {
  return (
    <label className={['field', className].join(' ').trim()}>
      {label ? <span>{label}</span> : null}
      <textarea
        {...props}
        className={[
          'min-h-28 w-full rounded-2xl border border-[var(--color-panel-border)] bg-white/75 px-4 py-3 text-[var(--color-text-primary)]',
          'shadow-sm outline-none transition placeholder:text-[var(--color-text-tertiary)]',
          'focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]/25',
          'dark:bg-slate-950/45 dark:text-slate-100',
          textareaClassName,
        ].join(' ')}
      />
    </label>
  );
}

export default Textarea;
