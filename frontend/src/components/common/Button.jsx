const VARIANTS = {
  primary:
    'bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))] text-white shadow-[0_18px_48px_rgba(6,71,137,0.28)] hover:shadow-[0_20px_60px_rgba(6,71,137,0.36)]',
  secondary:
    'border border-[var(--color-panel-border)] bg-white/10 text-[var(--color-text-primary)] hover:bg-white/15 dark:bg-white/5 dark:hover:bg-white/10',
  danger:
    'border border-red-400/20 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-200',
};

export function Button({ className = '', variant = 'primary', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={[
        'group inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
        'hover:-translate-y-0.5 active:translate-y-0',
        VARIANTS[variant] || VARIANTS.primary,
        className,
      ].join(' ')}
      {...props}
    />
  );
}

export default Button;
