export function describePassportEntry(kind,item){
 if(!item||typeof item!=='object')throw Error('Invalid Passport entry');
 const money=value=>value===null||value===undefined||value===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
 const parts={
 asset:[item.name,item.asset_type,item.condition,item.installed_date&&'Installed '+item.installed_date,item.purchase_cost!==null&&item.purchase_cost!==undefined&&'Cost '+money(item.purchase_cost),item.expected_life_years&&'Life '+item.expected_life_years+' years',item.warranty_expiration&&'Warranty until '+item.warranty_expiration],
 service:[item.service_name,item.frequency_value&&'Every '+item.frequency_value+' '+(item.frequency_unit||'period'),item.next_service_date&&'Next '+item.next_service_date,item.last_service_date&&'Last '+item.last_service_date,item.notes&&'Notes '+item.notes],
 maintenance:[item.title,item.maintenance_date,item.status,item.due_date&&'Due '+item.due_date,item.cost!==null&&item.cost!==undefined&&money(item.cost),item.description&&item.description,item.performed_by&&'By '+item.performed_by],
 improvement:[item.title,item.improvement_date,item.category,item.cost!==null&&item.cost!==undefined&&money(item.cost),item.description&&item.description]
 }[kind];if(!parts)throw Error('Unknown Passport entry');
 return parts.filter(value=>value!==null&&value!==undefined&&value!=='').join(' · ')||'Untitled record';
}

const passportColumns={
 asset:[['System','name'],['Installed','installed_date'],['Condition','condition'],['Warranty','warranty_expiration']],
 service:[['Equipment','equipment'],['Service','service_name'],['Frequency','frequency'],['Last service','last_service_date'],['Next service','next_service_date']],
 maintenance:[['Date','maintenance_date'],['Item','title'],['Status','status'],['Cost','cost'],['Due','due_date']],
 improvement:[['Date','improvement_date'],['Improvement','title'],['Category','category'],['Cost','cost']]
};
export function createPassportRecordsTable(kind,records,assets=[],services=[]){
 const columns=passportColumns[kind];
 if(!columns)throw Error('Unknown Passport entry');
 if(!Array.isArray(records))throw Error('Invalid Passport records');
 if(kind==='asset'&&!Array.isArray(services))throw Error('Invalid service schedules');
 const table=document.createElement('table');table.className='passport-records-table';
 const caption=document.createElement('caption');caption.textContent=({asset:'Systems & equipment',service:'Service schedules',maintenance:'Maintenance history',improvement:'Improvements'})[kind];table.append(caption);
 const head=document.createElement('thead');const heading=document.createElement('tr');
 for(const [label] of columns){const th=document.createElement('th');th.textContent=label;th.setAttribute('scope','col');heading.append(th);}
 head.append(heading);table.append(head);
 const body=document.createElement('tbody');
 const money=value=>value===null||value===undefined||value===''?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
 for(const record of records){
  const tr=document.createElement('tr');
  const asset=kind==='service'?(Array.isArray(assets)?assets:[]).find(item=>item.id===record.asset_id):null;
  for(const [label,key] of columns){
   let value=key==='equipment'?(asset?.name||'Equipment not found'):key==='frequency'?(record.frequency_value?record.frequency_value+' '+(record.frequency_unit||'period'):'—'):key==='cost'?money(record.cost):record[key];
   const td=document.createElement('td');td.setAttribute('data-label',label);td.textContent=value===null||value===undefined||value===''?'—':String(value);tr.append(td);
  }
  body.append(tr);
  if(kind==='asset'){
   const details=[record.asset_type,record.purchase_cost!==null&&record.purchase_cost!==undefined?'Cost '+money(record.purchase_cost):null,record.expected_life_years?'Expected life '+record.expected_life_years+' years':null].filter(Boolean);
   const schedules=services.filter(service=>service.asset_id===record.id);
   for(const schedule of schedules){details.push('Service: '+(schedule.service_name||'Scheduled service')+(schedule.frequency_value?' every '+schedule.frequency_value+' '+(schedule.frequency_unit||'period'):'')+(schedule.next_service_date?' · Next '+schedule.next_service_date:''));}
   if(details.length){const detail=document.createElement('tr');const cell=document.createElement('td');cell.setAttribute('colspan',String(columns.length));cell.className='passport-record-details';cell.textContent=details.join(' · ');detail.append(cell);body.append(detail);}
  }
  if(kind==='service'&&record.notes||kind==='maintenance'&&(record.description||record.performed_by)||kind==='improvement'&&record.description){
   const detail=document.createElement('tr');const cell=document.createElement('td');cell.setAttribute('colspan',String(columns.length));cell.className='passport-record-details';cell.textContent=kind==='service'?'Notes: '+record.notes:kind==='maintenance'?[record.description,record.performed_by&&'Performed by '+record.performed_by].filter(Boolean).join(' · '):record.description;detail.append(cell);body.append(detail);
  }
 }
 if(!records.length){const tr=document.createElement('tr');const td=document.createElement('td');td.setAttribute('colspan',String(columns.length));td.className='passport-empty-records';td.textContent='No records yet';tr.append(td);body.append(tr);}
 table.append(body);return table;
}
