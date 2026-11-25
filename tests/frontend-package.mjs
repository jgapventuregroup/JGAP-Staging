import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

import {versionFrontend} from '../scripts/version-frontend.mjs';
const root=new URL('../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');
const frontendFiles=source=>source.match(/^\s*cp (index\.html[^\n]+) dist\/$/m)?.[1].split(/\s+/);
test('actual preview import check traverses modules and rejects a missing transitive file',()=>{
 const workflow=read('.github/workflows/investor-preview-artifact.yml');
 const files=frontendFiles(workflow);
 assert.ok(files?.length>10,'Expected explicit frontend asset allowlist');
 assert.deepEqual(files,frontendFiles(read('.github/workflows/pages.yml')),'Staging deployment and preview must ship the same app modules');
 assert.ok(files.every(file=>/^[\w.-]+\.(?:html|js|mjs|css|txt)$/.test(file)),'Only public frontend files may ship');
 assert.ok(files.every(file=>!/^(?:dashboard-(?:customization|grid)|gridstack)/.test(file)),'Retired dashboard editor must not ship');
 const code=workflow.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/)?.[1].replace(/^          /gm,'');
 assert.ok(code,'Preview import-check script missing');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tka-frontend-'));
 try{
   fs.mkdirSync(path.join(directory,'dist'));
   for(const file of files)fs.copyFileSync(new URL(file,root),path.join(directory,'dist',file));
   versionFrontend(path.join(directory,'dist'));
   const run=()=>spawnSync(process.execPath,['--input-type=module'],{cwd:directory,input:code,encoding:'utf8'});
   let result=run();assert.equal(result.status,0,result.stderr);
   const count=Number(result.stdout.match(/Verified (\d+) bundled/)?.[1]);
   assert.ok(count>10,'Import traversal must not silently stop at the entry module');
   for(const entry of ['page-help.mjs','market-map.mjs','in-app-alerts.mjs','config.js']){
    const filename=path.join(directory,'dist',entry),bytes=fs.readFileSync(filename);fs.unlinkSync(filename);
    result=run();assert.notEqual(result.status,0,'Missing entry script must fail packaging: '+entry);assert.ok(result.stderr.includes('Missing preview module: '+entry));fs.writeFileSync(filename,bytes);
   }
   fs.writeFileSync(path.join(directory,'dist','package-probe.mjs'),"const later=()=>import('./missing-lazy-child.mjs');");
   fs.appendFileSync(path.join(directory,'dist','index.html'),'<script type="module" src="package-probe.mjs"></script>');
   result=run();assert.notEqual(result.status,0,'Missing literal dynamic import must fail packaging');assert.match(result.stderr,/missing-lazy-child/);
   fs.writeFileSync(path.join(directory,'dist','missing-lazy-child.mjs'),'export const ready=true');
   fs.unlinkSync(path.join(directory,'dist','original-passport-writer.mjs'));
   result=run();assert.notEqual(result.status,0,'Missing transitive dependency must fail packaging');
   assert.match(result.stderr,/Missing preview module: original-passport-writer\.mjs/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('release versions cover entry scripts and transitive imports while preserving external URLs',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tka-version-'));
 try{
  const write=()=>{
   fs.writeFileSync(path.join(directory,'index.html'),'<head></head><script type="module" src="app.mjs"></script><script src="https://vendor.example/sdk.js"></script>');
   fs.writeFileSync(path.join(directory,'app.mjs'),"import {x} from './child.mjs'; export {y} from './other.mjs'; const load=()=>import('./child.mjs');");
   fs.writeFileSync(path.join(directory,'child.mjs'),'export const x=1');fs.writeFileSync(path.join(directory,'other.mjs'),'export const y=2');
  };
  write();const first=versionFrontend(directory);
  assert.match(fs.readFileSync(path.join(directory,'index.html'),'utf8'),new RegExp('app.mjs\\?v='+first));
  assert.ok(fs.readFileSync(path.join(directory,'index.html'),'utf8').includes('https://vendor.example/sdk.js"'));
  const module=fs.readFileSync(path.join(directory,'app.mjs'),'utf8');assert.equal((module.match(new RegExp('\\?v='+first,'g'))||[]).length,3);
  write();assert.equal(versionFrontend(directory),first,'Same sources produce identical release token');
  write();fs.appendFileSync(path.join(directory,'child.mjs'),'; // new implementation');const next=versionFrontend(directory);assert.notEqual(next,first);
  assert.ok(fs.readFileSync(path.join(directory,'app.mjs'),'utf8').includes('./child.mjs?v='+next));
  for(const workflow of ['pages.yml','investor-preview-artifact.yml'])assert.match(read('.github/workflows/'+workflow),/node scripts\/version-frontend\.mjs dist/);
 }finally{fs.rmSync(directory,{recursive:true,force:true})}
});

test('local map styles are versioned and bundled vendor files match the pinned package',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tka-map-css-'));
 try{
  const write=css=>{fs.writeFileSync(path.join(directory,'index.html'),'<head><link rel="stylesheet" href="leaflet.css"><link rel="stylesheet" href="https://example.invalid/external.css"></head>');fs.writeFileSync(path.join(directory,'leaflet.css'),css);};
  write('.map{height:400px}');const first=versionFrontend(directory);const html=fs.readFileSync(path.join(directory,'index.html'),'utf8');assert.ok(html.includes('leaflet.css?v='+first));assert.ok(html.includes('https://example.invalid/external.css"'));write('.map{height:420px}');assert.notEqual(versionFrontend(directory),first);
  for(const [bundled,source] of [['leaflet.js','dist/leaflet.js'],['leaflet.css','dist/leaflet.css'],['leaflet-LICENSE.txt','LICENSE']])assert.ok(read(bundled)===read('node_modules/leaflet/'+source),'Bundled Leaflet file differs from pinned package: '+bundled);
 }finally{fs.rmSync(directory,{recursive:true,force:true})}
});

test('private release ships static-host headers and keeps billing disabled',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tka-pages-'));
 try{
  const config=path.join(directory,'fixture.json');
  const output=path.join(directory,'release');
  fs.writeFileSync(config,JSON.stringify({
   appUrl:'https://investor.example.test',
   supabaseUrl:'https://backend.example.test',
   publishableKey:'sb_publishable_fixture'
  }));
  const result=spawnSync(process.execPath,['scripts/build-private-release.mjs',config,output],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const headers=fs.readFileSync(path.join(output,'_headers'),'utf8');
  assert.equal(headers,read('hosting/cloudflare-pages/_headers'));
  assert.match(headers,/frame-ancestors 'none'/);
  assert.match(headers,/X-Content-Type-Options: nosniff/);
  const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
  assert.match(html, /<title>The Key Ahead Investor App<\/title>/);
  assert.doesNotMatch(html, /staging-only|STAGING ONLY|Stripe sandbox only|staging drafts|Test Investor|Test Pro|Manage test subscription<\/button>/);
  assert.match(fs.readFileSync(path.join(output,'config.js'),'utf8'), /"environment":"production"/);
  assert.match(read('config.js'), /environment: 'staging'/);
  assert.match(read('index.html'), /STAGING ONLY/);
  assert.match(read('index.html'), /Stripe sandbox only/);
  assert.match(read('index.html'), /data-test-billing="portal"/);
  for (const name of ['terms.html','privacy.html']) {
    assert.equal(fs.existsSync(path.join(output,name)), false, 'Unapproved legal draft is excluded');
    assert.ok(!html.includes('href="'+name+'"'));
  }
  assert.doesNotMatch(html,/data-test-billing=/);
 }finally{fs.rmSync(directory,{recursive:true,force:true})}
});
