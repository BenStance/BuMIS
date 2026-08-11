export function Select({ label, className = '', selectClassName = '', children, ...props }) {
  return (
    <label className={['field', className].join(' ').trim()}>
      {label ? <span>{label}</span> : null}
      <select
        {...props}
        className={[
          'w-full rounded-2xl border border-[var(--color-panel-border)] bg-white/75 px-4 py-3 text-[var(--color-text-primary)]',
          'shadow-sm outline-none transition focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]/25',
          'dark:bg-slate-950/45 dark:text-slate-100',
          selectClassName,
        ].join(' ')}
      >
        {children}
      </select>
    </label>
  );
}

export default Select;
