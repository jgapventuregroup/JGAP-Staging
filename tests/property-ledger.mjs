import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLedgerEntry,summarizeLedger} from '../property-ledger.mjs';

const base={entryType:'income',entryDate:'2026-10-18',category:'Rent',description:'October rent',amount:'1200.50'};
test('ledger entry accepts valid positive two-decimal amounts',()=>{
  assert.deepEqual(validateLedgerEntry(base),{ok:true,value:{entry_type:'income',entry_date:'2026-10-18',category:'Rent',description:'October rent',amount:'1200.50'}});
});
test('ledger entry rejects invalid money, dates and types',()=>{
  for(const amount of ['',0,'-1','0.00','1.999','1e4','10000000000','abc'])assert.equal(validateLedgerEntry({...base,amount}).ok,false,String(amount));
  for(const entryDate of ['2026-02-30','2026-13-01','9999-99-99','10/18/2026',''])assert.equal(validateLedgerEntry({...base,entryDate}).ok,false,entryDate);
  assert.equal(validateLedgerEntry({...base,entryType:'transfer'}).ok,false);
  assert.equal(validateLedgerEntry({...base,category:' '}).ok,false);
});
test('ledger totals use integer cents and preserve net cash flow',()=>{
  assert.deepEqual(summarizeLedger([{entry_type:'income',amount:'1200.50'},{entry_type:'income',amount:'0.10'},{entry_type:'expense',amount:'400.30'}]),{income:1200.6,expenses:400.3,net:800.3});
  assert.throws(()=>summarizeLedger([{entry_type:'expense',amount:-5}]),/Invalid ledger/);
  assert.throws(()=>summarizeLedger([{entry_type:'income',amount:'1.001'}]),/Invalid ledger/);
});

test('ledger summary rejects totals exceeding safe integer-cent precision',()=>{
  const many=Array.from({length:10000},()=>({entry_type:'income',amount:'9999999999.99'}));
  assert.throws(()=>summarizeLedger(many),/safe precision/);
});

import {describeLedgerPeriod} from '../property-ledger.mjs';
test('recorded period spans every entry without treating a range as a complete month',()=>{
 assert.deepEqual(describeLedgerPeriod([{entry_date:'2026-10-24'},{entry_date:'2025-12-31'},{entry_date:'2026-10-01'}]),{count:3,firstDate:'2025-12-31',lastDate:'2026-10-24'});
 assert.deepEqual(describeLedgerPeriod([]),{count:0,firstDate:null,lastDate:null});
 assert.deepEqual(describeLedgerPeriod([{entry_date:'2024-02-29'}]),{count:1,firstDate:'2024-02-29',lastDate:'2024-02-29'});
 for(const entry_date of ['2026-02-29','2026-02-30','2026-13-01','10/24/2026',null,undefined,''])assert.throws(()=>describeLedgerPeriod([{entry_date}]),/Invalid ledger entry date/);
 assert.throws(()=>describeLedgerPeriod(null),/Invalid ledger history/);
});
