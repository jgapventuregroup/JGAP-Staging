import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const target = 'https://shcienaexbsyluhvylme.supabase.co';
const origin = 'http://127.0.0.1:4173';
const publicKey = process.env.QA_SUPABASE_PUBLISHABLE_KEY;
const emails = ['jgap-test-a@example.com', 'jgap-test-b@example.com'];
const tag = 'v1-isolated-browser-qa';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const root = new URL('../', import.meta.url);
let stage = 'preflight';
function requireOk(condition) {
  if (!condition) throw new Error(stage);
}
const password = () => randomBytes(32).toString('hex');

async function provision(admin, email) {
  stage = 'find exact fictional account';
  let user;
  for (let page = 1; ; page++) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    requireOk(!result.error);
    user = result.data.users.find(candidate => candidate.email === email);
    if (user || result.data.users.length < 100) break;
    requireOk(page < 20);
  }
  const secret = password();
  stage = 'provision confirmed fictional account';
  requireOk(!user || user.app_metadata?.qa_fixture === tag);
  const attributes = { password: secret, email_confirm: true, app_metadata: { qa_fixture: tag } };
  const result = user
    ? await admin.auth.admin.updateUserById(user.id, attributes)
    : await admin.auth.admin.createUser({ ...attributes, email });
  requireOk(!result.error && result.data.user?.email === email);
  return { email, secret, id: result.data.user.id };
}

async function configure(admin, fixture, plan) {
  stage = 'verify fictional workspace ownership';
  const client = createClient(target, publicKey, options);
  const signed = await client.auth.signInWithPassword({ email: fixture.email, password: fixture.secret });
  requireOk(!signed.error && signed.data.user?.id === fixture.id);
  const name = 'Fictional V1 Browser QA ' + (fixture.email === emails[0] ? 'A' : 'B');
  const created = await client.rpc('create_my_company', { p_company_name: name });
  requireOk(!created.error && created.data?.company_id);
  const id = created.data.company_id;
  const company = await admin.from('companies').select('name').eq('id', id).single();
  const owners = await admin.from('company_members').select('user_id,role').eq('company_id', id);
  requireOk(company.data?.name === name && owners.data?.length === 1 &&
    owners.data[0].user_id === fixture.id && owners.data[0].role === 'owner');
  stage = 'set isolated fixture entitlement';
  const updated = await admin.from('company_subscriptions')
    .update({ plan, billing_status: plan === 'free' ? 'not_connected' : 'active' })
    .eq('company_id', id).is('stripe_customer_id', null).is('stripe_subscription_id', null)
    .select('plan,billing_status').single();
  requireOk(!updated.error && updated.data.plan === plan);
  requireOk(!(await client.auth.signOut()).error);
}

function runBrowser(fixtures, plans, widths) {
  stage = 'browser acceptance';
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'browser'], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME,
      QA_SUPABASE_PUBLISHABLE_KEY: publicKey,
      QA_BROWSER_CASES: JSON.stringify(fixtures.map(({email, secret}, i) => ({email, secret, plan: plans[i], widths}))) },
    stdio: ['ignore', 'inherit', 'inherit'], timeout: 180000
  });
  requireOk(child.status === 0);
}

async function browserTest() {
  const { chromium } = await import('playwright');
  const workflow = await readFile(new URL('.github/workflows/pages.yml', root), 'utf8');
  const files = new Set(workflow.match(/^\s*cp (index\.html[^\n]+) dist\/$/m)[1].split(/\s+/));
  const server = createServer(async (req, res) => {
    const file = new URL(req.url, origin).pathname.slice(1) || 'index.html';
    if (!files.has(file)) { res.writeHead(404).end(); return; }
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
    res.setHeader('Content-Type', type);
    try {
      if (file === 'config.js') {
        res.end('window.JGAP_APP_CONFIG=Object.freeze(' + JSON.stringify({supabaseUrl:target,appUrl:origin+'/',publishableKey:publicKey}) + ');');
      } else res.end(await readFile(new URL(file, root)));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(4173,'127.0.0.1',resolve); });
  let browser;
  try {
    browser = await chromium.launch();
    for (const { email, secret, plan, widths } of JSON.parse(process.env.QA_BROWSER_CASES)) {
      for (const width of widths) {
        const context = await browser.newContext({viewport:{width,height:850}});
        try {
          const page = await context.newPage();
          async function openSection(group, section) {
            const toggle = page.locator('#mobile-nav-toggle');
            if (width <= 700 && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
            const navGroup = page.locator('#workspace-nav details[data-nav-group="'+group+'"]');
            if (!await navGroup.getAttribute('open') && !await navGroup.evaluate(node => node.open)) await navGroup.locator('summary').click();
            await navGroup.locator('[data-page="'+section+'"]').click();
          }
          async function signIn() {
            await page.locator('#email').fill(email);
            await page.locator('#password').fill(secret);
            await page.locator('#login').click();
            await page.locator('#dashboard.current h1').waitFor();
          }
          stage = plan + ' ' + width + ' sign in and navigation';
          await page.goto(origin);
          await signIn();
          await openSection('account','user-settings');
          await page.waitForFunction(expected => document.querySelector('#account-membership')?.textContent?.toLowerCase().includes(expected),plan);
          requireOk(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          if (width <= 700) requireOk(await page.locator('#mobile-nav-toggle').getAttribute('aria-expanded') === 'false');
          stage = plan + ' ' + width + ' feature gates';
          await openSection('analyze','analyzer');
          await page.locator(plan === 'free' ? '#secondary-financing-locked' : '#secondary-financing').waitFor();
          await openSection('tools','finance');
          await page.locator('#finance.current').waitFor();
          const report = page.locator('#finance-view');
          await report.waitFor({state:plan === 'pro' ? 'visible' : 'hidden'});
          stage = plan + ' ' + width + ' sign out and re-sign-in';
          await openSection('account','user-settings');
          await page.locator('#account-sign-out').click();
          await page.locator('#login').waitFor();
          await signIn();
          await openSection('account','user-settings');
          await page.waitForFunction(expected => document.querySelector('#account-membership')?.textContent?.toLowerCase().includes(expected),plan);
          await page.locator('#account-sign-out').click();
          await page.locator('#login').waitFor();
          console.log('PASS', plan, width, 'login, responsive navigation, financing and report gates, re-login');
        } finally { await context.close(); }
      }
    }
  } finally { await browser?.close(); server.close(); }
}

async function main() {
  requireOk(publicKey?.startsWith('sb_publishable_'));
  if (process.argv[2] === 'browser') return browserTest();
  requireOk(process.env.GITHUB_REF === 'refs/heads/v1-isolated-browser-qa' &&
    process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' && process.env.QA_SUPABASE_ADMIN_KEY);
  const admin = createClient(target, process.env.QA_SUPABASE_ADMIN_KEY, options);
  const fixtures = [];
  try {
    for (const email of emails) fixtures.push(await provision(admin,email));
    await configure(admin,fixtures[0],'free');
    runBrowser([fixtures[0]],['free'],[390,430]);
    await configure(admin,fixtures[0],'investor');
    await configure(admin,fixtures[1],'pro');
    runBrowser(fixtures,['investor','pro'],[390,430,1363]);
  } finally {
    for (const fixture of fixtures) {
      const client = createClient(target, publicKey, options);
      const signed = await client.auth.signInWithPassword({email:fixture.email,password:fixture.secret});
      if (signed.data.session) await admin.auth.admin.signOut(signed.data.session.access_token,'global');
      const rotated = await admin.auth.admin.updateUserById(fixture.id,{password:password()});
      if (rotated.error) { console.error('Fixture password rotation failed.'); process.exitCode=1; }
    }
  }
}

try { await main(); }
catch { console.error('Isolated QA stopped at:',stage); process.exitCode=1; }
