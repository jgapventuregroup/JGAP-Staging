import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PAGE_HELP} from '../page-help.mjs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('every real app page and both account entry screens have complete contextual guidance',()=>{
 const pages=[...html.matchAll(/<section id="([^"]+)" class="page(?: current)?"/g)].map(m=>m[1]);
 assert.deepEqual(Object.keys(PAGE_HELP).sort(),[...pages,'sign-in','recovery'].sort());
 for(const [page,help] of Object.entries(PAGE_HELP)){assert.ok(help.title&&help.purpose&&help.save,page);assert.ok(help.steps.length>=2&&help.steps.length<=4,page);assert.ok(Array.isArray(help.terms));for(const s of help.steps){assert.ok(s.title&&s.text&&s.target,page);const id=s.target.match(/^#([a-z0-9_-]+)/i)?.[1];if(id)assert.ok(html.includes('id="'+id+'"'),'Walkthrough target exists: '+s.target);}}
});
test('help distinguishes actual saving and access limits across the app',()=>{
 assert.match(PAGE_HELP.dashboard.save,/automatically/);assert.match(PAGE_HELP.pipeline.save,/automatically/);assert.match(PAGE_HELP.analyzer.save,/Calculating does not save/);assert.match(PAGE_HELP.alerts.save,/does not complete/);assert.match(PAGE_HELP.plans.save,/checkout is unavailable/);assert.match(PAGE_HELP.invite.save,/does not invite someone into your workspace/);assert.match(PAGE_HELP.finance.steps[1].text,/not confirmed zero profit/);assert.ok(PAGE_HELP.team.terms.some(([term,meaning])=>term==='Workspace owner'&&meaning.includes('does not mean ownership')));
});
