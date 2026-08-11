import { motion } from 'framer-motion';
import { useThemeContext } from '../context/ThemeContext.jsx';

export default function PageContainer({ title, subtitle, children, actions, className = '' }) {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`space-y-6 ${className}`.trim()}
    >
      {/* Header Card */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-5 shadow-lg backdrop-blur-xl sm:p-6"
        style={{
          background: darkMode
            ? 'rgba(8, 15, 30, 0.7)'
            : 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
          }}
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">
              INVEXA Workspace
            </p>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-3xl text-sm text-[var(--color-text-secondary)] sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>

      {/* Main Content Card */}
      <div
        className="rounded-2xl border border-[var(--color-panel-border)] p-4 shadow-lg backdrop-blur-xl sm:p-6"
        style={{
          background: darkMode
            ? 'rgba(8, 15, 30, 0.7)'
            : 'rgba(255, 255, 255, 0.8)',
        }}
      >
        {children}
      </div>
    </motion.section>
  );
}
