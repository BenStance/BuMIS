import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { Building2, CheckCircle2, KeyRound, Mail, Moon, Sun, UserRound, ArrowRight } from 'lucide-react';
import { registerBusiness, verifyBusinessRegistration } from '../../api/auth.api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { navigateTo } from '../../utils/navigation.js';
import logoImage from '../../assets/images/logo.png';

const initialForm = {
  businessName: '',
  businessEmail: '',
  phone: '',
  address: '',
  tin: '',
  ownerFullName: '',
  ownerEmail: '',
  ownerPassword: '',
  confirmPassword: '',
};

export function BusinessRegistrationForm({ onComplete, onCancel, embedded = false }) {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState('details');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submitRegistration = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (form.ownerPassword !== form.confirmPassword) {
      setError('Owner passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      const response = await registerBusiness(payload);
      setMessage(response.message || 'An OTP has been sent to the owner email.');
      setStep('verify');
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Registration could not be started.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await verifyBusinessRegistration({ email: form.ownerEmail, otp });
      setMessage(response.message || 'Business registered successfully.');
      setStep('complete');
      onComplete?.(response);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'complete') {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="py-8 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
        >
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        </motion.div>
        <h2 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">Registration complete</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">{message}</p>
        <Button
          className="mt-6 w-full sm:w-auto"
          onClick={() => embedded ? onCancel?.() : navigateTo('/login')}
        >
          <span className="flex items-center justify-center gap-2">
            {embedded ? 'Close' : 'Continue to Sign In'}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Button>
      </motion.div>
    );
  }

  if (step === 'verify') {
    return (
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        onSubmit={submitOtp}
        className="space-y-5"
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <KeyRound className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">Verify owner email</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Enter the six-digit OTP sent to <strong className="text-[var(--color-text-primary)]">{form.ownerEmail}</strong>.
          </p>
        </div>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-300"
          >
            {message}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300"
          >
            {error}
          </motion.div>
        )}
        <Input
          label="Verification OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          inputClassName="text-center text-xl tracking-[0.45em]"
          minLength={6}
          maxLength={6}
          required
        />
        <Button
          type="submit"
          disabled={submitting || otp.length !== 6}
          className="w-full"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verifying…
            </span>
          ) : (
            'Verify and activate business'
          )}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => setStep('details')}
            className="text-[var(--brand-primary)] transition-colors hover:underline"
          >
            Edit details / resend OTP
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.form>
    );
  }

  return (
    <motion.form
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      onSubmit={submitRegistration}
      className="space-y-6"
    >
      <div>
        <div className="mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
          <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
          <h2 className="text-lg font-bold">Organization details</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Organization name *"
            value={form.businessName}
            onChange={update('businessName')}
            maxLength={200}
            required
          />
          <Input
            label="Organization email *"
            type="email"
            value={form.businessEmail}
            onChange={update('businessEmail')}
            maxLength={150}
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={update('phone')}
            maxLength={50}
          />
          <Input
            label="TIN"
            value={form.tin}
            onChange={update('tin')}
            maxLength={50}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={update('address')}
            maxLength={300}
            className="sm:col-span-2"
          />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
          <UserRound className="h-5 w-5 text-[var(--brand-primary)]" />
          <h2 className="text-lg font-bold">Business owner</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Owner full name *"
            value={form.ownerFullName}
            onChange={update('ownerFullName')}
            maxLength={200}
            required
          />
          <Input
            label="Owner email *"
            type="email"
            value={form.ownerEmail}
            onChange={update('ownerEmail')}
            maxLength={150}
            required
          />
          <Input
            label="Password *"
            type="password"
            value={form.ownerPassword}
            onChange={update('ownerPassword')}
            minLength={6}
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirm password *"
            type="password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300"
        >
          {error}
        </motion.div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="min-w-[160px]">
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending OTP…
            </span>
          ) : (
            'Register and send OTP'
          )}
        </Button>
      </div>
    </motion.form>
  );
}
// export default BusinessRegistrationForm;

export function RegisterBusinessPage() {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
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

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--color-page-bg)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div
          className={`absolute inset-0 transition-colors duration-700 ${
            darkMode
              ? 'bg-[radial-gradient(circle_at_top_left,rgba(6,71,137,0.2),transparent_30%),linear-gradient(135deg,#020617_0%,#08111f_50%,#0b1224_100%)]'
              : 'bg-[radial-gradient(circle_at_top_left,rgba(235,242,250,0.95),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eef5fb_50%,#ffffff_100%)]'
          }`}
        />

        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 80, 0], y: [0, -40, 0] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
          className={`absolute top-1/4 -left-20 h-80 w-80 rounded-full blur-3xl opacity-30 ${
            darkMode ? 'bg-[#064789]' : 'bg-[#427aa1]'
          }`}
        />

        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -60, 0], y: [0, 50, 0] }}
          transition={{ duration: 25, repeat: Infinity, repeatType: 'reverse' }}
          className={`absolute bottom-1/4 -right-20 h-80 w-80 rounded-full blur-3xl opacity-30 ${
            darkMode ? 'bg-[#427aa1]' : 'bg-[#064789]'
          }`}
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

      {/* Particles */}
      <Particles
        id="register-particles"
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

      {/* Theme Toggle */}
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

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div
          className={`w-full max-w-3xl transition-all duration-700 transform ${
            isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2rem] border border-[var(--color-panel-border)] p-8 shadow-2xl backdrop-blur-2xl"
            style={{
              background: darkMode ? 'rgba(8, 15, 30, 0.82)' : 'rgba(255, 255, 255, 0.88)',
            }}
          >
            {/* Logo */}
            <div className="mb-8 text-center">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ y: { duration: 2.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' } }}
                className="relative mb-4 inline-flex"
              >
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
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

              <h1 className="mb-2 text-3xl font-bold text-[var(--color-text-primary)]">
                Register your organization
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Create the organization and its first Business Owner account.
              </p>
            </div>

            {/* Registration Form */}
            <BusinessRegistrationForm onCancel={() => navigateTo('/login')} />
          </motion.div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              className="inline-flex items-center gap-2 text-sm text-[var(--brand-primary)] transition-colors hover:underline"
            >
              <Mail className="h-4 w-4" />
              Already registered? Sign in
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Overlay */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-20"
        style={{
          background: `linear-gradient(to top, ${
            darkMode ? 'rgba(2,6,23,0.9)' : 'rgba(255,255,255,0.9)'
          }, transparent)`,
        }}
      />
    </div>
  );
}

export default RegisterBusinessPage;
