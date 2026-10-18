export function describePassportEntry(kind,item){
 if(!item||typeof item!=='object')throw Error('Invalid Passport entry');
 const money=value=>value===null||value===undefined||value===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
 const parts={
 asset:[item.name,item.asset_type,item.condition,item.warranty_expiration&&'Warranty until '+item.warranty_expiration],
 service:[item.service_name,item.next_service_date&&'Next '+item.next_service_date,item.last_service_date&&'Last '+item.last_service_date],
 maintenance:[item.title,item.maintenance_date,item.status,item.cost!==null&&item.cost!==undefined&&money(item.cost)],
 improvement:[item.title,item.improvement_date,item.category,item.cost!==null&&item.cost!==undefined&&money(item.cost)]
 }[kind];if(!parts)throw Error('Unknown Passport entry');
 return parts.filter(value=>value!==null&&value!==undefined&&value!=='').join(' · ')||'Untitled record';
}
