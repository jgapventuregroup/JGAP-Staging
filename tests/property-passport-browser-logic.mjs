import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

test('Passport preview requires active entitlement and ignores stale company results',async()=>{
 const previousDocument=globalThis.document;
 const previousWindow=globalThis.window;
 const elements=[];
 function node(tag){
   const item={tag,dataset:{},children:[],attributes:{},textContent:'',disabled:false,isConnected:true,
     append(...children){for(const child of children){this.children.push(child);if(child&&typeof child==='object')child.parentNode=this}},
     addEventListener(){},
     replaceChildren(...items){this.children=[];this.append(...items)},
     setAttribute(k,v){this.attributes[k]=v},
     after(child){this.afterNode=child},
     remove(){this.removed=true},
     scrollIntoView(){}};
   elements.push(item);return item;
 }
 globalThis.document={createElement:node,createTextNode:text=>({textContent:text})};
 globalThis.window={};
 try{
   await import(pathToFileURL(resolve('property-passport-preview.mjs')).href);
   const preview=window.JGAPPassportPreview;
   const line=node('p');
   const deal={id:'deal-1',name:'Duplex'};
   let company='c1',client={};
   const options={line,deal,companyId:'c1',client,getCurrentCompany:()=>company,getCurrentClient:()=>client,
     fetchDeal:async()=>({id:'deal-1',company_id:'c1',name:'Duplex',monthly_rent:1200})};
   preview.addAction(options);
   assert.equal(line.children.length,0,'No Passport action on Free or unverified plan');
   preview.setEligibility(null);
   preview.addAction(options);
   assert.equal(line.children.length,0,'Missing entitlement cannot expose Passport');
   preview.setEligibility({companyId:'c1',enabled:true});
   const incomplete=node('p');
   preview.addAction({...options,line:incomplete,deal:{name:'No identity'}});
   assert.equal(incomplete.children.length,0,'Property without ID cannot expose Passport');
   const returnedAction=preview.addAction(options);
   assert.equal(returnedAction,line.children[0],'Dashboard reuses the same guarded Passport action');
   assert.equal(line.children.length,1,'Paid workspace gets Passport action');
   assert.equal(line.children[0].attributes['aria-expanded'],'false','Passport begins collapsed');
   await line.children[0].onclick();
   assert.equal(line.afterNode?.attributes['aria-label'],'Property Passport');
   assert.equal(line.afterNode.children[0].textContent,'Duplex — Property Passport');
   const openPanel=line.afterNode;
   assert.equal(line.children[0].attributes['aria-expanded'],'true','Opening Passport updates expanded state');
   const financialRows=openPanel.children.flatMap(child=>child.tag==='section'?child.children.filter(row=>row.tag==='p'):child.tag==='p'?[child]:[]).map(child=>child.children.map(part=>part.textContent).join(''));
   assert.ok(financialRows.includes('Estimated equity: Not recorded'),'Unknown equity must be explicit');
   assert.ok(financialRows.includes('Current market value: Not recorded'),'ARV must not be shown as market value');
   const groups=openPanel.children.filter(child=>child.tag==='section').map(child=>child.attributes['aria-label']);
   assert.deepEqual(groups.slice(0,3),['Property details','Financial snapshot','Notes & next steps'],'Passport groups must be available in the app and printable view');
   const closeButton=openPanel.children[1];
   assert.equal(closeButton.textContent,'Close Passport');
   closeButton.onclick();
   assert.equal(openPanel.removed,true,'Close action removes the active Passport');
   assert.equal(line.children[0].attributes['aria-expanded'],'false','Closing Passport restores collapsed state');
   assert.equal(line.children[0].disabled,false,'Close action leaves preview button usable');
   preview.setEligibility({companyId:'c1',enabled:true});
   const accountChange=node('p');
   preview.addAction({...options,line:accountChange});
   await accountChange.children[0].onclick();
   assert.equal(accountChange.children[0].attributes['aria-expanded'],'true');
   preview.clear();
   assert.equal(accountChange.children[0].attributes['aria-expanded'],'false','Account reset collapses Passport');
   preview.setEligibility({companyId:'c1',enabled:true});
   const firstSwitch=node('p');
   preview.addAction({...options,line:firstSwitch});
   await firstSwitch.children[0].onclick();
   assert.equal(firstSwitch.children[0].attributes['aria-expanded'],'true');
   const nextSwitch=node('p');
   preview.addAction({...options,line:nextSwitch});
   await nextSwitch.children[0].onclick();
   assert.equal(firstSwitch.children[0].attributes['aria-expanded'],'false','Opening another property collapses the prior action');
   assert.equal(nextSwitch.children[0].attributes['aria-expanded'],'true','Latest Passport action expands');
   preview.clear();
   preview.setEligibility({companyId:'c1',enabled:true});
   const wrong=node('p');
   preview.addAction({...options,line:wrong,fetchDeal:async()=>({id:'another-deal',company_id:'c1',name:'Wrong property'})});
   await wrong.children[0].onclick();
   assert.match(wrong.afterNode?.textContent||'',/did not match the selected company and property/,'Mismatched property cannot display Passport');
   assert.equal(wrong.children[0].attributes['aria-expanded'],'false','Rejected property must remain collapsed');
   const wrongCompany=node('p');
   preview.addAction({...options,line:wrongCompany,fetchDeal:async()=>({id:'deal-1',company_id:'c2',name:'Other company'})});
   await wrongCompany.children[0].onclick();
   assert.match(wrongCompany.afterNode?.textContent||'',/did not match the selected company and property/,'A matching property ID with the wrong company cannot display Passport');
   assert.equal(wrongCompany.children[0].attributes['aria-expanded'],'false','Rejected company must remain collapsed');
   preview.clear();preview.setEligibility({companyId:'c1',enabled:true});
   window.JGAP_OPERATIONS_WRITES_READY=true;
   const activityLine=node('p');
   preview.addAction({...options,line:activityLine,fetchOperations:async()=>({ledger:[{id:'income-1',company_id:'c1',deal_id:'deal-1',entry_type:'income',entry_date:'2026-10-24',category:'Rent',amount:'1250.00'}],repairs:[],tasks:[]})});
   await activityLine.children[0].onclick();
   assert.equal(activityLine.afterNode?.attributes['aria-label'],'Property Passport',activityLine.afterNode?.textContent);
   assert.ok(elements.some(el=>el.dataset?.activityTotal==='income'&&el.textContent==='$1,250.00'),'Actual ledger totals must appear');
   assert.ok(elements.some(el=>el.textContent==='Property activity history'),'Recorded entries must be visible, not just aggregate totals');
   assert.ok(elements.some(el=>el.attributes?.['aria-label']==='Add task'),'Authorized operations editor must be wired into Passport');
   preview.clear();preview.setEligibility({companyId:'c1',enabled:true});
   const activityFailure=node('p');
   preview.addAction({...options,line:activityFailure,fetchOperations:async()=>{throw Error('unavailable')}});
   await activityFailure.children[0].onclick();
   assert.equal(activityFailure.afterNode?.attributes['aria-label'],'Property Passport','Activity network failure must preserve the existing financial Passport');
   assert.ok(activityFailure.afterNode.children.some(el=>el.attributes?.['aria-label']==='Edit Passport financials'));
   assert.ok(activityFailure.afterNode.children.some(el=>el.textContent?.startsWith('Property activity could not load')),'Do not present failed loads as zero totals');
   let release;
   options.fetchDeal=()=>new Promise(resolve=>{release=resolve});
   const second=node('p');
   preview.addAction({...options,line:second});
   const pending=second.children[0].onclick();
   assert.equal(second.children[0].disabled,true,'Loading disables the current Passport action');
   company='c2';
   preview.clear();
   assert.equal(second.children[0].disabled,false,'Clearing a session releases an unfinished loading button');
   release({id:'deal-1',company_id:'c1',name:'Private'});
   await pending;
   assert.equal(second.afterNode,undefined,'Stale result must not render');
   company='c1';
   preview.setEligibility({companyId:'c1',enabled:true});
   let rejectRequest;
   const third=node('p');
   preview.addAction({...options,line:third,fetchDeal:()=>new Promise((_,reject)=>{rejectRequest=reject})});
   const failed=third.children[0].onclick();
   preview.setEligibility({companyId:'c1',enabled:false});
   assert.equal(third.children[0].disabled,false,'Revoking entitlement releases an unfinished loading button');
   rejectRequest(new Error('Private server error'));
   await failed;
   assert.equal(third.afterNode,undefined,'Revoked entitlement must suppress stale errors');
 }finally{
   globalThis.document=previousDocument;
   globalThis.window=previousWindow;
 }
});


test('Passport financial purchase dates reject impossible and malformed dates',async()=>{
 const {validPassportPurchaseDate}=await import('../property-passport-preview.mjs');
 for(const date of ['', '2026-10-19', '2024-02-29'])assert.equal(validPassportPurchaseDate(date),true,date);
 for(const date of ['2026-02-30','2026-13-01','2026-1-01','not-a-date',null,123])assert.equal(validPassportPurchaseDate(date),false,String(date));
});

test('every live Passport record load supplies active company and client guards',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../property-passport-preview.mjs',import.meta.url),'utf8');
 const calls=[...source.matchAll(/loadOriginalPassportRecords\(\{([^}]+)\}\)/g)];
 assert.equal(calls.length,4,'All initial and post-save record loads must be guarded');
 for(const match of calls){
  assert.match(match[1],/getCurrentCompany/);
  assert.match(match[1],/getCurrentClient/);
 }
});

test('staging Passport action receives live company and client callbacks',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const call=source.match(/JGAPPassportPreview\?\.addAction\(\{line:actions,[\s\S]*?fetchDeal:/);
 assert.ok(call,'Expected staging Passport action');
 assert.match(call[0],/getCurrentCompany:\(\)=>companyId/);
 assert.match(call[0],/getCurrentClient:\(\)=>client/);
 assert.doesNotMatch(call[0],/getCurrentCompany:\(\)=>activeCompany/);
 assert.doesNotMatch(call[0],/getCurrentClient:\(\)=>activeClient/);
});

test('Passport notes save exact scope, verify persistence and preserve text on failures',async()=>{
 const previousDocument=globalThis.document;
 const node=tag=>({tag,children:[],value:'',disabled:false,setAttribute(k,v){this[k]=v},append(...items){this.children.push(...items)}});
 globalThis.document={createElement:node};
 try{
  const {createPassportNotesEditor}=await import('../property-passport-preview.mjs');
  const record={id:'property-A',company_id:'company-A',notes:'Original notes'};
  let current=true,mode='success',displayed='Original notes',release;
  const calls=[];
  const client={rpc:async(name,args)=>{
   calls.push({name,args});
   if(mode==='deferred'&&name==='update_company_deal')await new Promise(resolve=>{release=resolve});
   if(mode==='denied')return {data:null,error:Error('Role cannot edit')};
   if(mode==='reload-fails'&&name==='get_company_deal')return {data:null,error:Error('Offline')};
   return {data:{...record,notes:args.p_patch?.notes??(mode==='cleared'?null:'New notes'),...(mode==='foreign'?{company_id:'company-B'}:{})},error:null};
  }};
  const make=()=>createPassportNotesEditor({record,client,companyId:'company-A',isCurrent:()=>current,onSaved:value=>{displayed=value}});
  const submit=form=>form.onsubmit({preventDefault(){}});
  let form=make(),input=form.children[1].children[0];assert.equal(input.value,'Original notes');input.value=' New notes ';await submit(form);
  assert.deepEqual(calls[0],{name:'update_company_deal',args:{p_company_id:'company-A',p_deal_id:'property-A',p_patch:{notes:'New notes'}}});
  assert.equal(calls[1].name,'get_company_deal');assert.equal(displayed,'New notes');assert.match(form.children[3].textContent,/saved and verified/);
  mode='cleared';form=make();form.children[1].children[0].value=' ';await submit(form);assert.equal(displayed,null,'Empty notes explicitly clear saved notes');
  for(const failure of ['denied','foreign','reload-fails']){
   mode=failure;displayed='Original notes';form=make();input=form.children[1].children[0];input.value='New notes';await submit(form);
   assert.equal(input.value,'New notes','Failure retains the draft');assert.equal(displayed,'Original notes','Unverified data must not replace displayed notes');assert.equal(input.disabled,false);
   assert.match(form.children[3].textContent,failure==='reload-fails'?/Notes saved, but reload/:/Could not save notes/);
  }
  mode='deferred';form=make();form.children[1].children[0].value='New notes';const before=calls.length;const pending=submit(form);await submit(form);assert.equal(calls.length,before+1,'Double submit cannot duplicate requests');
  current=false;release();await pending;assert.equal(calls.length,before+1,'Company switch prevents verification request and stale display update');
  const blocked=make();await submit(blocked);assert.equal(calls.length,before+1,'Closed or stale Passport cannot save');
 }finally{globalThis.document=previousDocument;}
});
