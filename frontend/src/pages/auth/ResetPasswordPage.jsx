import { useState } from 'react';
import { resetPassword } from '../../api/auth.api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { navigateTo } from '../../utils/navigation.js';

export function ResetPasswordPage() {
  const [form, setForm] = useState({ email: '', otp: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await resetPassword(form);
      setMessage(response.message || 'Password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5 text-[var(--color-text-primary)]" onSubmit={submit}>
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">Security</div>
        <h1 className="text-3xl font-black tracking-tight">Reset password</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Enter the OTP we sent to your email and choose a new password.
        </p>
      </div>

      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        required
      />

      <Input
        label="OTP"
        value={form.otp}
        onChange={(event) => setForm({ ...form, otp: event.target.value })}
        required
      />

      <Input
        label="New password"
        type="password"
        value={form.newPassword}
        onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
        required
      />

      {message ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading}>
          <CheckCircle2 className="h-4 w-4" />
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
        <button
          type="button"
          onClick={() => navigateTo('/login')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-panel-border)] bg-white/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/15 dark:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>
      </div>
    </form>
  );
}

export default ResetPasswordPage;
