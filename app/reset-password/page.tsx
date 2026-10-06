'use client';

// ================================================================
// BUYSUB — PASSWORD RESET LANDING
// File: app/reset-password/page.tsx
//
// Target of the "Forgot password" email (redirectTo in app/login/page.tsx).
// Supabase puts a recovery session in the URL; the client picks it up, then
// the user sets a new password. Renders without the app shell — see
// isNoShell in components/AppShell.tsx. The redirect URL must be on the
// Supabase Auth allow-list.
// ================================================================

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { T } from '@/lib/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

type Stage = 'checking' | 'ready' | 'saving' | 'done' | 'invalid';

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 'var(--bs-control-lg)',
  padding: `0 ${T.space[4]}`,
  borderRadius: T.radius.md,
  border: `1px solid ${T.color.borderDefault}`,
  background: T.color.bgInput,
  color: T.color.textPrimary,
  fontSize: T.text.base,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: 'var(--bs-control-lg)',
  borderRadius: T.radius.md,
  border: 'none',
  background: T.color.accentFill,
  color: '#fff',
  fontSize: T.text.base,
  fontWeight: T.weight.semibold as any,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textDecoration: 'none',
};

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // An expired or reused link comes back with the error in the URL.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const linkError = hash.get('error_description') || query.get('error_description');
    if (linkError) {
      setError(linkError.replace(/\+/g, ' '));
      setStage('invalid');
      return;
    }

    let settled = false;
    const markReady = () => { if (!settled) { settled = true; setStage('ready'); } };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) markReady();
    });

    (async () => {
      // PKCE-style links carry ?code= instead of a hash session.
      const code = query.get('code');
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) { setError(exErr.message); setStage('invalid'); return; }
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) markReady();
      else setTimeout(() => {
        if (!settled) {
          setError('This reset link is invalid or has expired.');
          setStage('invalid');
        }
      }, 4000);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setStage('saving');
    const { error: upErr } = await supabase.auth.updateUser({ password });
    if (upErr) { setError(upErr.message); setStage('ready'); return; }
    setStage('done');
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.color.bgBase,
        color: T.color.textPrimary,
        padding: T.space[4],
      }}
    >
      <div
        style={{
          background: T.color.bgCard,
          borderRadius: T.radius.xl,
          padding: `${T.space[8]} ${T.space[6]}`,
          maxWidth: 440,
          width: '100%',
          border: `1px solid ${T.color.borderSubtle}`,
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ margin: 0, fontSize: T.text.xl, fontWeight: T.weight.bold as any, lineHeight: T.leading.tight }}>
          {stage === 'done' ? 'Password updated' : 'Set a new password'}
        </h1>

        {stage === 'checking' && (
          <p style={{ color: T.color.textSecondary, fontSize: T.text.base, marginTop: T.space[3] }}>
            Checking your reset link…
          </p>
        )}

        {stage === 'invalid' && (
          <>
            <p role="alert" style={{ color: T.color.error, fontSize: T.text.base, marginTop: T.space[3] }}>
              {error || 'This reset link is invalid or has expired.'}
            </p>
            <a href="/login" style={{ ...btnPrimary, marginTop: T.space[5] }}>Request a new link</a>
          </>
        )}

        {(stage === 'ready' || stage === 'saving') && (
          <form onSubmit={submit} style={{ marginTop: T.space[5], display: 'grid', gap: T.space[3] }}>
            <label style={{ display: 'grid', gap: T.space[1], fontSize: T.text.sm, color: T.color.textSecondary }}>
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                style={inputStyle}
                autoFocus
              />
            </label>
            <label style={{ display: 'grid', gap: T.space[1], fontSize: T.text.sm, color: T.color.textSecondary }}>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={inputStyle}
              />
            </label>
            {error && (
              <p role="alert" style={{ color: T.color.error, fontSize: T.text.sm, margin: 0 }}>{error}</p>
            )}
            <button type="submit" disabled={stage === 'saving'} style={{ ...btnPrimary, marginTop: T.space[2], opacity: stage === 'saving' ? 0.7 : 1 }}>
              {stage === 'saving' ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        {stage === 'done' && (
          <>
            <p style={{ color: T.color.textSecondary, fontSize: T.text.base, marginTop: T.space[3] }}>
              You can now sign in with your new password.
            </p>
            <a href="/login" style={{ ...btnPrimary, marginTop: T.space[5] }}>Continue</a>
          </>
        )}
      </div>
    </div>
  );
}
