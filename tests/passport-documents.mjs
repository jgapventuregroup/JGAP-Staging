import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePassportDocument,listPassportDocuments,uploadPassportDocument,downloadPassportDocument,createPassportDocumentsSection,DOCUMENT_LIMIT,DOCUMENT_BUCKET} from '../passport-documents.mjs';
const a='20000000-0000-4000-8000-000000000001',d='30000000-0000-4000-8000-000000000001';
const file=(name='Receipt.pdf',type='application/pdf',body='%PDF-1.4\nFictional QA')=>Object.assign(new Blob([body],{type}),{name});
function fixture({read=true,write=true,wrongPath=false,wrongList=false,changeDuring=null}={}){
 let company=a,uploadedPath;const calls=[];
 const client={rpc:async(name,args)=>{calls.push({op:'authorize',name,args});return {data:{read,write},error:null}},storage:{from(bucket){assert.equal(bucket,DOCUMENT_BUCKET);return {
  upload:async(path,blob,options)=>{calls.push({op:'upload',path,options});uploadedPath=path;if(changeDuring==='upload')company='foreign';return {data:{path:wrongPath?'foreign/path':path},error:null}},
  list:async(prefix,options)=>{calls.push({op:'list',prefix,options});if(changeDuring==='list')company='foreign';return {data:wrongList?[{id:'bad',name:'../../foreign.pdf'}]:uploadedPath?[{id:'object-1',name:uploadedPath.split('/').at(-1),metadata:{size:20}}]:[],error:null}},
  download:async(path)=>{calls.push({op:'download',path});if(changeDuring==='download')company='foreign';return {data:new Blob(['%PDF-test'],{type:'application/pdf'}),error:null}}
 }}}};
 return {calls,context:{client,companyId:a,dealId:d,getCurrentCompany:()=>company,getCurrentClient:()=>client}};
}
globalThis.JGAP_PASSPORT_DOCUMENTS_READY=true;
test('document file checks reject empty/oversize, unsupported types and spoofed contents',async()=>{
 const good=await validatePassportDocument(file('Inspection & receipt.PDF'));assert.equal(good.filename,'Inspection _ receipt.pdf');
 for(const bad of [file('x.html','text/html','<html>'),file('x.pdf','application/pdf','not a PDF'),file('../x.pdf'),file('x.pdf','image/png'),Object.assign(new Blob([],{type:'application/pdf'}),{name:'empty.pdf'}),{name:'large.pdf',size:DOCUMENT_LIMIT+1,slice(){}}])await assert.rejects(validatePassportDocument(bad));
 await validatePassportDocument(file('photo.png','image/png',new Uint8Array([137,80,78,71,13,10,26,10])));
 await validatePassportDocument(file('photo.jpg','image/jpeg',new Uint8Array([255,216,255,0])));
});
test('document release gate fails closed before calling any API',async()=>{
 const f=fixture();globalThis.JGAP_PASSPORT_DOCUMENTS_READY=false;
 try{await assert.rejects(listPassportDocuments(f.context),/not available/);await assert.rejects(uploadPassportDocument(f.context,file()),/not available/);assert.equal(f.calls.length,0)}finally{globalThis.JGAP_PASSPORT_DOCUMENTS_READY=true}
});
test('document access uses server capability, not browser membership labels',async()=>{
 for(const capability of [{read:false,write:true},{read:false,write:false}]){const f=fixture(capability);await assert.rejects(listPassportDocuments(f.context),/Active Pro/);await assert.rejects(uploadPassportDocument(f.context,file()),/Active Pro/);assert.ok(f.calls.every(c=>c.op==='authorize'))}
 const viewer=fixture({write:false});await listPassportDocuments(viewer.context);await assert.rejects(uploadPassportDocument(viewer.context,file()),/editing role/);assert.equal(viewer.calls.filter(c=>c.op==='upload').length,0);
});
test('document upload uses immutable scoped path, matching type and exact post-upload verification',async()=>{
 const f=fixture();const entry=await uploadPassportDocument(f.context,file());const request=f.calls.find(c=>c.op==='upload');
 assert.ok(request.path.startsWith(a+'/'+d+'/'));assert.match(request.path,/\/[0-9a-f-]{36}--Receipt\.pdf$/);assert.equal(request.options.upsert,false);assert.equal(request.options.contentType,'application/pdf');assert.equal(entry.filename,'Receipt.pdf');assert.equal(entry.path,request.path);
 const blob=await downloadPassportDocument(f.context,entry);assert.equal(blob.type,'application/pdf');
 await assert.rejects(downloadPassportDocument(f.context,{...entry,path:entry.path.replace(d,'30000000-0000-4000-8000-000000000002')}),/does not belong/);
 assert.equal(f.calls.filter(c=>c.op==='download').length,1);
});
test('upload response and listing failures report partial save rather than encourage duplicate upload',async()=>{
 for(const options of [{wrongPath:true},{wrongList:true}]){const f=fixture(options);await assert.rejects(uploadPassportDocument(f.context,file()),e=>e.uploaded===true&&/Refresh documents/.test(e.message));assert.equal(f.calls.filter(c=>c.op==='upload').length,1)}
});
test('changed sessions and malformed list responses cannot enter another property view',async()=>{
 const listing=fixture({changeDuring:'list'});await assert.rejects(listPassportDocuments(listing.context),/workspace changed/);
 const upload=fixture({changeDuring:'upload'});await assert.rejects(uploadPassportDocument(upload.context,file()),/workspace changed/);
 const f=fixture({wrongList:true});await assert.rejects(listPassportDocuments(f.context),/Invalid document response/);
 const download=fixture({changeDuring:'download'});await assert.rejects(downloadPassportDocument(download.context,{path:a+'/'+d+'/00000000-0000-4000-8000-000000000001--Receipt.pdf'}),/workspace changed/);
});

test('unverified Documents tab is explicit and cannot render upload/download controls or call the backend',async()=>{
 const previous=globalThis.document;globalThis.JGAP_PASSPORT_DOCUMENTS_READY=false;
 globalThis.document={createElement:tag=>({tag,dataset:{},children:[],append(...children){this.children.push(...children)},setAttribute(){}})};
 try{const f=fixture();const section=await createPassportDocumentsSection(f.context);assert.equal(section.dataset.passportDocuments,'true');assert.match(section.children[1].textContent,/not available/);assert.equal(section.children.length,2);assert.equal(f.calls.length,0)}finally{globalThis.document=previous;globalThis.JGAP_PASSPORT_DOCUMENTS_READY=true}
});
