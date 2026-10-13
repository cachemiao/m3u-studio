const {test}=require('node:test');
const assert=require('node:assert/strict');
const check=require('../app/static/source-check-core.js');
test('latency boundaries and failure filtering distinguish errors from unsupported protocols',()=>{
 for(const [ms,color] of [[0,'green'],[120,'green'],[300,'green'],[301,'yellow'],[5000,'yellow']])assert.equal(check.color({status:'ok',ms}),color);
 assert.equal(check.color({status:'timeout'}),'red');assert.equal(check.failed({status:'timeout'}),true);
 assert.equal(check.failed({status:'unavailable'}),true);assert.equal(check.failed({status:'ok',ms:500}),false);
 assert.equal(check.failed({status:'unsupported'}),false);
});
test('source queue never exceeds four concurrent probes and keeps result identity',async()=>{
 let active=0,peak=0;const results=[];const items=Array.from({length:13},(_,id)=>({id}));
 await check.run(items,async item=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return {status:'ok',ms:item.id}},(item,result)=>results.push([item.id,result.ms]),new AbortController().signal,99);
 assert.equal(peak,4);assert.equal(results.length,13);assert.equal(new Set(results.map(x=>x[0])).size,13);assert.ok(results.every(([id,ms])=>id===ms));
});
test('cancelling does not schedule remaining probes or apply late results',async()=>{
 const controller=new AbortController();let started=0,applied=0;const release=[];
 const promise=check.run(Array.from({length:20},(_,id)=>({id})),()=>{started++;return new Promise(resolve=>release.push(resolve))},()=>applied++,controller.signal);
 assert.equal(started,4);controller.abort();release.forEach(resolve=>resolve({status:'ok',ms:1}));await promise;
 assert.equal(started,4);assert.equal(applied,0);
});
test('a failed request does not prevent subsequent channels from being checked',async()=>{
 const results=[];await check.run([{id:1},{id:2}],async item=>{if(item.id===1)throw Error('network');return {status:'ok',ms:10}},(_,result)=>results.push(result),new AbortController().signal,1);
 assert.deepEqual(results,[{status:'unavailable'},{status:'ok',ms:10}]);
});
