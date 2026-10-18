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
