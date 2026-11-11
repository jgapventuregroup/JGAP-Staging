// Actual property financials are separate from Deal Analyzer assumptions.
export const actualFields = [
  ['rent', 'Monthly Rent'],
  ['mortgage', 'Monthly Mortgage Payment'],
  ['expenses', 'Other Monthly Expenses'],
  ['invested', 'Cash Invested'],
  ['taxes', 'Property taxes'],
  ['insurance', 'Insurance'],
  ['repairs', 'Repairs and maintenance'],
  ['hoa', 'HOA fees'],
  ['management', 'Property management'],
  ['vacancy', 'Vacancy allowance'],
  ['operating', 'Other operating expenses'],
];

function cents(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12) return null;
  return BigInt(Math.round(value * 100));
}

export function summarizeOwnedPortfolio(properties) {
  const owned = properties.filter(property => property.portfolio_actuals?.ownership === 'owned');
  const investment = { cents: 0n, missing: [] };
  const cashFlow = { cents: 0n, missing: [] };
  const returns = { cents: 0n, invested: 0n, missing: [] };

  for (const property of owned) {
    const fields = property.portfolio_actuals;
    const invested = cents(fields.invested);
    const rent = cents(fields.rent);
    const mortgage = cents(fields.mortgage);
    const expenses = cents(fields.expenses);
    const missingFlow = actualFields.slice(0, 3).filter(([key]) => cents(fields[key]) === null);
    const details = actualFields.slice(4).filter(([key]) => fields.escrow !== true || !['taxes', 'insurance'].includes(key));
    const extras = details.reduce((sum, [key]) => sum + (cents(fields[key]) ?? 0n), 0n);

    if (invested === null) investment.missing.push({ property, fields: ['Cash Invested'] });
    else investment.cents += invested;

    if (missingFlow.length) cashFlow.missing.push({ property, fields: missingFlow.map(([, label]) => label) });
    else cashFlow.cents += rent - mortgage - expenses - extras;

    const missingReturn = missingFlow.map(([, label]) => label);
    if (invested === null || invested === 0n) missingReturn.push('Cash Invested greater than zero');
    if (missingReturn.length) returns.missing.push({ property, fields: missingReturn });
    else {
      returns.cents += rent - mortgage - expenses - extras;
      returns.invested += invested;
    }
  }

  return {
    count: owned.length,
    investment: { value: investment.missing.length < owned.length ? Number(investment.cents) / 100 : null, missing: investment.missing },
    cashFlow: { value: cashFlow.missing.length < owned.length ? Number(cashFlow.cents) / 100 : null, missing: cashFlow.missing },
    returns: {
      value: returns.invested > 0n ? Number(returns.cents) * 1200 / Number(returns.invested) : null,
      missing: returns.missing,
    },
  };
}

export function actualsEditor(initial = {}, editable = true) {
  initial ??= {};
  const root = document.createElement('div');
  root.className = 'portfolio-editor';
  const make = (tag, parent, text) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    parent.append(element);
    return element;
  };
  const typeLabel = make('label', root, 'Property Type');
  const type = make('select', typeLabel);
  for (const [value, label] of [['', 'Choose a property type'], ['owned', 'Owned Property'],
    ['potential', 'Potential Purchase']]) {
    make('option', type, label).value = value;
  }
  type.value = initial.ownership ?? '';
  type.disabled = !editable;
  const financials = make('fieldset', root);
  make('legend', financials, 'My Property Financials');
  make('p', financials, "Enter what you actually receive and pay each month. We'll do the math.");
  make('p', financials, 'Enter 0 for costs you do not have. If you enter a cost in More Details, leave it out of Other Monthly Expenses.');
  const primary = make('div', financials);
  primary.className = 'grid';
  const details = make('details', financials);
  make('summary', details, 'More Details');
  const escrowLabel = make('label', details, 'Mortgage payment includes taxes and insurance');
  const escrow = make('input', escrowLabel);
  escrow.type = 'checkbox';
  escrow.checked = initial.escrow === true;
  const extras = make('div', details);
  extras.className = 'grid';
  const inputs = new Map();
  for (const [index, [key, title]] of actualFields.entries()) {
    const label = make('label', index < 4 ? primary : extras, title + ' ($)');
    const input = make('input', label);
    input.type = 'number';
    input.min = '0';
    input.max = '1000000000000';
    input.step = '0.01';
    input.value = initial[key] ?? '';
    inputs.set(key, input);
  }
  make('p', financials, 'Cash Invested is the money you put into the property, including your down payment or cash purchase, closing costs you paid, and cash spent on improvements.');
  const sync = () => {
    financials.hidden = type.value !== 'owned';
    financials.disabled = !editable || financials.hidden;
    inputs.get('taxes').disabled = escrow.checked;
    inputs.get('insurance').disabled = escrow.checked;
  };
  type.onchange = sync;
  escrow.onchange = sync;
  sync();
  return {
    root,
    type,
    read() {
      if (!type.value) return null;
      if (type.value === 'potential') return { ...initial, ownership: 'potential' };
      const actuals = { ownership: type.value, escrow: escrow.checked };
      for (const [key, input] of inputs) {
        if (input.value !== '') actuals[key] = Number(input.value);
      }
      return actuals;
    },
  };
}

export function renderPortfolio(document, rows, editProperty, canEdit) {
  const summary = summarizeOwnedPortfolio(rows);
  document.getElementById('metric-count').textContent = String(summary.count);
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  for (const [key, metric] of Object.entries(summary)) {
    if (key === 'count') continue;
    const result = document.getElementById('portfolio-' + key);
    const action = document.getElementById('portfolio-' + key + '-action');
    const coverage = document.getElementById('portfolio-' + key + '-coverage');
    result.textContent = metric.value === null ? 'Not enough data'
      : key === 'returns' ? metric.value.toFixed(2) + '%' : currency.format(metric.value);
    coverage.textContent = metric.value === null ? '' :
      'Based on ' + (summary.count - metric.missing.length) + ' of ' + summary.count + ' properties';
    action.replaceChildren();
    if (!metric.missing.length) continue;
    if (!canEdit) {
      action.textContent = 'Ask a workspace editor to complete these figures.';
      continue;
    }
    const choices = document.createElement('details');
    const label = document.createElement('summary');
    label.textContent = 'Complete property financials';
    choices.append(label);
    for (const { property, fields } of metric.missing) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = property.name || 'Saved property';
      button.onclick = () => editProperty(property.id, fields);
      choices.append(button);
    }
    action.append(choices);
  }
}

export function savedPropertyFinancials(property) {
  const ownership = property.portfolio_actuals?.ownership;
  if (ownership === 'owned') {
    const { cashFlow } = summarizeOwnedPortfolio([property]);
    return { label: 'Owned', cashFlow: cashFlow.value };
  }
  return { label: ownership === 'potential' ? 'Potential Purchase' : 'Not Classified', cashFlow: null };
}

if (typeof window !== 'undefined') window.JGAPOwnedPortfolio = {
  actualsEditor, renderPortfolio, savedPropertyFinancials,
};
