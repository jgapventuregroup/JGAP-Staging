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
     append(...children){this.children.push(...children)},
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
   preview.setEligibility({companyId:'c1',enabled:true});
   preview.addAction(options);
   assert.equal(line.children.length,1,'Paid workspace gets Passport action');
   await line.children[0].onclick();
   assert.equal(line.afterNode?.attributes['aria-label'],'Property Passport preview');
   assert.equal(line.afterNode.children[0].textContent,'Duplex — Passport preview');
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
 }finally{
   globalThis.document=previousDocument;
   globalThis.window=previousWindow;
 }
});
