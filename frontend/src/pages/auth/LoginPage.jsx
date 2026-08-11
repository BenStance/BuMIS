import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { login as loginRequest } from '../../api/auth.api.js';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import logoImage from '../../assets/images/logo.png';
import { ArrowRight, Lock, Mail, Moon, Sun } from 'lucide-react';
import { navigateTo } from '../../utils/navigation.js';

function resolveRoute(user) {
  const roleName = String(user?.role?.name || user?.role || '').toLowerCase();
  if (roleName.includes('admin')) {
    return '/admin';
  }

  if (user?.needsSubscription || (user?.subscription && user.subscription.status !== 'active')) {
    return '/subscription-control';
  }

  return '/dashboard';
}

export function LoginPage({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { darkMode, toggleTheme, getBrandPrimary, getBrandSecondary } = useThemeContext();

  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  const particlesInit = useMemo(() => async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsAnimating(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const session = await loginRequest({ email, password });

      if (typeof onSuccess === 'function') {
        onSuccess(session);
      }

      navigateTo(resolveRoute(session.user), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return <Loader fullScreen label="Preparing login..." />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--color-page-bg)' }}>
      <div className="fixed inset-0 z-0">
        <div className={`absolute inset-0 transition-colors duration-700 ${darkMode ? 'bg-[radial-gradient(circle_at_top_left,rgba(6,71,137,0.2),transparent_30%),linear-gradient(135deg,#020617_0%,#08111f_50%,#0b1224_100%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(235,242,250,0.95),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eef5fb_50%,#ffffff_100%)]'}`} />

        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 80, 0], y: [0, -40, 0] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
          className={`absolute top-1/4 -left-20 h-80 w-80 rounded-full blur-3xl opacity-30 ${darkMode ? 'bg-[#064789]' : 'bg-[#427aa1]'}`}
        />

        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ duration: 25, repeat: Infinity, repeatType: 'reverse' }}
          className={`absolute bottom-1/4 -right-20 h-80 w-80 rounded-full blur-3xl opacity-30 ${darkMode ? 'bg-[#427aa1]' : 'bg-[#064789]'}`}
        />

        {darkMode && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, ${secondaryColor} 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        )}
      </div>

      <Particles
        id="login-particles"
        init={particlesInit}
        options={{
          background: { color: { value: 'transparent' } },
          fpsLimit: 60,
          interactivity: {
            events: {
              onHover: { enable: true, mode: 'repulse' },
              resize: true,
            },
            modes: { repulse: { distance: 80, duration: 0.4 } },
          },
          particles: {
            color: { value: darkMode ? secondaryColor : primaryColor },
            links: {
              color: darkMode ? secondaryColor : primaryColor,
              distance: 150,
              enable: true,
              opacity: darkMode ? 0.06 : 0.1,
              width: 1,
            },
            move: {
              enable: true,
              speed: 0.5,
              direction: 'none',
              random: true,
              outModes: { default: 'bounce' },
            },
            number: { density: { enable: true, area: 800 }, value: 40 },
            opacity: { value: darkMode ? 0.08 : 0.12 },
            shape: { type: 'circle' },
            size: { value: { min: 1, max: 2 } },
          },
          detectRetina: true,
        }}
        className="fixed inset-0 z-0 pointer-events-none"
      />

      <button
        onClick={toggleTheme}
        className="group fixed right-4 top-4 z-50 rounded-2xl border border-[var(--color-panel-border)] bg-white/80 p-2.5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:bg-slate-900/70"
        aria-label="Toggle theme"
      >
        {darkMode ? (
          <Sun className="h-5 w-5 text-amber-300 transition-transform duration-300 group-hover:rotate-90" />
        ) : (
          <Moon className="h-5 w-5 text-slate-700 transition-transform duration-300 group-hover:rotate-12" />
        )}
      </button>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className={`w-full max-w-md transition-all duration-700 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2rem] border border-[var(--color-panel-border)] p-8 shadow-2xl backdrop-blur-2xl"
            style={{
              background: darkMode ? 'rgba(8, 15, 30, 0.82)' : 'rgba(255, 255, 255, 0.88)',
            }}
          >
            <div className="mb-8 text-center">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ y: { duration: 2.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' } }}
                className="relative mb-4 inline-flex"
              >
                <button
                  type="button"
                  onClick={() => {
                    navigateTo('/');
                  }}
                  aria-label="Go to landing page"
                  className="relative focus:outline-none"
                >
                  <div
                    className="absolute inset-0 rounded-full blur-3xl opacity-40"
                    style={{ background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                  />
                  <div
                    className="absolute inset-0 rounded-full blur-2xl opacity-20"
                    style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
                  />
                  <img
                    src={logoImage}
                    alt="INVEXA logo"
                    className="relative z-10 h-28 w-auto cursor-pointer drop-shadow-2xl sm:h-32 md:h-36"
                    style={{ filter: `drop-shadow(0 0 20px ${primaryColor}80)` }}
                  />
                </button>
              </motion.div>

              <h1 className="mb-2 text-3xl font-bold text-[var(--color-text-primary)]">Welcome Back</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Sign in to your INVEXA account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    inputClassName="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    inputClassName="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3"
                >
                  <p className="text-center text-sm text-red-600 dark:text-red-300">{error}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-3 text-base font-semibold"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                )}
              </Button>

              <div className="mt-6 flex justify-between gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    navigateTo('/forgot-password');
                  }}
                  className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--brand-primary)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-20"
        style={{
          background: `linear-gradient(to top, ${darkMode ? 'rgba(2,6,23,0.9)' : 'rgba(255,255,255,0.9)'}, transparent)`,
        }}
      />
    </div>
  );
}

export default LoginPage;
