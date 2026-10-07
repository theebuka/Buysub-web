'use client';

// ================================================================
// BUYSUB — PASSWORD RESET LANDING
// File: app/reset-password/page.tsx
//
// Target of the "Forgot password" email (redirectTo in components/auth/
// AuthPage.tsx). Supabase puts a recovery session in the URL; the client
// picks it up, then the user sets a new password. Renders without the app
// shell — see isNoShell in components/AppShell.tsx. The redirect URL must be
// on the Supabase Auth allow-list.
// ================================================================

import { useEffect, useState } from 'react';
import { Button, ButtonLink, Spinner } from '@/components/ui';
import { AuthAlert, AuthLayout, PasswordInput, authStyles as s } from '@/components/auth/AuthLayout';
import { getSupabase } from '@/lib/session';
import { ROUTES } from '@/lib/routes';

type Stage = 'checking' | 'ready' | 'saving' | 'done' | 'invalid';

export default function ResetPasswordPage() {
  const supabase = getSupabase();
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
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setStage('saving');
    const { error: upErr } = await supabase.auth.updateUser({ password });
    if (upErr) { setError(upErr.message); setStage('ready'); return; }
    setStage('done');
  };

  return (
    <AuthLayout legal={false}>
      <h1 className={s.title}>{stage === 'done' ? 'Password updated' : 'Choose a new password'}</h1>

      {stage === 'checking' && (
        <div className={s.checking} style={{ marginTop: 'var(--bs-space-5)' }}><Spinner size={18} /> Checking your reset link</div>
      )}

      {stage === 'invalid' && (
        <div className={s.form}>
          <AuthAlert kind="error">{error || 'This reset link is invalid or has expired.'}</AuthAlert>
          <ButtonLink href={ROUTES.forgot} full>Request a new link</ButtonLink>
        </div>
      )}

      {(stage === 'ready' || stage === 'saving') && (
        <>
          <p className={s.sub}>Use at least 8 characters.</p>
          <form className={s.form} onSubmit={submit} noValidate>
            {error && <AuthAlert kind="error">{error}</AuthAlert>}
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="rp-new" className={s.label}>New password</label>
              <PasswordInput id="rp-new" value={password} onChange={setPassword} autoComplete="new-password" />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="rp-confirm" className={s.label}>Confirm new password</label>
              <PasswordInput id="rp-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </div>
            <Button type="submit" full loading={stage === 'saving'}>Update password</Button>
          </form>
        </>
      )}

      {stage === 'done' && (
        <div className={s.form}>
          <p className={s.sub} style={{ marginTop: 0 }}>You’re signed in with your new password.</p>
          <ButtonLink href={ROUTES.account.home} full>Continue</ButtonLink>
        </div>
      )}
    </AuthLayout>
  );
}
