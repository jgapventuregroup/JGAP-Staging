import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Version the shipped public files together so module dependencies cannot mix releases.
export function versionFrontend(directory){
 const files=[];
 const walk=relative=>{
  for(const entry of fs.readdirSync(path.join(directory,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const name=path.posix.join(relative,entry.name);
   if(entry.isDirectory())walk(name);
   else if(/\.(?:html|mjs|js|css)$/.test(name))files.push(name);
  }
 };
 walk('');
 const sources=files.map(name=>[name,fs.readFileSync(path.join(directory,name),'utf8')]);
 const hash=createHash('sha256');for(const [name,source] of sources)hash.update(name+'\0'+source+'\0');
 const version=hash.digest('hex').slice(0,20);
 for(const [name,source] of sources){
  let result=source;
  if(/\.(?:mjs|js)$/.test(name))result=result.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.{1,2}\/[^'"?]+\.(?:mjs|js))\2/g,(_,prefix,quote,url)=>prefix+quote+url+'?v='+version+quote);
  if(name.endsWith('.html')){
   result=result.replace(/(<script\b[^>]*\bsrc=['"])(?!https?:|\/\/)([^'"?]+\.(?:js|mjs))(['"])/g,(_,prefix,url,quote)=>prefix+url+'?v='+version+quote);
   result=result.replace(/(<link\b[^>]*\bhref=['"])(?!https?:|\/\/)([^'"?]+\.css)(['"])/g,(_,prefix,url,quote)=>prefix+url+'?v='+version+quote);
   result=result.replace(/<head>/i,'<head>\n<meta name="tka-build" content="'+version+'">');
  }
  fs.writeFileSync(path.join(directory,name),result);
 }
 return version;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Versioned public frontend '+versionFrontend(process.argv[2]||'dist'));
