import {validateLedgerEntry} from './property-ledger.mjs';
import {validateRepair,validateTask} from './property-work.mjs';

const tables={ledger:'property_ledger_entries',repair:'property_repairs',task:'property_tasks'};
const validators={ledger:validateLedgerEntry,repair:validateRepair,task:validateTask};

export async function savePropertyActivity({client,companyId,dealId,kind,input}){
  if(!client||!companyId||!dealId)throw Error('Select a company and property');
  const table=tables[kind],validate=validators[kind];
  if(!table||!validate)throw Error('Unsupported property activity');
  const result=validate(input);
  if(!result.ok)throw Error(result.errors.join('; '));
  const payload={...result.value,company_id:companyId,deal_id:dealId};
  // Ownership is supplied by the selected workspace, never by user form fields.
  const {data,error}=await client.from(table).insert(payload).select('*').single();
  if(error)throw Error('Could not save '+kind+': '+error.message);
  if(!data||data.company_id!==companyId||data.deal_id!==dealId)throw Error('Saved activity does not match selected property');
  return data;
}
