export function validateLedgerEntry(input){
  const errors=[];
  const type=String(input?.entryType??'').trim();
  if(!['income','expense'].includes(type))errors.push('Choose income or expense');
  const date=String(input?.entryDate??'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)errors.push('Enter a valid date');
  const category=String(input?.category??'').trim();
  if(!category||category.length>80)errors.push('Category must be 1–80 characters');
  const description=String(input?.description??'');
  if(description.length>2000)errors.push('Description is too long');
  const raw=String(input?.amount??'').trim();
  if(!/^(?:\d{1,10})(?:\.\d{1,2})?$/.test(raw)||!(Number(raw)>0)||Number(raw)>9999999999.99)errors.push('Enter a positive amount with at most two decimals');
  return errors.length?{ok:false,errors}:{ok:true,value:{entry_type:type,entry_date:date,category,description,amount:Number(raw).toFixed(2)}};
}
export function summarizeLedger(entries){
  let incomeCents=0,expenseCents=0;
  for(const entry of entries){
    const type=entry.entry_type;
    const amount=Number(entry.amount);
    if(!['income','expense'].includes(type)||!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(Math.round(amount*100)))throw Error('Invalid ledger entry');
    const cents=Math.round(amount*100);
    if(type==='income')incomeCents+=cents;else expenseCents+=cents;
  }
  return {income:incomeCents/100,expenses:expenseCents/100,net:(incomeCents-expenseCents)/100};
}
