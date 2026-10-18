import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

test('Passport preview requires active entitlement and ignores stale company results',async()=>{
 const previousDocument=globalThis.document;
 const previousWindow=globalThis.window;
 const elements=[];
 function node(tag){
   const item={tag,children:[],attributes:{},textContent:'',disabled:false,isConnected:true,
     append(...children){for(const child of children){this.children.push(child);if(child&&typeof child==='object')child.parentNode=this}},
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
   preview.addAction(options);
   assert.equal(line.children.length,1,'Paid workspace gets Passport action');
   await line.children[0].onclick();
   assert.equal(line.afterNode?.attributes['aria-label'],'Property Passport');
   assert.equal(line.afterNode.children[0].textContent,'Duplex — Property Passport');
   const openPanel=line.afterNode;
   const financialRows=openPanel.children.flatMap(child=>child.tag==='section'?child.children.filter(row=>row.tag==='p'):child.tag==='p'?[child]:[]).map(child=>child.children.map(part=>part.textContent).join(''));
   assert.ok(financialRows.includes('Estimated equity: Not recorded'),'Unknown equity must be explicit');
   assert.ok(financialRows.includes('Current market value: Not recorded'),'ARV must not be shown as market value');
   const closeButton=openPanel.children[1];
   assert.equal(closeButton.textContent,'Close Passport');
   closeButton.onclick();
   assert.equal(openPanel.removed,true,'Close action removes the active Passport');
   assert.equal(line.children[0].disabled,false,'Close action leaves preview button usable');
   const wrong=node('p');
   preview.addAction({...options,line:wrong,fetchDeal:async()=>({id:'another-deal',company_id:'c1',name:'Wrong property'})});
   await wrong.children[0].onclick();
   assert.match(wrong.afterNode?.textContent||'',/did not match the selected company and property/,'Mismatched property cannot display Passport');
   const wrongCompany=node('p');
   preview.addAction({...options,line:wrongCompany,fetchDeal:async()=>({id:'deal-1',company_id:'c2',name:'Other company'})});
   await wrongCompany.children[0].onclick();
   assert.match(wrongCompany.afterNode?.textContent||'',/did not match the selected company and property/,'A matching property ID with the wrong company cannot display Passport');
   let release;
   options.fetchDeal=()=>new Promise(resolve=>{release=resolve});
   const second=node('p');
   preview.addAction({...options,line:second});
   const pending=second.children[0].onclick();
   company='c2';
   preview.clear();
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
   rejectRequest(new Error('Private server error'));
   await failed;
   assert.equal(third.afterNode,undefined,'Revoked entitlement must suppress stale errors');
 }finally{
   globalThis.document=previousDocument;
   globalThis.window=previousWindow;
 }
});
