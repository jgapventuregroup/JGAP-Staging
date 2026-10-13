// Regression guard for the staging company's row-level security policy definitions.
// This is a static policy audit; authenticated HTTP integration tests remain separate.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const files = ['supabase/migrations'];
import { readdirSync } from 'node:fs';
const sql = readdirSync(join(root, files[0]))
  .filter(name => name.endsWith('.sql')).sort()
  .map(name => readFileSync(join(root, files[0], name), 'utf8')).join('\n');
assert.match(sql, /enable\s+row\s+level\s+security/i, 'Migrations must enable RLS');
for (const table of ['deals', 'lenders']) {
  assert.match(sql, new RegExp('(?:on\\s+(?:public\\.)?'+table+'\\b)', 'i'),
    table + ' must have policies defined in migrations');
}
console.log('PASS: migrations include RLS and deal/lender policy definitions (static check only)');
