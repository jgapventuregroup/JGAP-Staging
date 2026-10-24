import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');
const frontendFiles=source=>source.match(/^\s*cp (index\.html[^\n]+) dist\/$/m)?.[1].split(/\s+/);
test('actual preview import check traverses modules and rejects a missing transitive file',()=>{
 const workflow=read('.github/workflows/investor-preview-artifact.yml');
 const files=frontendFiles(workflow);
 assert.ok(files?.length>10,'Expected explicit frontend asset allowlist');
 assert.deepEqual(files,frontendFiles(read('.github/workflows/pages.yml')),'Staging deployment and preview must ship the same app modules');
 assert.ok(files.every(file=>/^[\w.-]+\.(?:html|js|mjs)$/.test(file)),'Only public frontend files may ship');
 const code=workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/)?.[1].replace(/^          /gm,'');
 assert.ok(code,'Preview import-check script missing');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tka-frontend-'));
 try{
   fs.mkdirSync(path.join(directory,'dist'));
   for(const file of files)fs.copyFileSync(new URL(file,root),path.join(directory,'dist',file));
   const run=()=>spawnSync(process.execPath,['--input-type=module'],{cwd:directory,input:code,encoding:'utf8'});
   let result=run();assert.equal(result.status,0,result.stderr);
   const count=Number(result.stdout.match(/Verified (\d+) bundled/)?.[1]);
   assert.ok(count>10,'Import traversal must not silently stop at the entry module');
   fs.unlinkSync(path.join(directory,'dist','original-passport-writer.mjs'));
   result=run();assert.notEqual(result.status,0,'Missing transitive dependency must fail packaging');
   assert.match(result.stderr,/Missing preview module: original-passport-writer\.mjs/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
