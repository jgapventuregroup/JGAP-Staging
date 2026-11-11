import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('classified property writes preserve account isolation, existing deals and the Free allowance', async () => {
  const db = new PGlite();
  try {
    for (const file of ['tests/database-platform-fixture.sql', 'supabase/baseline/application-schema.sql',
      'supabase/migrations/20261111114000_owned_property_actuals.sql']) {
      await db.exec(read(file));
    }
    const owner = '90000000-0000-4000-8000-000000000001';
    const viewer = '90000000-0000-4000-8000-000000000002';
    const outsider = '90000000-0000-4000-8000-000000000003';
    const company = '90000000-0000-4000-8000-000000000011';
    const legacy = '90000000-0000-4000-8000-000000000021';
    await db.exec(`insert into auth.users values
      ('${owner}','owner@example.invalid',now()), ('${viewer}','viewer@example.invalid',now()),
      ('${outsider}','outside@example.invalid',now());
      insert into public.companies(id,name) values ('${company}','Portfolio fixture');
      insert into public.company_members(company_id,user_id,role) values
        ('${company}','${owner}','owner'), ('${company}','${viewer}','viewer');
      insert into public.deals(id,company_id,name,purchase_price,monthly_rent)
        values ('${legacy}','${company}','Existing analysis',150000,1200);`);
    const signIn = user => db.exec(`reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`);
    const list = async () => (await db.query(
      'select id, name, purchase_price, monthly_rent, portfolio_actuals from public.list_company_deals($1)', [company],
    )).rows;
    const owned = JSON.stringify({ ownership: 'owned', rent: 900, mortgage: 0 });
    const potential = JSON.stringify({ ownership: 'potential' });
    const create = (name, actuals) => db.query(
      'select id from public.create_classified_property($1,$2,0,0,$3::jsonb)', [company, name, actuals],
    );
    const edit = (expected, actuals) => db.query(
      'select public.save_property_actuals($1,$2,$3::jsonb,$4::jsonb)', [company, legacy, expected, actuals],
    );
    await signIn(owner);
    assert.equal((await list())[0].portfolio_actuals, null);
    await assert.rejects(create('Invalid record', '{"ownership":"owned","rent":-1}'), /deals_valid_portfolio_actuals/);
    assert.equal((await list()).length, 1);
    await create('Owned property', owned);
    await edit(null, owned);
    const original = (await list()).find(deal => deal.id === legacy);
    assert.equal(Number(original.purchase_price), 150000);
    assert.equal(Number(original.monthly_rent), 1200);
    assert.deepEqual(original.portfolio_actuals, JSON.parse(owned));
    await assert.rejects(edit(null, potential), /Property changed or is unavailable/);
    await signIn(viewer);
    assert.equal((await list()).length, 2);
    await assert.rejects(edit(owned, potential), /Property changed or is unavailable/);
    await assert.rejects(create('Viewer attempt', owned), /cannot create deals/);
    await signIn(outsider);
    assert.deepEqual(await list(), []);
    await assert.rejects(edit(owned, potential), /Property changed or is unavailable/);
    await signIn(owner);
    await edit(owned, potential);
    assert.equal((await list()).find(deal => deal.id === legacy).portfolio_actuals.ownership, 'potential');
    for (const name of ['Second new property', 'Third new property', 'Fourth new property']) await create(name, potential);
    await assert.rejects(create('Over the allowance', owned), /FREE_LIFETIME_PROPERTY_LIMIT_REACHED/);
  } finally {
    await db.close();
  }
});
