import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { versionFrontend } from './version-frontend.mjs';

const [configPath, outputPath] = process.argv.slice(2);
if (!configPath || !outputPath) throw new Error('Provide a configuration file and a new output directory.');

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const publicFields = ['appUrl', 'supabaseUrl', 'publishableKey'];
if (Object.keys(config).length !== publicFields.length ||
    publicFields.some(key => typeof config[key] !== 'string')) {
  throw new Error('Only appUrl, supabaseUrl and publishableKey may be included.');
}
const app = new URL(config.appUrl);
const backend = new URL(config.supabaseUrl);
for (const url of [app, backend]) {
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('HTTPS URLs without credentials, query strings or fragments are required.');
  }
}
if (app.hostname.endsWith('.github.io') || backend.pathname !== '/' ||
    ['qfszapteuxuogoselprp.supabase.co', 'shcienaexbsyluhvylme.supabase.co'].includes(backend.hostname) ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) {
  throw new Error('Use a separate release hostname, backend and browser publishable key.');
}
const output = resolve(outputPath);
if (existsSync(output)) throw new Error('Output directory must be new.');
const packageStep = readFileSync('.github/workflows/pages.yml', 'utf8');
const assetLine = packageStep.match(/^\s*cp (index\.html terms\.html privacy\.html .*?) dist\/$/m);
if (!assetLine) throw new Error('Could not locate the existing frontend asset allowlist.');
const assets = assetLine[1].split(' ').filter(name => name !== 'config.js' && !name.endsWith('-demo.html'));
mkdirSync(output);
for (const name of assets) cpSync(name, resolve(output, name));
cpSync(new URL('../hosting/cloudflare-pages/_headers', import.meta.url), resolve(output, '_headers'));
writeFileSync(resolve(output, 'config.js'),
  'window.JGAP_APP_CONFIG = Object.freeze(' + JSON.stringify({
    appUrl: app.href, supabaseUrl: backend.origin, publishableKey: config.publishableKey
  }) + ');\n');
const index = resolve(output, 'index.html');
const page = readFileSync(index, 'utf8');
writeFileSync(index, page.replaceAll('data-test-billing=', 'data-disabled-billing=')
  .replaceAll('<button type="button" data-disabled-billing=', '<button type="button" disabled data-disabled-billing='));
console.log('Private checkout-disabled rehearsal build ' + versionFrontend(output));
