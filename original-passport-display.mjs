export function describePassportEntry(kind,item){
 if(!item||typeof item!=='object')throw Error('Invalid Passport entry');
 const money=value=>value===null||value===undefined||value===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
 const parts={
 asset:[item.name,item.asset_type,item.condition,item.purchase_cost!==null&&item.purchase_cost!==undefined&&'Cost '+money(item.purchase_cost),item.expected_life_years&&'Life '+item.expected_life_years+' years',item.warranty_expiration&&'Warranty until '+item.warranty_expiration],
 service:[item.service_name,item.frequency_value&&'Every '+item.frequency_value+' '+(item.frequency_unit||'period'),item.next_service_date&&'Next '+item.next_service_date,item.last_service_date&&'Last '+item.last_service_date],
 maintenance:[item.title,item.maintenance_date,item.status,item.due_date&&'Due '+item.due_date,item.cost!==null&&item.cost!==undefined&&money(item.cost)],
 improvement:[item.title,item.improvement_date,item.category,item.cost!==null&&item.cost!==undefined&&money(item.cost)]
 }[kind];if(!parts)throw Error('Unknown Passport entry');
 return parts.filter(value=>value!==null&&value!==undefined&&value!=='').join(' · ')||'Untitled record';
}
