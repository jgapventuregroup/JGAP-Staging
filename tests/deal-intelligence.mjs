import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements = new Map();
class Element {
  constructor(tag = 'div') { this.tag = tag; this.value = ''; this.textContent = ''; this.children = []; this.disabled = false; }
  set innerHTML(value) { throw Error('Unsafe HTML rendering'); }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; this.textContent = ''; }
  setAttribute(k, v) { this[k] = v; }
  removeAttribute(k) { delete this[k]; }
  focus() { this.focused=true; }
  scrollIntoView() { this.scrolled=true; }
}
const el = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
let scope = { companyId: 'a', role: 'owner' }, saves = [], fail = false;
const context = { document: { getElementById: el, createElement: tag => new Element(tag) }, window: { JGAPIntelligenceContext: { scope: () => scope, save: async (listing, company) => { if (fail) throw Error('FREE_LIFETIME_PROPERTY_LIMIT_REACHED'); saves.push({ listing, company }); return { saved: true }; } } }, URL };
vm.runInNewContext(fs.readFileSync(new URL('../deal-intelligence-adapter.js', import.meta.url), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(new URL('../deal-intelligence.js', import.meta.url), 'utf8'), context);
const normalize = context.window.JGAPDealIntelligenceAdapter.normalize;
assert.equal(normalize({ beds: 4 }).units, null, 'Bedrooms are not rental unit counts');
assert.equal(normalize({ units: 2.5 }).units, null, 'Fractional units cannot be rounded into facts');
assert.equal(normalize({ monthlyRent: '  ' }).rent_monthly, null, 'Blank income remains unknown');
assert.equal(normalize({ cap_rate_percent: 0.08 }).cap_rate, 0.08, 'Explicit percentages cannot be multiplied');
assert.equal(normalize({ cap_rate: 0.08 }).cap_rate, 8);
assert.equal(normalize({ id: {} }).external_id, '');
const record = { listingId: 'listing-a', address: '<img src=x onerror=alert(1)>', city: 'Kingsport', state: 'TN', propertyType: 'duplex', units: 2, listPrice: '$200,000', monthlyRent: 1800, monthlyExpenses: 600, source_url: 'javascript:alert(1)' };
function review(records) { el('intelligence-json').value = JSON.stringify(records); el('review-intelligence').onclick(); return el('intelligence-results').children; }
let cards = review([record]);
assert.equal(cards.length, 1);
assert.equal(cards[0].children[0].textContent, record.address);
assert.match(cards[0].children[3].textContent, /Within/);
assert.equal(cards[0].children.filter(x => x.tag === 'a').length, 0, 'Unsafe source links must be omitted');
let save = cards[0].children.find(x => x.tag === 'button'), offer = cards[0].children.find(x => x.tag === 'label').children[0];
await save.onclick(); assert.equal(saves.length, 0, 'Asking price cannot silently become the offer');
offer.value = '150000'; await save.onclick();
assert.equal(saves.length, 1); assert.equal(saves[0].company, 'a'); assert.equal(saves[0].listing.asking_price, 200000); assert.equal(saves[0].listing.planned_offer, 150000);
assert.equal(save.disabled, true, 'Successful save cannot be resubmitted');
cards = review([{ ...record, monthlyExpenses: null }]);
assert.equal(cards[0].children.find(x => x.tag === 'button').disabled, true);
assert.match(cards[0].children[2].textContent, /expenses: Not supplied/);
scope = { companyId: 'a', role: 'viewer' }; cards = review([record]); assert.equal(cards[0].children.find(x => x.tag === 'button').disabled, true);
scope = { companyId: 'a', role: 'owner' }; cards = review([record]); save = cards[0].children.find(x => x.tag === 'button'); offer = cards[0].children.find(x => x.tag === 'label').children[0]; offer.value = '150000'; scope = { companyId: 'b', role: 'owner' }; await save.onclick(); assert.equal(saves.length, 1, 'Changed company must invalidate the preview save');
scope = { companyId: 'a', role: 'owner' }; fail = true; cards = review([record]); save = cards[0].children.find(x => x.tag === 'button'); cards[0].children.find(x => x.tag === 'label').children[0].value = '150000'; await save.onclick(); assert.match(cards[0].children.find(x => x.role === 'status').textContent, /Five lifetime Free/);
cards = review([{ ...record, city: 'Nashville' }]); assert.match(cards[0].children[3].textContent, /Outside/, 'Tennessee alone must not qualify a distant city');
el('intelligence-json').value = '{broken'; el('review-intelligence').onclick(); assert.equal(el('intelligence-results').children.length, 0);
context.window.JGAPDealIntelligence.clear(); assert.equal(el('intelligence-json').value, ''); assert.equal(el('intelligence-results').children.length, 0);
console.log('PASS: reused Deal Intelligence — missing figures, explicit offers, buying box, safe rendering, viewer refusal, company switching, Free limits and clear review');

scope={companyId:'a',role:'owner'};fail=false;
const manualSubmit=()=>el('intelligence-property-form').onsubmit({preventDefault(){}});
el('intelligence-address').value='123 Example Lane, Example City, TN 00000';
el('intelligence-price').value='200000';el('intelligence-rent').value='1800';el('intelligence-expenses').value='';el('intelligence-units').value='2';
manualSubmit();cards=el('intelligence-results').children;assert.equal(cards.length,1);assert.equal(cards[0].children.find(x=>x.tag==='button').disabled,true,'Unknown expense cannot silently become zero');assert.match(cards[0].children[2].textContent,/expenses: Not supplied/);
el('intelligence-expenses').value='0';manualSubmit();cards=el('intelligence-results').children;save=cards[0].children.find(x=>x.tag==='button');offer=cards[0].children.find(x=>x.tag==='label').children[0];assert.equal(save.disabled,false);assert.equal(offer.value,'');const beforeManual=saves.length;await save.onclick();assert.equal(saves.length,beforeManual);offer.value='175000';await save.onclick();assert.equal(saves.length,beforeManual+1);assert.equal(saves.at(-1).listing.expenses_monthly,0);assert.equal(saves.at(-1).listing.planned_offer,175000);assert.match(saves.at(-1).listing.external_id,/^manual:/);
for(const [field,value] of [['units','2.5'],['price','-1'],['rent','not a number']]){const previous=el('intelligence-'+field).value;el('intelligence-'+field).value=value;manualSubmit();assert.equal(el('intelligence-results').children.length,0);el('intelligence-'+field).value=previous;}
scope={companyId:'a',role:'viewer'};manualSubmit();assert.equal(el('intelligence-results').children[0].children.find(x=>x.tag==='button').disabled,true);
context.window.JGAPDealIntelligence.clear();for(const field of ['address','price','rent','expenses','type','units'])assert.equal(el('intelligence-'+field).value,'');assert.equal(el('intelligence-advanced').open,false);
console.log('PASS: plain property review keeps unknowns separate from zero, requires an explicit offer, rejects invalid inputs, enforces viewer access and clears drafts');

el('intelligence-status').focused=false;el('intelligence-status').scrolled=false;scope={companyId:'a',role:'owner'};review([record]);assert.equal(el('intelligence-status').focused,true);assert.equal(el('intelligence-status').scrolled,true);assert.equal(el('intelligence-status').tabindex,'-1');
el('intelligence-status').focused=false;el('intelligence-status').scrolled=false;el('intelligence-address').value='';manualSubmit();assert.equal(el('intelligence-status').focused,true);assert.equal(el('intelligence-status').scrolled,true);assert.match(el('intelligence-status').textContent,/full property address/);
el('intelligence-status').focused=false;scope=null;el('review-intelligence').onclick();assert.equal(el('intelligence-status').focused,true);assert.match(el('intelligence-status').textContent,/Choose a company workspace/);
console.log('PASS: review success, invalid manual entries and missing workspace bring keyboard focus to visible feedback');
