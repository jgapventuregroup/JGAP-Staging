import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Element {
  constructor(tag = 'div') { this.tag = tag; this.value = ''; this.textContent = ''; this.children = []; this.style = {}; this.checked = false; this.hidden = false; this.disabled = false; }
  set innerHTML(value) { throw Error('Unsafe HTML rendering'); }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; this.textContent = ''; }
  scrollIntoView() {}
}
const elements = new Map();
const el = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
let scope = { companyId: 'a', role: 'owner' }, rows = [], writes = [], archiveWrites = [];
let resolveLoad = null, delay = false;
const context = { document: { getElementById: el, createElement: tag => new Element(tag) }, window: { JGAPLenderContext: { scope: () => scope, load: async company => { if (delay) return new Promise(resolve => { resolveLoad = resolve; }); return { rows }; }, save: async (fields, id, company) => { writes.push({ fields, id, company }); return { saved: true }; }, archive: async (id, archived, company) => { archiveWrites.push({ id, archived, company }); rows = rows.map(row => row.id === id ? { ...row, archived } : row); return { saved: true }; } } }, URL, Date };
vm.runInNewContext(fs.readFileSync(new URL('../lenders.js', import.meta.url), 'utf8'), context);
const lenders = context.window.JGAPLenders;
await lenders.load(); assert.equal(el('lender-form').hidden, false);
el('l_inst').value = 'Synthetic Credit Union'; el('l_min').value = '0'; el('l_max').value = '100000';
await el('lender-form').onsubmit({ preventDefault() {} });
assert.equal(writes.length, 1); assert.equal(writes[0].company, 'a'); assert.equal(writes[0].fields.minimum_loan_amount, 0); assert.equal(writes[0].fields.typical_ltv, null, 'Unknown lender terms must remain null');
el('l_inst').value = 'Synthetic Bank'; el('l_min').value = '200'; el('l_max').value = '100'; await el('lender-form').onsubmit({ preventDefault() {} }); assert.equal(writes.length, 1); assert.match(el('l_msg').textContent, /Minimum loan cannot exceed/);
el('l_min').value = ''; el('l_max').value = ''; el('l_web').value = 'javascript:alert(1)'; await el('lender-form').onsubmit({ preventDefault() {} }); assert.equal(writes.length, 1);
el('l_web').value = ''; el('l_cancel_btn').onclick();
rows = [{ id: 'lender-a', company_id: 'a', institution_name: '<script>alert(1)</script>', lender_type: 'Bank', status: 'Active Relationship', minimum_loan_amount: 0, maximum_loan_amount: null, typical_ltv: 0, typical_dscr: null, archived: false, website: 'javascript:alert(1)' }];
await lenders.load(); assert.equal(el('l_count').textContent, '1'); assert.equal(el('l_active').textContent, '1');
const card = el('lenderList').children[0]; assert.equal(card.children[0].textContent, rows[0].institution_name); assert.equal(card.children.some(x => x.tag === 'a'), false);
assert.match(card.children[2].textContent, /Minimum: \$0\.00/); assert.match(card.children[2].textContent, /Maximum: Not supplied/);
const buttons = card.children.filter(x => x.tag === 'button'); buttons[0].onclick(); assert.equal(el('l_min').value, 0); assert.equal(el('l_form_title').textContent, 'Edit lender');
await buttons[1].onclick(); assert.equal(archiveWrites.length, 1); assert.equal(archiveWrites[0].archived, true);
el('l_show_archived').checked = true; el('l_show_archived').onchange(); assert.equal(el('lenderList').children.length, 1); assert.equal(el('lenderList').children[0].children.filter(x => x.tag === 'button')[1].textContent, 'Restore');
scope = { companyId: 'a', role: 'viewer' }; await lenders.load(); assert.equal(el('lender-form').hidden, true); assert.equal(el('lenderList').children[0].children.filter(x => x.tag === 'button')[0].disabled, true);
await el('lender-form').onsubmit({ preventDefault() {} }); assert.equal(writes.length, 1);
scope = { companyId: 'a', role: 'owner' }; delay = true; const pending = lenders.load(); await Promise.resolve(); scope = { companyId: 'b', role: 'owner' }; lenders.clear(); resolveLoad({ rows }); await pending;
assert.equal(el('lenderList').children.length, 0, 'Old company response must not repopulate lenders'); assert.equal(el('l_inst').value, ''); assert.equal(el('l_msg').textContent, '');
console.log('PASS: original lender workflow — saved zero/unknown terms, validation, safe rendering, edit/archive/restore, viewers and stale-company clearing');
