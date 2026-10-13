(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const endpoint = 'https://qfszapteuxuogoselprp.supabase.co';
  const returnUrl = 'https://jgapventuregroup.github.io/JGAP-Staging/';
  const authOptions = { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false };
  let recoveryClient = null, verifiedRecovery = false, updating = false;
  const getKey = () => window.JGAP_STAGING_PUBLISHABLE_KEY || el('key').value.trim();
  function createAuth(detectSessionInUrl = false) {
    const key = getKey();
    if (!window.supabase || !key.startsWith('sb_publishable_')) throw Error('Account service is unavailable. Try again shortly.');
    return window.supabase.createClient(endpoint, key, { auth: { ...authOptions, detectSessionInUrl } });
  }
  const showRecovery = () => { el('login-shell').classList.add('hidden'); el('workspace').classList.add('hidden'); el('recovery-shell').classList.remove('hidden'); };
  const clearFields = () => { el('new-password').value = ''; el('confirm-password').value = ''; };
  function clearRecoveryUrl() {
    window.history?.replaceState(null, '', window.location.pathname + window.location.search);
  }
  el('forgot-password').onclick = async () => {
    if (el('forgot-password').disabled) return;
    const email = el('email').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { el('status').textContent = 'Enter your email address above to request a reset link.'; el('email').focus(); return; }
    el('forgot-password').disabled = true;
    try {
      const client = createAuth();
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: returnUrl });
      if (error) throw error;
      el('status').textContent = 'Reset request accepted. For privacy, this does not confirm that the account exists or that an email was delivered. Check your inbox and spam folder for the newest link. You can request another link in 60 seconds.';
    } catch (error) {
      const code = String(error?.code || 'request_failed').replace(/[^a-z0-9_]/gi, '').slice(0, 60);
      const limited = error?.status === 429 || /rate_limit|over_email_send_rate_limit/.test(code);
      el('status').textContent = limited ? 'Email sending is temporarily rate-limited (' + code + '). Wait before trying again; repeated requests will not help.' : 'Reset email request failed (' + code + '). Please try later. If this continues, contact JGAP support.';
    } finally {
      setTimeout(() => { el('forgot-password').disabled = false; }, 60000);
    }
  };
  el('save-new-password').onclick = async () => {
    if (!verifiedRecovery || !recoveryClient || updating) return;
    const password = el('new-password').value;
    if (password.length < 12) { el('recovery-status').textContent = 'Use a password with at least 12 characters.'; return; }
    if (password !== el('confirm-password').value) { el('recovery-status').textContent = 'The passwords do not match.'; return; }
    updating = true; el('save-new-password').disabled = true;
    try {
      const { error } = await recoveryClient.auth.updateUser({ password });
      if (error) throw error;
      clearFields();
      verifiedRecovery = false;
      await recoveryClient.auth.signOut({ scope: 'global' }).catch(() => {});
      recoveryClient = null;
      el('recovery-status').textContent = 'Password updated. Return to sign in with your new password.';
    } catch (error) {
      const code = String(error?.code || 'unknown_error').replace(/[^a-z0-9_]/gi, '').slice(0, 60);
      const expired = /expired|invalid_token|session_not_found|session_expired|bad_jwt/.test(code);
      const policy = /weak_password|same_password|password/.test(code);
      el('recovery-status').textContent = expired ? 'Password update failed (' + code + '). The recovery session is no longer valid. Request a new reset link.' : policy ? 'Password update failed (' + code + '). Choose a different password with at least 12 characters and try again.' : 'Password update failed (' + code + '). Your password was not changed. Please try again; if this continues, request a new reset link.';
    } finally { updating = false; el('save-new-password').disabled = !verifiedRecovery; }
  };
  el('back-to-signin').onclick = async () => {
    if (updating) return;
    verifiedRecovery = false; clearFields();
    const previous = recoveryClient; recoveryClient = null;
    if (previous) await previous.auth.signOut({ scope: 'local' }).catch(() => {});
    clearRecoveryUrl(); el('recovery-shell').classList.add('hidden'); el('login-shell').classList.remove('hidden');
    el('status').textContent = 'Sign in, or enter your email and request a new reset link.';
  };
  const parameters = new URLSearchParams(window.location?.hash?.slice(1) || '');
  if (parameters.get('error')) {
    el('status').textContent = 'This account link has expired or could not be verified. Request a new link.';
    clearRecoveryUrl();
  }
  if (parameters.get('type') !== 'recovery') return;
  showRecovery(); el('save-new-password').disabled = true; el('recovery-status').textContent = 'Verifying your reset link…';
  try {
    recoveryClient = createAuth(true);
    const current = recoveryClient;
    // SDK initialization consumes the recovery fragment. Server-side getUser
    // validates the identity before the UI permits any password change.
    current.auth.getSession().then(async ({ data, error }) => {
      clearRecoveryUrl();
      if (current !== recoveryClient) return;
      if (error || !data?.session) throw Error('Recovery session unavailable');
      const identity = await current.auth.getUser();
      if (current !== recoveryClient) return;
      if (identity.error || !identity.data?.user || identity.data.user.id !== data.session.user.id) throw Error('Recovery identity unavailable');
      verifiedRecovery = true; el('save-new-password').disabled = false; el('recovery-status').textContent = 'Reset link verified. Choose your new password.';
    }).catch(() => {
      if (current !== recoveryClient) return;
      verifiedRecovery = false; el('save-new-password').disabled = true; el('recovery-status').textContent = 'This reset link is expired or invalid. Return to sign in and request a new link.';
    });
  } catch {
    el('recovery-status').textContent = 'Account recovery is unavailable. Return to sign in and try again.';
  }
})();
