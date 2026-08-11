// src/components/common/Loader.jsx
import { useThemeContext } from '../../context/ThemeContext';

export function Loader({ size = 'md', fullScreen = false, label = 'Loading...' }) {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-14 h-14 border-4',
  };

  const loader = (
    <div className="relative flex items-center justify-center">
      <div
        className={[
          sizeClasses[size] || sizeClasses.md,
          'rounded-full border-[3px] border-transparent border-t-white animate-spin',
        ].join(' ')}
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div
        className="absolute inset-0 rounded-full blur-sm opacity-50"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-xl">
        <div
          className="flex flex-col items-center gap-3 rounded-[1.75rem] border p-6 shadow-2xl backdrop-blur-xl"
          style={{
            background: darkMode ? 'rgba(8, 15, 30, 0.86)' : 'rgba(255, 255, 255, 0.88)',
            borderColor: darkMode ? 'rgba(126, 165, 191, 0.18)' : 'rgba(6, 71, 137, 0.12)',
          }}
        >
          {loader}
          <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
        </div>
      </div>
    );
  }

  return loader;
}

export default Loader;
