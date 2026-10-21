const {test} = require('node:test');
const assert = require('node:assert/strict');
const core = require('../app/static/editor-core.js');
const sample = () => ({revision: 5, base_url:'http://host', epg:'', lists:[
  {id:'one',groups:['央视','卫视'],channels:[{id:'a',name:'CCTV1',group:'央视',url:'http://old:3224/live?token=a%2Bb',epg:'',fcc_url:''},
    {id:'b',name:'湖南卫视',group:'卫视',url:'http://old:3224/two',catchup_url:'rtsp://old:3224/replay'}]},
  {id:'two',groups:['央视'],channels:[{id:'a',name:'CCTV1',group:'央视',url:'http://old:3224/other'}]}
]});
test('batch edits only selected channels in the intended list, without mutating original',()=>{
  const state=sample(),before=JSON.stringify(state);
  const result=core.batchEdit(state,'one',['a'],{group:'卫视',epg:'https://epg.test/e.xml',fcc_url:'10.1.1.1:8027',replace:{from:'old:3224',to:'new:3224',fields:['url']}});
  assert.equal(JSON.stringify(state),before);assert.equal(result.count,1);
  assert.equal(result.draft.lists[0].channels[0].url,'http://new:3224/live?token=a%2Bb');
  assert.equal(result.draft.lists[0].channels[1].url,state.lists[0].channels[1].url);
  assert.deepEqual(result.draft.lists[1],state.lists[1]);
});
test('blank values explicitly clear fields, literal replacement never treats regex as a pattern',()=>{
  const state=sample();state.lists[0].channels[0].fcc_url='10.1.1.1:8027';
  const result=core.batchEdit(state,'one',['a'],{fcc_url:'',replace:{from:'a%2Bb',to:'x+y',fields:['url']}});
  assert.equal(result.draft.lists[0].channels[0].fcc_url,'');assert.match(result.draft.lists[0].channels[0].url,/token=x\+y$/);
  assert.throws(()=>core.batchEdit(state,'one',['a'],{replace:{from:'',to:'x',fields:['url']}}),/不能为空/);
  assert.throws(()=>core.batchEdit(state,'one',['a'],{group:'不存在'}),/不存在/);
});
test('no-op batch does not produce changes',()=>assert.equal(core.batchEdit(sample(),'one',['a'],{group:'央视'}).count,0));
test('undo and redo restore all list content without rolling back server revision or address',()=>{
  const history=core.createHistory(),state=sample();history.reset(state);state.lists[0].channels.reverse();history.record(state);
  state.epg='https://epg.test';history.record(state);state.revision=9;
  const previous=history.undo();assert.equal(previous.epg,'');assert.equal(previous.lists[0].channels[0].id,'b');
  assert.equal(previous.revision,undefined);assert.equal(previous.base_url,undefined);
  Object.assign(state,previous);assert.equal(state.revision,9);
  assert.equal(history.redo().epg,'https://epg.test');
});
test('no-op record keeps redo; a new edit clears redo; history respects step limit',()=>{
  const history=core.createHistory(2),state=sample();history.reset(state);
  for(let i=1;i<=3;i++){state.epg=String(i);history.record(state)}
  assert.equal(history.undo().epg,'2');assert.equal(history.undo().epg,'1');assert.equal(history.undo(),null);
  state.epg='1';assert.equal(history.record(state),false);assert.equal(history.canRedo,true);
  state.epg='branch';history.record(state);assert.equal(history.canRedo,false);
});
test('logo matching handles punctuation, quality suffixes, aliases and preserves plus and 4K identities',()=>{
  const paths=['/logo/CCTV1.png','/logo/CCTV5.png','/logo/CCTV5+.png','/logo/CCTV16.png','/logo/CCTV164K.png','/logo/湖南卫视.png'];
  assert.equal(core.matchLogo({name:'CCTV-1 HD'},paths),paths[0]);
  assert.equal(core.matchLogo({name:'CCTV5+'},paths),paths[2]);
  assert.equal(core.matchLogo({name:'CCTV16 4K',epg_id:'CCTV16'},paths),paths[4]);
  assert.equal(core.matchLogo({name:'湖南卫视4K',epg_id:'湖南卫视'},paths),null);
  assert.equal(core.matchLogo({name:'HunanTV'},paths,{'HunanTV.png':'湖南卫视.png'}),paths[5]);
  assert.equal(core.matchLogo({name:'未知频道'},paths),null);
});
test('ambiguous normalized names remain manual; exact channel name wins over EPG',()=>{
  assert.equal(core.matchLogo({name:'CCTV1'},['/logo/CCTV1.png','/logo/CCTV-1.png']),null);
  assert.equal(core.matchLogo({name:'CCTV5+',epg_id:'CCTV5'},['/logo/CCTV5.png','/logo/CCTV5+.png']),'/logo/CCTV5+.png');
});
test('server key ordering does not create false dirty states or undo steps',()=>{
  const history=core.createHistory(),state=sample();history.reset(state);
  const reordered=JSON.parse(JSON.stringify(state));
  reordered.lists[0].channels[0]=Object.fromEntries(Object.entries(reordered.lists[0].channels[0]).reverse());
  assert.equal(core.fingerprint(state),core.fingerprint(reordered));
  assert.equal(history.record(reordered),false);assert.equal(history.canUndo,false);
});

test('logo names support encoded paths, formats and ambiguous candidates', () => {
  const a='https://raw.githubusercontent.com/a/b/ref/TV/CCTV1.svg';
  const b='https://raw.githubusercontent.com/c/d/ref/TV/CCTV1.webp';
  assert.equal(core.logoName('https://example.com/%E6%B9%96%E5%8D%97%E5%8D%AB%E8%A7%86.jpeg?q=1'),'湖南卫视');
  assert.equal(core.matchLogo({name:'CCTV1'},[a]),a);
  assert.equal(core.matchLogo({name:'CCTV1'},[a,b]),null);
});
test('builtin name aliases also apply to a uniquely named logo', () => {
  const path='https://raw.githubusercontent.com/a/b/ref/TV/%E5%8C%97%E4%BA%AC%E5%8D%A1%E9%85%B7%E5%B0%91%E5%84%BF.png';
  assert.equal(core.matchLogo({name:'卡酷少儿'},[path],{'卡酷少儿.png':'北京卡酷少儿.png'}),path);
});


test('fuzzy logo matching accepts clear typo but rejects ties, other channel numbers and resolutions',()=>{
 assert.equal(core.matchLogo({name:'湖南卫视台'},['/logo/湖南卫视.png']),'/logo/湖南卫视.png');
 assert.equal(core.matchLogo({name:'湖南卫视台'},['/logo/湖南卫视.png','/logo/湖南卫视频.png']),null);
 assert.equal(core.matchLogo({name:'CCTV10'},['/logo/CCTV1.png']),null);
 assert.equal(core.matchLogo({name:'CCTV5+'},['/logo/CCTV5.png']),null);
 assert.equal(core.matchLogo({name:'湖南卫视4K',epg_id:'湖南卫视'},['/logo/湖南卫视.png']),null);
});
test('local draft stores content without credentials and rejects invalid stored versions',()=>{
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k),removeItem:k=>values.delete(k)};
 const a=core.createDraftStore(storage,'alice'),b=core.createDraftStore(storage,'bob');
 const state=sample();state.password='secret';a.save(state,core.fingerprint(state));
 assert.equal(b.read(),null);assert.deepEqual(a.read().content,core.content(state));assert.equal(values.get('alice').includes('secret'),false);
 state.lists[0].channels[0].name='Changed';assert.notEqual(core.fingerprint(state),core.fingerprint(a.read().content));
 a.clear();assert.equal(a.read(),null);values.set('alice','{"version":9}');assert.throws(()=>a.read());
 const unavailable=core.createDraftStore({setItem(){throw Error('quota')}},'test');assert.throws(()=>unavailable.save(sample(),''));
});
test('bulk summary counts unchanged and missing selections as skipped',()=>{
 const result=core.batchEdit(sample(),'one',['a','b','missing'],{group:'央视'});
 assert.equal(result.total,3);assert.equal(result.count,1);assert.equal(result.skipped,2);
});

test('copy to another playlist preserves complete channel data and adds missing groups',()=>{
 const state=sample();
 Object.assign(state.lists[0].channels[1],{logo:'/logo/test.png',epg_id:'hunan',catchup:'default',catchup_days:7});
 const original=JSON.stringify(state);
 const r=core.batchEdit(state,'one',['a','b'],{transfer:{mode:'copy',listId:'two'}});
 assert.equal(JSON.stringify(state),original);
 assert.equal(r.count,2);assert.equal(r.draft.lists[0].channels.length,2);
 assert.deepEqual(r.draft.lists[1].groups,['央视','卫视']);
 assert.deepEqual(r.draft.lists[1].channels.slice(1).map(({id,...ch})=>ch),state.lists[0].channels.map(({id,...ch})=>ch));
 assert.equal(new Set(r.draft.lists[1].channels.map(ch=>ch.id)).size,3);
 assert.deepEqual(r.draft.lists[1].channels[0],state.lists[1].channels[0]);
});
test('move handles ID collisions, preserves order, applies edits, and supports undo',()=>{
 const state=sample();state.lists[1].channels.push({...state.lists[1].channels[0],id:'a_transfer_1'});
 const history=core.createHistory();history.reset(state);
 const r=core.batchEdit(state,'one',['b','a'],{group:'卫视',transfer:{mode:'move',listId:'two'}});
 assert.equal(r.draft.lists[0].channels.length,0);
 assert.deepEqual(r.draft.lists[0].groups,['央视','卫视']);
 assert.deepEqual(r.draft.lists[1].channels.slice(2).map(ch=>ch.name),['CCTV1','湖南卫视']);
 assert.equal(r.draft.lists[1].channels[2].id,'a_transfer_2');
 assert.ok(r.draft.lists[1].channels.slice(2).every(ch=>ch.group==='卫视'));
 history.record(r.draft);assert.deepEqual(history.undo(r.draft),core.content(state));
});
test('transfers reject same or missing targets and skip stale selections without mutation',()=>{
 const state=sample();
 for(const listId of ['one','missing'])assert.throws(()=>core.batchEdit(state,'one',['a'],{transfer:{mode:'copy',listId}}));
 assert.throws(()=>core.batchEdit(state,'one',['a'],{transfer:{mode:'delete',listId:'two'}}));
 const r=core.batchEdit(state,'one',['missing'],{transfer:{mode:'move',listId:'two'}});
 assert.equal(r.count,0);assert.equal(r.skipped,1);assert.deepEqual(r.draft,core.content(state));
 state.lists[0].channels[0].id='x'.repeat(80);
 const copied=core.batchEdit(state,'one',['x'.repeat(80)],{transfer:{mode:'copy',listId:'two'}});
 assert.ok(copied.transfers[0].targetId.length<=80);
});

test('copy with field edits changes only the destination copies',()=>{
 const state=sample();
 const r=core.batchEdit(state,'one',['a'],{epg:'https://example.com/epg.xml',transfer:{mode:'copy',listId:'two'}});
 assert.deepEqual(r.draft.lists[0],state.lists[0]);
 assert.equal(r.draft.lists[1].channels[1].epg,'https://example.com/epg.xml');
});

test('transfer selects an existing target group or creates a new group once',()=>{
 const state=sample();
 const existing=core.batchEdit(state,'one',['a','b'],{transfer:{mode:'copy',listId:'two',group:'央视'}});
 assert.deepEqual(existing.draft.lists[1].groups,['央视']);
 assert.ok(existing.draft.lists[1].channels.every(ch=>ch.group==='央视'));
 assert.deepEqual(existing.draft.lists[0],state.lists[0]);
 const created=core.batchEdit(state,'one',['a','b'],{transfer:{mode:'move',listId:'two',group:' 精选 '}});
 assert.deepEqual(created.draft.lists[1].groups,['央视','精选']);
 assert.ok(created.draft.lists[1].channels.slice(1).every(ch=>ch.group==='精选'));
 assert.equal(created.draft.lists[0].channels.length,0);
});
test('invalid new target groups cannot change the draft',()=>{
 const state=sample(),before=JSON.stringify(state);
 for(const group of ['', ' ', 'a,b', 'a"b','a\nb','x'.repeat(201)]){
  assert.throws(()=>core.batchEdit(state,'one',['a'],{transfer:{mode:'copy',listId:'two',group}}));
 }
 assert.equal(JSON.stringify(state),before);
 const stale=core.batchEdit(state,'one',['missing'],{transfer:{mode:'copy',listId:'two',group:'新分组'}});
 assert.deepEqual(stale.draft,core.content(state));
});

test('import as new playlist leaves existing playlists unchanged and supports undo',()=>{
 const state=sample(),before=JSON.stringify(state),history=core.createHistory();history.reset(state);
 const parsed={groups:['新闻'],channels:[{id:'a',name:'新闻台',group:'新闻',url:'http://example.com/live'}],epg:'https://example.com/epg.xml'};
 const r=core.importChannels(state,parsed,{create:true,id:'new',name:' 新列表 '});
 assert.equal(JSON.stringify(state),before);assert.deepEqual(r.draft.lists.slice(0,2),state.lists);
 assert.equal(r.listId,'new');assert.equal(r.draft.lists[2].name,'新列表');assert.equal(r.draft.lists[2].epg,parsed.epg);
 history.record(r.draft);assert.deepEqual(history.undo(r.draft),core.content(state));
});
test('all-invalid import creates no playlist and never clears an existing playlist',()=>{
 const state=sample(),parsed={groups:[],channels:[]};
 for(const options of [{create:true,id:'new',name:'new'},{listId:'one',replace:true}])assert.deepEqual(core.importChannels(state,parsed,options).draft,core.content(state));
});
test('append import targets the captured playlist and resolves duplicate IDs',()=>{
 const state=sample(),parsed={groups:['央视'],channels:[{id:'a',name:'新频道',group:'央视',url:'http://example.com/live'}]};
 const r=core.importChannels(state,parsed,{listId:'two'});
 assert.deepEqual(r.draft.lists[0],state.lists[0]);assert.equal(r.draft.lists[1].channels.length,2);
 assert.notEqual(r.draft.lists[1].channels[0].id,r.draft.lists[1].channels[1].id);
 const appended=core.importChannels(state,parsed,{listId:'two',replace:true});assert.equal(appended.draft.lists[1].channels.length,2);assert.deepEqual(appended.draft.lists[1].channels[0],state.lists[1].channels[0]);
 assert.throws(()=>core.importChannels(state,parsed,{listId:'missing'}));
 assert.throws(()=>core.importChannels(state,parsed,{create:true,id:'new',name:' '}));
});
