'use strict';
const M3USourceCheck = (() => {
  const color = result => result.status === 'ok' ? result.ms <= 300 ? 'green' : 'yellow' : ['unsupported','checking'].includes(result.status) ? 'muted' : 'red';
  const failed = result => ['timeout','unavailable'].includes(result.status);
  async function run(items, probe, onResult, signal, concurrency=4) {
    let next=0;
    async function worker() {
      while (!signal.aborted && next<items.length) {
        const item=items[next++];
        try {
          const result=await probe(item,signal);
          if (!signal.aborted) onResult(item,result);
        } catch(error) {
          if (!signal.aborted) onResult(item,{status:'unavailable'});
        }
      }
    }
    await Promise.all(Array.from({length:Math.min(4,Math.max(1,concurrency),items.length)},worker));
  }
  return {color,failed,run};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=M3USourceCheck;
