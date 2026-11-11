import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeOwnedPortfolio } from '../owned-portfolio.mjs';

const property = portfolio_actuals => ({ portfolio_actuals });

test('counts only explicit owners and uses separate metric coverage', () => {
  const summary = summarizeOwnedPortfolio([
    property({ ownership: 'owned', invested: 10000, rent: 1000, mortgage: 500, expenses: 100,
      escrow: true, taxes: 200, insurance: 100, hoa: 50 }),
    property({ ownership: 'owned', invested: 30000, rent: 1200, mortgage: 900, expenses: 100 }),
    property({ ownership: 'owned', invested: 0, rent: 0, mortgage: 0 }),
    property({ ownership: 'potential', invested: 90000, rent: 5000, mortgage: 0, expenses: 0 }),
    { status: 'closed', purchase_price: 99999, monthly_rent: 2500 },
  ]);

  assert.equal(summary.count, 3);
  assert.equal(summary.investment.value, 40000);
  assert.equal(summary.investment.missing.length, 0);
  assert.equal(summary.cashFlow.value, 550);
  assert.deepEqual(summary.cashFlow.missing[0].fields, ['Other Monthly Expenses']);
  assert.equal(summary.returns.value, 16.5);
  assert.equal(summary.returns.missing.length, 1);
});

test('distinguishes missing data from explicit zero', () => {
  const missing = summarizeOwnedPortfolio([property({ ownership: 'owned' })]);
  assert.equal(missing.investment.value, null);
  assert.equal(missing.cashFlow.value, null);
  assert.equal(missing.returns.value, null);

  const zero = summarizeOwnedPortfolio([
    property({ ownership: 'owned', invested: 0, rent: 0, mortgage: 0, expenses: 0 }),
  ]);
  assert.equal(zero.investment.value, 0);
  assert.equal(zero.cashFlow.value, 0);
  assert.equal(zero.returns.value, null);
});

test('includes separately paid tax and insurance in cash flow', () => {
  const summary = summarizeOwnedPortfolio([
    property({ ownership: 'owned', rent: 800, mortgage: 500, expenses: 100,
      taxes: 150, insurance: 75 }),
  ]);
  assert.equal(summary.cashFlow.value, -25);
  assert.equal(summary.returns.value, null);
});

test('dashboard renders metric-specific coverage and routes to the selected property', async () => {
  const { renderPortfolio } = await import('../owned-portfolio.mjs');
  class Element {
    children = [];
    append(child) { this.children.push(child); }
    replaceChildren() { this.children = []; this.textContent = ''; }
  }
  const ids = new Map();
  const document = {
    createElement: () => new Element(),
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, new Element());
      return ids.get(id);
    },
  };
  const rows = [
    { id: 'complete', portfolio_actuals: { ownership: 'owned', invested: 5000, rent: 1000, mortgage: 800, expenses: 100 } },
    { id: 'incomplete', name: 'Second property', portfolio_actuals: { ownership: 'owned', invested: 2000 } },
  ];
  const selections = [];
  renderPortfolio(document, rows, (...args) => selections.push(args), true);
  assert.equal(ids.get('metric-count').textContent, '2');
  assert.equal(ids.get('portfolio-investment-coverage').textContent, 'Based on 2 of 2 properties');
  assert.equal(ids.get('portfolio-cashFlow-coverage').textContent, 'Based on 1 of 2 properties');
  ids.get('portfolio-cashFlow-action').children[0].children[1].onclick();
  assert.deepEqual(selections, [['incomplete', ['Monthly Rent', 'Monthly Mortgage Payment', 'Other Monthly Expenses']]]);
  renderPortfolio(document, rows, () => assert.fail('Viewer must not see edit actions'), false);
  assert.match(ids.get('portfolio-cashFlow-action').textContent, /workspace editor/);
  assert.equal(ids.get('portfolio-cashFlow-action').children.length, 0);
  renderPortfolio(document, [], () => {}, false);
  assert.equal(ids.get('portfolio-cashFlow').textContent, 'Not enough data');
  assert.equal(ids.get('portfolio-cashFlow-coverage').textContent, '');
});
