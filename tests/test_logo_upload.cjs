const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const createLogos=require('../app/static/controllers/logos.js');
function setup(replace){
 const calls=[],prompts=[];
 const context={FormData,api:async(path,options)=>{calls.push(options.body);if(calls.length===1){const error=Error('duplicate');error.data={conflict:true,name:'CCTV1.png',users:[{name:'CCTV1'}]};throw error}return {path:'/logo/CCTV1.png'}},confirmLogoReplace:async(name,users)=>{prompts.push({name,users});return replace}};
 context.uploadLibraryLogo=createLogos(context).uploadLibraryLogo;
 return {context,calls,prompts};
}
test('duplicate upload stopped by user never sends a replacement',async()=>{
 const {context,calls,prompts}=setup(false);
 assert.equal(await context.uploadLibraryLogo(new File(['image'],'CCTV1.jpg')),null);
 assert.equal(calls.length,1);assert.equal(calls[0].get('replace'),null);
 assert.equal(prompts[0].name,'CCTV1.png');assert.equal(prompts[0].users.length,1);
});
test('explicit replacement resends image and manager target name',async()=>{
 const {context,calls}=setup(true);
 assert.equal((await context.uploadLibraryLogo(new File(['image'],'different.jpg'),'CCTV1.png')).path,'/logo/CCTV1.png');
 assert.equal(calls.length,2);assert.equal(calls[1].get('replace'),'1');
 assert.equal(calls[1].get('file').name,'CCTV1.png');
});
test('image validation errors do not offer replacement',async()=>{
 let prompted=false;
 const context={FormData,api:async()=>{throw Error('invalid image')},confirmLogoReplace:async()=>{prompted=true;return true}};
 context.uploadLibraryLogo=createLogos(context).uploadLibraryLogo;
 await assert.rejects(context.uploadLibraryLogo(new File(['invalid'],'bad.png')),/invalid image/);
 assert.equal(prompted,false);
});
