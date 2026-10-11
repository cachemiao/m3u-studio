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
