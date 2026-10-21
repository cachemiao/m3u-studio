const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../app/static/editor-core.js');
const source=fs.readFileSync(path.join(__dirname,'../app/static/app.js'),'utf8');
const flow=source.slice(source.indexOf('function openImport('),source.indexOf("$('#pickLogo').onclick="));
const parsed=()=>({groups:['News'],channels:[{id:'same',name:'New',group:'News',url:'https://example.test/new'}]});
function setup(language='en'){
 const nodes=new Map(),requests=[],messages=[];
 const get=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{value:'',files:[],disabled:false,hidden:false,open:false,
   showModal(){this.open=true},close(){this.open=false},reset(){for(const id of ['#playlistText','#importListName'])get(id).value='';get('#playlistFile').files=[]}});
  return nodes.get(selector);
 };
 const state={epg:'',lists:['one','two'].map(id=>({id,name:id,groups:['News'],channels:[{id:'same',name:'Existing',group:'News',url:'https://example.test/old'}]}))};
 const context={state,selected:'one',group:'',core,importContext:null,$:get,uid:()=> 'new',json:(method,data)=>({method,data}),
  changed(){context.changes++},changes:0,toast:message=>messages.push(String(message)),
  api:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
  window:{M3UI18n:{setText:(node,text)=>node.textContent=String(text),dynamic:fn=>({toString:fn}),error:message=>message}},
  current:()=>state.lists.find(list=>list.id===context.selected)};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/static/translations.js'),'utf8'),context);
 context.t=(key,params={})=>context.window.M3UTranslations[key][language].replace(/\{(p\d+)\}/g,(_,p)=>params[p]);
 vm.runInContext(flow,context);
 const submit=()=>get('#importForm').onsubmit({preventDefault(){}});
 return {context,state,get,requests,messages,submit};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('import dialog names its target in both languages and distinguishes new playlists',()=>{
 for(const language of ['zh','en']){
  const {context,get}=setup(language);context.openImport();
  assert.match(get('#importTitle').textContent,/one/);assert.equal(get('#importListName').required,false);
  const scope=get('#importScope').textContent;assert.match(scope,language==='zh'?/追加.*保留/:/Appends.*keeps/);
  context.openImport(true);assert.equal(get('#importListName').required,true);assert.equal(get('#importListNameLabel').hidden,false);
 }
});
test('successful import appends to the captured target even if selection changes',async()=>{
 const {context,state,get,requests,submit}=setup();context.openImport();context.selected='two';
 const pending=submit();requests[0].resolve(parsed());await tick();
 assert.equal(requests[1].url,'/api/validate');requests[1].resolve(requests[1].options.data);await pending;
 assert.equal(state.lists[0].channels.length,2);assert.equal(state.lists[1].channels.length,1);
 assert.equal(state.lists[0].channels[0].name,'Existing');assert.equal(context.selected,'one');assert.equal(context.changes,1);assert.equal(get('#importDialog').open,false);
});
test('all-invalid imports never create an empty playlist or call validation',async()=>{
 const {context,state,requests,submit}=setup();context.openImport(true);
 const before=JSON.stringify(state),pending=submit();requests[0].resolve({channels:[],groups:[]});await pending;
 assert.equal(JSON.stringify(state),before);assert.equal(requests.length,1);assert.equal(context.changes,0);
});
for(const phase of ['parse','validate']){
 for(const change of ['playlist','text','name','file']){
  test(`changes to ${change} while awaiting ${phase} block stale import results`,async()=>{
   const {context,state,get,requests,messages,submit}=setup();context.openImport();
   const pending=submit();
   if(phase==='validate'){requests[0].resolve(parsed());await tick()}
   if(change==='playlist')state.lists[0].channels[0].name='User edit';
   if(change==='text')get('#playlistText').value='New input';
   if(change==='name')get('#importListName').value='New name';
   if(change==='file')get('#playlistFile').files=[{name:'new.txt',size:10,lastModified:1}];
   const before=JSON.stringify(state);
   const request=requests.at(-1);request.resolve(phase==='parse'?parsed():request.options.data);await pending;
   assert.equal(JSON.stringify(state),before);assert.equal(context.changes,0);
   assert.match(messages.at(-1),/changed during import/);assert.equal(get('#importDialog').open,true);
   assert.equal(get('#importForm button.primary').disabled,false);
  });
 }
}
test('closing and reopening discards the old response without unlocking a newer request',async()=>{
 const {context,state,get,requests,submit}=setup();context.openImport();const first=submit();
 get('#importDialog').close();context.openImport(true);const second=submit();
 requests[0].resolve(parsed());await first;
 assert.equal(get('#importForm button.primary').disabled,true);assert.equal(state.lists.length,2);
 requests[1].resolve({channels:[],groups:[]});await second;
 assert.equal(get('#importForm button.primary').disabled,false);assert.equal(context.changes,0);
});
test('cancelled imports do not apply validated results',async()=>{
 const {context,state,get,requests,submit}=setup();context.openImport();const pending=submit();
 requests[0].resolve(parsed());await tick();get('#importDialog').close();
 requests[1].resolve(requests[1].options.data);await pending;
 assert.equal(state.lists[0].channels.length,1);assert.equal(context.changes,0);
});
test('duplicate IDs within an import and against existing channels remain unique',()=>{
 const {state}=setup(),item=parsed().channels[0];
 state.lists[0].channels.push({...item,id:'same_import_1'});
 const input={groups:['News'],channels:[item,item,{...item,id:'same_import_2'}]};
 const result=core.importChannels(state,input,{listId:'one',replace:true});
 const list=result.draft.lists[0];assert.equal(list.channels.length,5);
 assert.equal(new Set(list.channels.map(channel=>channel.id)).size,5);
 assert.deepEqual(list.channels.slice(0,2),state.lists[0].channels);
 assert.deepEqual(result.draft.lists[1],state.lists[1]);
});
test('new playlists are created only after successful validation',async()=>{
 const {context,state,get,requests,submit}=setup();context.openImport(true);get('#importListName').value=' Imported ';
 const original=JSON.stringify(state),pending=submit();requests[0].resolve(parsed());await tick();
 assert.equal(JSON.stringify(state),original);
 requests[1].resolve(requests[1].options.data);await pending;
 assert.equal(state.lists.length,3);assert.equal(state.lists[2].name,'Imported');assert.equal(context.selected,'new');assert.equal(context.changes,1);
});
test('validation rejection leaves the draft intact and the import form available',async()=>{
 const {context,state,get,requests,messages,submit}=setup();context.openImport(true);get('#importListName').value='Imported';
 const original=JSON.stringify(state),pending=submit();requests[0].resolve(parsed());await tick();
 requests[1].reject(Error('Validation failed'));await pending;
 assert.equal(JSON.stringify(state),original);assert.equal(get('#importDialog').open,true);
 assert.equal(get('#importForm button.primary').disabled,false);assert.equal(messages.at(-1),'Validation failed');
});
