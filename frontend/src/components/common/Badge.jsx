const TONES = {
  default: 'bg-white/10 text-[var(--color-text-primary)]',
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-200',
};

export function Badge({ children, tone = 'default', className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        TONES[tone] || TONES.default,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export default Badge;
