import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const script = fs.readFileSync(new URL('../account-recovery.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(hash = '', invalid = false, mismatch = false, failures = {}) {
  const elements = new Map(), calls = [], timers = [];
  const el = id => { if (!elements.has(id)) elements.set(id, { value: '', textContent: '', disabled: false, classList: { add() {}, remove() {} }, focus() {} }); return elements.get(id); };
  const auth = { resetPasswordForEmail: async (email, options) => { calls.push({ action: 'request', email, options }); return { error: failures.reset || null }; }, getSession: async () => ({ data: { session: invalid ? null : { user: { id: 'verified-user' } } }, error: null }), getUser: async () => ({ data: { user: { id: mismatch ? 'different-user' : 'verified-user' } }, error: null }), updateUser: async body => { calls.push({ action: 'update', body }); return { error: failures.update || null }; }, signOut: async options => { calls.push({ action: 'signout', options }); return { error: null }; } };
  const context = { document: { getElementById: el }, URLSearchParams, setTimeout: (fn, ms) => timers.push({ fn, ms }), window: { location: { hash, pathname: '/JGAP-Staging/', search: '' }, history: { replaceState: (state, title, url) => calls.push({ action: 'clear-url', url }) }, JGAP_STAGING_PUBLISHABLE_KEY: 'sb_publishable_fixture', supabase: { createClient: (url, key, options) => { calls.push({ action: 'client', options }); return { auth }; } } } };
  vm.runInNewContext(script, context);
  return { el, calls, timers };
}
const normal = fixture();
normal.el('email').value = 'invalid'; await normal.el('forgot-password').onclick();
assert.equal(normal.calls.length, 0, 'Invalid email must not trigger a request');
normal.el('email').value = 'PERSON@example.com'; await normal.el('forgot-password').onclick();
assert.equal(normal.calls.find(x => x.action === 'request').email, 'person@example.com');
assert.equal(normal.calls.find(x => x.action === 'request').options.redirectTo, 'https://jgapventuregroup.github.io/JGAP-Staging/');
assert.match(normal.el('status').textContent, /If an account exists/);
assert.equal(normal.el('forgot-password').disabled, true);
assert.equal(normal.timers[0].ms, 60000);
await normal.el('forgot-password').onclick(); assert.equal(normal.calls.filter(x => x.action === 'request').length, 1);
normal.timers[0].fn(); assert.equal(normal.el('forgot-password').disabled, false);

const recovery = fixture('#type=recovery&access_token=synthetic-test-fragment'); await flush();
assert.equal(recovery.calls.find(x => x.action === 'client').options.auth.detectSessionInUrl, true);
assert.equal(recovery.calls.find(x => x.action === 'client').options.auth.persistSession, false);
assert.equal(recovery.el('save-new-password').disabled, false);
assert.equal(recovery.calls.find(x => x.action === 'clear-url').url, '/JGAP-Staging/');
recovery.el('new-password').value = 'short'; recovery.el('confirm-password').value = 'short'; await recovery.el('save-new-password').onclick();
assert.equal(recovery.calls.filter(x => x.action === 'update').length, 0);
recovery.el('new-password').value = 'synthetic-test-password'; recovery.el('confirm-password').value = 'mismatch'; await recovery.el('save-new-password').onclick();
assert.equal(recovery.calls.filter(x => x.action === 'update').length, 0);
recovery.el('confirm-password').value = 'synthetic-test-password'; await recovery.el('save-new-password').onclick();
assert.equal(recovery.calls.filter(x => x.action === 'update').length, 1);
assert.equal(recovery.el('new-password').value, ''); assert.equal(recovery.el('confirm-password').value, '');
assert.equal(recovery.calls.find(x => x.action === 'signout').options.scope, 'global');
assert.equal(recovery.el('save-new-password').disabled, true);

for (const [invalid, mismatch] of [[true, false], [false, true]]) {
  const denied = fixture('#type=recovery', invalid, mismatch); await flush();
  assert.equal(denied.el('save-new-password').disabled, true);
  denied.el('new-password').value = 'synthetic-test-password'; denied.el('confirm-password').value = 'synthetic-test-password'; await denied.el('save-new-password').onclick();
  assert.equal(denied.calls.filter(x => x.action === 'update').length, 0, 'An invalid or mismatched recovery identity cannot update a password');
  assert.match(denied.el('recovery-status').textContent, /expired or invalid/);
}
const failed = fixture('#type=recovery&access_token=synthetic-test-fragment'); await flush();
const originalClient = failed.calls.find(x => x.action === 'client');
assert.ok(originalClient, 'Recovery client initializes');
failed.el('new-password').value = 'a-different-long-password';
failed.el('confirm-password').value = 'a-different-long-password';
// A rejected password must never be mistaken for a successful reset.
assert.equal(failed.el('save-new-password').disabled, false);
const throttled = fixture('', false, false, { reset: { status: 429, code: 'over_email_send_rate_limit' } });
throttled.el('email').value = 'person@example.com';
await throttled.el('forgot-password').onclick();
assert.match(throttled.el('status').textContent, /rate-limited/);
assert.match(throttled.el('status').textContent, /over_email_send_rate_limit/);
const rejected = fixture('#type=recovery', false, false, { update: { code: 'weak_password' } }); await flush();
rejected.el('new-password').value = 'a-long-rejected-password';
rejected.el('confirm-password').value = 'a-long-rejected-password';
await rejected.el('save-new-password').onclick();
assert.match(rejected.el('recovery-status').textContent, /weak_password/);
assert.equal(rejected.el('new-password').value, 'a-long-rejected-password');
assert.equal(rejected.el('save-new-password').disabled, false);
assert.equal(rejected.calls.some(x => x.action === 'signout'), false);
const expired = fixture('#error=access_denied&error_description=expired');
assert.match(expired.el('status').textContent, /expired/);
assert.equal(expired.calls.filter(x => x.action === 'client').length, 0);
console.log('PASS: account recovery — request cooldown, generic account response, verified identity, invalid links, password confirmation, cleared fields and recovery tokens, session revocation');
