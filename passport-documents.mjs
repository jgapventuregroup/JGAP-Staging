export const DOCUMENT_BUCKET='passport-documents';
export const DOCUMENT_LIMIT=10*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const types={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'};
const objectName=/^[0-9a-f-]{36}--[A-Za-z0-9][A-Za-z0-9._ -]{0,119}\.(pdf|jpg|jpeg|png)$/;
function scope(context){
 const {client,companyId,dealId,getCurrentCompany,getCurrentClient}=context;
 if(globalThis.JGAP_PASSPORT_DOCUMENTS_READY!==true)throw Error('Documents are not available in this staging release yet.');
 if(!client||!uuid.test(companyId)||!uuid.test(dealId)||typeof getCurrentCompany!=='function'||typeof getCurrentClient!=='function')throw Error('Invalid document context');
 if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Document workspace changed');
 return companyId+'/'+dealId;
}
async function authorize(context,write=false){
 scope(context);
 const {data,error}=await context.client.rpc('advanced_finance_access',{p_company_id:context.companyId});
 scope(context);
 if(error||data?.read!==true||(write&&data?.write!==true))throw Error('Active Pro access'+(write?' and an editing role':'')+' required for documents');
}
export async function validatePassportDocument(file){
 if(!file||typeof file.name!=='string'||typeof file.slice!=='function'||!Number.isInteger(file.size)||file.size<1||file.size>DOCUMENT_LIMIT)throw Error('Choose a non-empty file up to 10 MB');
 if(/[\\/\x00-\x1f\x7f]/.test(file.name))throw Error('Invalid document filename');
 const extension=file.name.split('.').at(-1).toLowerCase();
 if(!types[extension]||file.type!==types[extension])throw Error('Supported documents: PDF, JPEG and PNG');
 const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
 const valid=extension==='pdf'?String.fromCharCode(...bytes.slice(0,5))==='%PDF-':extension==='png'?[137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!valid)throw Error('File contents do not match the selected document type');
 let base=file.name.slice(0,-extension.length-1).replace(/[^A-Za-z0-9._ -]/g,'_').slice(0,100).trim();
 if(!/^[A-Za-z0-9]/.test(base))base='Document_'+base;
 return {filename:base+'.'+extension,contentType:types[extension]};
}
function entryFromRow(prefix,row){
 if(!row?.id||typeof row.name!=='string'||!objectName.test(row.name))throw Error('Invalid document response');
 return {id:row.id,path:prefix+'/'+row.name,filename:row.name.slice(38),size:Number.isFinite(Number(row.metadata?.size))?Number(row.metadata.size):null,createdAt:row.created_at||null};
}
export async function listPassportDocuments(context,offset=0){
 if(!Number.isInteger(offset)||offset<0)throw Error('Invalid document page');
 await authorize(context);const prefix=scope(context);
 const {data,error}=await context.client.storage.from(DOCUMENT_BUCKET).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
 scope(context);if(error)throw Error('Could not list property documents');
 if(!Array.isArray(data)||data.length>100)throw Error('Invalid document response');
 const entries=data.map(row=>entryFromRow(prefix,row));
 if(new Set(entries.map(e=>e.path)).size!==entries.length)throw Error('Duplicate document response');
 return {entries,nextOffset:entries.length===100?offset+100:null};
}
export async function uploadPassportDocument(context,file){
 scope(context);const validated=await validatePassportDocument(file);await authorize(context,true);
 const prefix=scope(context);const name=crypto.randomUUID()+'--'+validated.filename;const path=prefix+'/'+name;
 const storage=context.client.storage.from(DOCUMENT_BUCKET);
 const {data,error}=await storage.upload(path,file,{upsert:false,contentType:validated.contentType,cacheControl:'0'});
 scope(context);if(error)throw Error('Document upload failed: '+error.message);
 try{
  if(data?.path!==path)throw Error('Uploaded path did not match selected property');
  const result=await storage.list(prefix,{limit:2,search:name});scope(context);
  if(result.error||!Array.isArray(result.data)||result.data.length!==1||result.data[0].name!==name)throw Error('Upload could not be verified');
  return entryFromRow(prefix,result.data[0]);
 }catch(cause){
  const failure=new Error('File uploaded, but verification failed. Refresh documents before retrying.');failure.uploaded=true;failure.cause=cause;throw failure;
 }
}
export async function downloadPassportDocument(context,entry){
 await authorize(context);const prefix=scope(context);
 if(!entry||typeof entry.path!=='string'||!entry.path.startsWith(prefix+'/')||!objectName.test(entry.path.slice(prefix.length+1)))throw Error('Document does not belong to this property');
 const {data,error}=await context.client.storage.from(DOCUMENT_BUCKET).download(entry.path,{}, {cache:'no-store'});scope(context);
 if(error||!data||typeof data.arrayBuffer!=='function')throw Error('Could not download document');
 return data;
}

export async function createPassportDocumentsSection(context){
 const section=document.createElement('section');section.dataset.passportDocuments='true';
 const heading=document.createElement('h3');heading.textContent='Documents';section.append(heading);
 const message=document.createElement('p');message.setAttribute('role','status');section.append(message);
 if(globalThis.JGAP_PASSPORT_DOCUMENTS_READY!==true){message.textContent='Documents are not available in this staging release yet.';return section;}
 try{
  await authorize(context);scope(context);
  const description=document.createElement('p');description.textContent='Private property files · PDF, JPEG or PNG · Up to 10 MB each. Files download without an inline preview. Automated malware scanning is not connected.';section.append(description);
  const list=document.createElement('div');section.append(list);let nextOffset=null;let busy=false;
  const more=document.createElement('button');more.type='button';more.textContent='Load more documents';more.hidden=true;section.append(more);
  const render=entries=>{
   for(const entry of entries){
    const row=document.createElement('p');const name=document.createElement('span');name.textContent=entry.filename+' ';row.append(name);
    const download=document.createElement('button');download.type='button';download.textContent='Download';download.setAttribute('aria-label','Download '+entry.filename);
    download.onclick=async()=>{
     download.disabled=true;
     try{const blob=await downloadPassportDocument(context,entry);scope(context);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=entry.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message.textContent='Download prepared.';}
     catch(error){try{scope(context);message.textContent=error.message;}catch{}}
     finally{download.disabled=false;}
    };
    row.append(download);list.append(row);
   }
  };
  const load=async(reset=false)=>{
   if(busy)return;busy=true;more.disabled=true;
   try{const page=await listPassportDocuments(context,reset?0:nextOffset);scope(context);if(reset)list.replaceChildren();render(page.entries);nextOffset=page.nextOffset;more.hidden=nextOffset===null;message.textContent=!list.children.length?'No documents uploaded.':'';return true;}
   catch(error){try{scope(context);message.textContent=error.message;}catch{}return false;}
   finally{busy=false;more.disabled=false;}
  };
  more.onclick=()=>load(false);await load(true);scope(context);
  const {data:capability,error:capabilityError}=await context.client.rpc('advanced_finance_access',{p_company_id:context.companyId});scope(context);
  if(!capabilityError&&capability?.read===true&&capability?.write===true){
   const form=document.createElement('form');form.dataset.documentUpload='true';
   const label=document.createElement('label');label.textContent='Choose property document ';const input=document.createElement('input');input.type='file';input.accept='.pdf,.jpg,.jpeg,.png';input.required=true;label.append(input);form.append(label);
   const submit=document.createElement('button');submit.type='submit';submit.textContent='Upload document';form.append(submit);
   form.addEventListener('submit',async event=>{event.preventDefault();if(submit.disabled)return;submit.disabled=true;let partial=false;message.textContent='Uploading…';
    try{await uploadPassportDocument(context,input.files?.[0]);scope(context);form.reset();const refreshed=await load(true);scope(context);message.textContent=refreshed?'Document uploaded and verified.':'Document uploaded and verified, but the list could not refresh. Reopen Documents.';}
    catch(error){partial=error.uploaded===true;try{scope(context);message.textContent=error.message;}catch{}}
    finally{submit.disabled=partial;}
   });section.append(form);
  }
 }catch(error){message.textContent=error.message;}
 return section;
}
