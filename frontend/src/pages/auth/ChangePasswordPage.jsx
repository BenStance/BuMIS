import { useState } from 'react';
import { changePassword } from '../../api/auth.api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { navigateTo } from '../../utils/navigation.js';

export function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await changePassword(form);
      setMessage(response.message || 'Password changed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5 text-[var(--color-text-primary)]" onSubmit={submit}>
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-tertiary)]">Security</div>
        <h1 className="text-3xl font-black tracking-tight">Change password</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Update your password from within the authenticated area.
        </p>
      </div>

      <Input
        label="Current password"
        type="password"
        value={form.currentPassword}
        onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
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
          <Sparkles className="h-4 w-4" />
          {loading ? 'Updating...' : 'Update password'}
        </Button>
        <button
          type="button"
          onClick={() => navigateTo('/dashboard')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-panel-border)] bg-white/10 px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/15 dark:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </form>
  );
}

export default ChangePasswordPage;
