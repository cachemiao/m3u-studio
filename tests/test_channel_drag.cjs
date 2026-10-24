const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../app/static/editor-core.js');
const createDragging=require('../app/static/controllers/dragging.js');
function setup(ids=['a','c','e']){
 const state={epg:'',lists:[{id:'one',name:'One',groups:['News','Films'],channels:['a','b','c','d','e','f'].map((id,i)=>({id,name:id,group:i<4?'News':'Films',url:'https://example.test/'+id,epg_id:'epg.'+id,days:7}))}]};
 const history=core.createHistory();history.reset(state);
 const context={selected:'one',channelDrag:{ids,listId:'one'},current:()=>state.lists[0],changes:0,changed(){context.changes++;history.record(state)}};
 context.model=context;Object.assign(context,createDragging(context));
 return {state,history,context,ids:()=>state.lists[0].channels.map(c=>c.id),group:id=>state.lists[0].channels.find(c=>c.id===id).group};
}
test('a non-contiguous selection is inserted as one block in selection display order',()=>{
 const s=setup();s.context.relocate('c','b',undefined,false);
 assert.deepEqual(s.ids(),['a','c','e','b','d','f']);assert.equal(s.group('e'),'News');assert.equal(s.context.changes,1);
 assert.equal(s.state.lists[0].channels.find(c=>c.id==='e').epg_id,'epg.e');
});
test('dropping after a target preserves selected order without losing or duplicating channels',()=>{
 const s=setup();s.context.relocate('a','d',undefined,true);
 assert.deepEqual(s.ids(),['b','d','a','c','e','f']);assert.equal(new Set(s.ids()).size,6);assert.equal(s.context.changes,1);
});
test('a sidebar group drop transfers the entire selected block and retains fields',()=>{
 const s=setup(['a','c']);s.context.relocate('a',null,'Films');
 assert.deepEqual(s.ids(),['b','d','e','f','a','c']);assert.equal(s.group('a'),'Films');assert.equal(s.group('c'),'Films');
 assert.equal(s.state.lists[0].channels.find(c=>c.id==='c').url,'https://example.test/c');assert.equal(s.context.changes,1);
});
test('one undo and redo restore the complete batch move including group changes',()=>{
 const s=setup(),before=core.fingerprint(s.state);s.context.relocate('a','d',undefined,true);const after=core.fingerprint(s.state);
 const undo=s.history.undo();assert.equal(core.fingerprint(undo),before);const redo=s.history.redo();assert.equal(core.fingerprint(redo),after);
});
test('a selected target, invalid destination and stale source never change the draft',()=>{
 const s=setup(),before=core.fingerprint(s.state);
 s.context.relocate('a','c');s.context.relocate('a','missing','missing');s.context.relocate('missing','b');
 assert.equal(core.fingerprint(s.state),before);assert.equal(s.context.changes,0);
});
test('dropping an already adjacent block in place creates no extra undo step',()=>{
 const s=setup(['a','b']);s.context.relocate('a','c',undefined,false);
 assert.deepEqual(s.ids(),['a','b','c','d','e','f']);assert.equal(s.context.changes,0);
});
test('dragging an unselected channel moves only that channel',()=>{
 const s=setup();s.context.relocate('b','d',undefined,true);
 assert.deepEqual(s.ids(),['a','c','d','b','e','f']);assert.equal(s.group('e'),'Films');assert.equal(s.context.changes,1);
});
test('a drag session belonging to another playlist cannot move its selected block',()=>{
 const s=setup();s.context.channelDrag.listId='another';s.context.relocate('b','d',undefined,true);
 assert.deepEqual(s.ids(),['a','c','d','b','e','f']);assert.equal(s.group('e'),'Films');
});
