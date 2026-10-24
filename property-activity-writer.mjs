import {validateLedgerEntry} from './property-ledger.mjs';
import {validateRepair,validateTask} from './property-work.mjs';

const tables={ledger:'property_ledger_entries',repair:'property_repairs',task:'property_tasks'};
const validators={ledger:validateLedgerEntry,repair:validateRepair,task:validateTask};
export async function savePropertyActivity({client,companyId,dealId,kind,input,recordId=null,getCurrentCompany,getCurrentClient}){
  if(!client||!companyId||!dealId)throw Error('Select a company and property');
  const table=tables[kind],validate=validators[kind];
  if(!table||!validate)throw Error('Unsupported property activity');
  if(recordId!==null&&(typeof recordId!=='string'||!recordId.trim()))throw Error('Invalid activity record');
  const isCurrent=()=>!((getCurrentCompany&&getCurrentCompany()!==companyId)||(getCurrentClient&&getCurrentClient()!==client));
  if(!isCurrent())throw Error('Company session changed');
  const result=validate(input);
  if(!result.ok)throw Error(result.errors.join('; '));
  const payload={...result.value,company_id:companyId,deal_id:dealId};
  // Scope never comes from editable form fields. RLS enforces entitlement/role.
  const query=recordId===null?client.from(table).insert(payload):client.from(table).update(result.value).eq('id',recordId).eq('company_id',companyId).eq('deal_id',dealId);
  const {data,error}=await query.select('*').single();
  if(error)throw Error('Could not save '+kind+': '+error.message);
  if(!isCurrent())throw Error('Company session changed after save');
  if(!data?.id||data.company_id!==companyId||data.deal_id!==dealId||(recordId!==null&&data.id!==recordId))throw Error('Saved activity does not match selected property');
  return data;
}
