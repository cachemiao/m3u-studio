'use strict';
const $=s=>document.querySelector(s), el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)window.M3UI18n.setText(n,text);if(cls)n.className=cls;return n};
// Feature descriptions escape the scrolling table and its sticky header.
const featureTooltip=el('span');featureTooltip.id='channelFeatureTooltip';featureTooltip.setAttribute('role','tooltip');featureTooltip.setAttribute('popover','manual');document.body.append(featureTooltip);
let featureTooltipTarget=null;
function hideFeatureTooltip(){featureTooltipTarget?.removeAttribute('aria-describedby');featureTooltipTarget=null;if(featureTooltip.matches(':popover-open'))featureTooltip.hidePopover()}
function showFeatureTooltip(target){
 hideFeatureTooltip();featureTooltipTarget=target;featureTooltip.textContent=target.getAttribute('aria-label');target.setAttribute('aria-describedby',featureTooltip.id);featureTooltip.showPopover();
 const anchor=target.getBoundingClientRect(),box=featureTooltip.getBoundingClientRect(),gap=8;
 const top=anchor.top-box.height-gap;
 featureTooltip.style.left=Math.max(gap,Math.min(innerWidth-box.width-gap,anchor.left+(anchor.width-box.width)/2))+'px';
 featureTooltip.style.top=Math.max(gap,Math.min(innerHeight-box.height-gap,top>=gap?top:anchor.bottom+gap))+'px';
}
document.addEventListener('pointerover',e=>{const target=e.target.closest('.channel-feature');if(target&&target!==featureTooltipTarget)showFeatureTooltip(target)});
document.addEventListener('pointerout',e=>{if(featureTooltipTarget&&e.target.closest('.channel-feature')===featureTooltipTarget&&!featureTooltipTarget.contains(e.relatedTarget))hideFeatureTooltip()});
document.addEventListener('focusin',e=>{if(e.target.matches('.channel-feature'))showFeatureTooltip(e.target)});
document.addEventListener('focusout',e=>{if(e.target===featureTooltipTarget)hideFeatureTooltip()});
document.addEventListener('scroll',hideFeatureTooltip,true);window.addEventListener('resize',hideFeatureTooltip);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideFeatureTooltip()});
let state, selected, group='', dirty=false, editing=null, uploadTarget=null, dragId=null, authMode='login', username='', sidebarDrag=null;
const core=AliceEditorCore, draftHistory=core.createHistory();
const uiPrompt=options=>M3UDialogs.requestText(options),uiConfirm=(message,options={})=>M3UDialogs.requestConfirm({message,...options});
let publishedFingerprint='', selectedChannels=new Set(), selectionList=null, visibleChannels=[], logoLibrary=null, batchContext=null, batchCandidate=null, logoContext=null, logoMatches=[];
let importContext=null;
let workspaceOwner=null, draftStore=null, draftStorageWarned=false, batchStats=null;
const current=()=>state?.lists.find(x=>x.id===selected), uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function toast(message,undo=false){window.M3UI18n.setText($('#toast'),message);if(undo)$('#toast').append(button(t('m324'),()=>$('#undo').click(),'small'));$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',5000)}
async function api(path,options={}){const r=await fetch(path,{...options,headers:{'X-IPTV-Request':'1','Accept-Language':window.M3UI18n.locale,...options.headers}});const data=await r.json();if(!r.ok){if(r.status===401&&!path.startsWith('/api/auth/'))showAuth(false);const error=Error(data.error||String(t("m1")));error.status=r.status;error.data=data;throw error;}return data}
const json=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function changed(){draftHistory.record(state);syncDirty();render()}
function persistDraft(){if(!draftStore||!state)return;try{if(dirty)draftStore.save(state,publishedFingerprint);else draftStore.clear()}catch{if(!draftStorageWarned){draftStorageWarned=true;toast(t('m320'))}}}
function renderSaveStatus(){const status=$('#status');status.dataset.saveState=dirty?'dirty':'saved';window.M3UI18n.setAttribute(status,'title',window.M3UI18n.dynamic(()=>dirty?t('m2'):t('m3')));window.M3UI18n.setText(status,window.M3UI18n.dynamic(()=>dirty?t('m2'):t('m3')))}
function syncDirty(){dirty=core.fingerprint(state)!==publishedFingerprint;persistDraft();renderSaveStatus();$('#undo').disabled=!draftHistory.canUndo;$('#redo').disabled=!draftHistory.canRedo}
function applyContent(content){state.lists=content.lists;state.epg=content.epg;if(!current())selected=state.lists[0]?.id;if(!current()?.groups.includes(group))group='';syncDirty();render()}
function button(text,action,cls){const n=el('button',text,cls);n.type='button';n.onclick=action;return n}
function render(){if(!state)return;const list=current();$('#lists').replaceChildren();state.lists.forEach(x=>{const row=el('div',undefined,'nav-item'+(x.id===selected?' active':''));row.append(button(x.name,()=>{selected=x.id;group='';render()}));const settings=button('',()=>openListSettings(x.id),'list-settings-trigger');if(x.id===selected)settings.id='listSettings';window.M3UI18n.setAttribute(settings,'title',window.M3UI18n.dynamic(()=>t('m167')+' · '+x.name));window.M3UI18n.setAttribute(settings,'aria-label',window.M3UI18n.dynamic(()=>t('m167')+' · '+x.name));row.append(settings);bindSidebarDrag(row,'list',x.id);$('#lists').append(row)});
$('#groups').replaceChildren();if(list){const all=el('div',undefined,'nav-item'+(!group?' active':''));all.append(button(t("m4"),()=>{group='';render()}),el('span',String(list.channels.length),'group-count'));$('#groups').append(all);list.groups.forEach(g=>{const row=el('div',undefined,'nav-item'+(group===g?' active':''));row.dataset.group=g;row.append(button(g,()=>{group=g;render()}),button('✎',async()=>{const name=await uiPrompt({title:t("m5"),value:g,trim:false,confirmLabel:t("uiSave"),validate:value=>!value?t("uiNameRequired"):value!==g&&list.groups.includes(value)?t("m6"):null});if(!name||name===g)return;if(list.groups.includes(name))return toast(t("m6"));list.groups[list.groups.indexOf(g)]=name;list.channels.forEach(ch=>{if(ch.group===g)ch.group=name});if(group===g)group=name;changed()},'small'),button('×',async()=>{if(list.channels.some(c=>c.group===g))return toast(t("m7"));if(!await uiConfirm(t("m8")+g+(window.M3UI18n.language==='zh'?'？':'?')))return;list.groups=list.groups.filter(x=>x!==g);group='';changed()},'small'));
row.insertBefore(el('span',String(list.channels.filter(ch=>ch.group===g).length),'group-count'),row.querySelector('.small'));bindSidebarDrag(row,'group',g);$('#groups').append(row)})}
window.M3UI18n.setText($('#title'),window.M3UI18n.dynamic(()=>list?list.name:t("m9")));window.M3UI18n.setText($('#count'),window.M3UI18n.dynamic(()=>list?t("m10",{p0:(list.channels.length),p1:(list.groups.length)}):''));
for(const id of ['#add','#import','#newGroup'])$(id).disabled=!list;
$('#channels').replaceChildren();const query=$('#search').value.trim().toLowerCase();let channels=list?list.groups.flatMap(g=>list.channels.filter(c=>c.group===g)):[];channels=channels.filter(c=>(!group||c.group===group)&&[c.name,c.url,c.epg_id].some(x=>x.toLowerCase().includes(query)));$('#empty').hidden=!!channels.length;window.M3UI18n.setText($('#empty'),window.M3UI18n.dynamic(()=>query?t("m11"):group?t("m12"):t("m13")));
if(!channels.length){if(query)$('#empty').append(button(t('studioClearSearch'),()=>{$('#search').value='';render()},'empty-action'));else if(!list)$('#empty').append(button(t('m376'),()=>openImport(true),'empty-action'));else $('#empty').append(button(t('m28'),()=>openEditor(),'empty-action'))}visibleChannels=channels;if(selectionList!==selected){selectedChannels.clear();selectionList=selected}const existing=new Set(list?.channels.map(c=>c.id)||[]);selectedChannels=new Set([...selectedChannels].filter(id=>existing.has(id)));updateSelection();
channels.forEach(ch=>{const row=el('article',undefined,'channel');row.dataset.id=ch.id;const check=el('input');check.type='checkbox';check.className='channel-select';window.M3UI18n.setAttribute(check,'aria-label',window.M3UI18n.dynamic(()=>t("m14")+ch.name));check.checked=selectedChannels.has(ch.id);check.onchange=()=>{if(check.checked)selectedChannels.add(ch.id);else selectedChannels.delete(ch.id);updateSelection()};const handle=el('span','⠿','handle');handle.draggable=!query;window.M3UI18n.setAttribute(handle,'title',window.M3UI18n.dynamic(()=>query?t("m15"):t("m16")));handle.ondragstart=e=>{beginChannelDrag(ch.id,e);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',ch.id);const blank=document.createElement('canvas');blank.width=blank.height=1;e.dataTransfer.setDragImage(blank,0,0)};handle.ondragend=finishChannelDrag;bindTouchDrag(handle,ch.id,!query);

const logo=button('',()=>{openLogoPicker({listId:selected,channelId:ch.id},ch)},'logo');window.M3UI18n.setAttribute(logo,'title',window.M3UI18n.dynamic(()=>t("m17")));window.M3UI18n.setAttribute(logo,'aria-label',window.M3UI18n.dynamic(()=>t("m18")+ch.name));if(ch.logo){const img=el('img');img.src=ch.logo;img.alt=ch.name;img.onerror=()=>{img.hidden=true;logo.append(el('small',t("m19")))};logo.append(img)}else window.M3UI18n.setText(logo,'＋Logo');
const info=el('div',undefined,'channel-info');const title=el('div',undefined,'channel-title');title.append(el('span',ch.name,'channel-name'));const features=el('div',undefined,'channel-features');for(const [enabled,cls,label] of [[ch.catchup_url,'replay',t("m20")],[ch.fcc_url,'fcc',t('studioFcc')]]){if(enabled){const feature=el('span',undefined,'channel-feature '+cls);feature.tabIndex=0;feature.setAttribute('role','img');window.M3UI18n.setAttribute(feature,'aria-label',label);features.append(feature)}else{const slot=el('span',undefined,'channel-feature-slot '+cls);slot.setAttribute('aria-hidden','true');features.append(slot)}}const checkItem=sourceItem(selected,ch),checkedSource=sourceDisplayResult(checkItem.key);const status=el('div',undefined,'channel-status');window.M3UI18n.setAttribute(status,'aria-label',t('studioSourceStatus'));status.append(sourceBadge(checkedSource,checkItem));const stream=el('div',ch.url,'stream');window.M3UI18n.setAttribute(stream,'title',ch.url);info.append(title,stream);
const actions=el('div',undefined,'actions');actions.append(button(t("m21"),()=>openEditor(ch)),button(t("m22"),async()=>{if(await uiConfirm(t("m23")+ch.name+(window.M3UI18n.language==='zh'?'？':'?'))){list.channels=list.channels.filter(c=>c.id!==ch.id);changed()}},'danger'));const epg=el('div',undefined,'channel-epg');epg.append(el('span',ch.epg_id||'—','epg-value'));epg.title=(ch.epg_id||ch.name)+(ch.epg||list.epg||state.epg?' · '+(ch.epg||list.epg||state.epg):'');const groupCell=el('div',ch.group,'channel-group');groupCell.title=ch.group;row.append(check,handle,logo,info,features,status,groupCell,epg,actions);$('#channels').append(row)})}
function clearDragMarks(){document.querySelectorAll('.dragover,.touch-dragging').forEach(n=>n.classList.remove('dragover','touch-dragging'))}
// A drag is one transaction, even when its selection spans several rows.
let channelDrag=null;
function finishChannelDrag(){
 if(channelDrag){cancelAnimationFrame(channelDrag.frame);channelDrag.ghost.remove();channelDrag=null}
 dragId=null;document.querySelectorAll('.channel.drag-source,.channel.drop-before,.channel.drop-after').forEach(n=>n.classList.remove('drag-source','drop-before','drop-after'));clearDragMarks();
}
function beginChannelDrag(id,event){
 finishChannelDrag();hideFeatureTooltip();sidebarDrag=null;dragId=id;
 const list=current(),ids=selectedChannels.has(id)?list.groups.flatMap(g=>list.channels.filter(c=>c.group===g&&selectedChannels.has(c.id)).map(c=>c.id)):[id];
 const ghost=el('div',undefined,'channel-drag-bundle');ghost.setAttribute('aria-hidden','true');
 ghost.append(el('strong',t('uiDraggingChannels',{p0:ids.length})));
 const moved=new Set(ids);for(const ch of ids.slice(0,3).map(id=>list.channels.find(c=>c.id===id)))ghost.append(el('div',ch.name,'drag-bundle-name'));
 if(ids.length>3)ghost.append(el('small',t('uiMoreDraggedChannels',{p0:ids.length-3})));
 document.body.append(ghost);document.querySelectorAll('#channels .channel').forEach(row=>row.classList.toggle('drag-source',moved.has(row.dataset.id)));
 channelDrag={ids,moved,listId:selected,ghost,x:event.clientX,y:event.clientY,target:null,frame:0,time:0};
 updateChannelDrag(event.clientX,event.clientY);channelDrag.frame=requestAnimationFrame(scrollChannelDrag);
}
function updateChannelDrag(x,y){
 const drag=channelDrag;if(!drag)return;drag.x=x;drag.y=y;
 drag.ghost.style.left=Math.max(8,Math.min(innerWidth-drag.ghost.offsetWidth-8,x+18))+'px';
 drag.ghost.style.top=Math.max(8,Math.min(innerHeight-drag.ghost.offsetHeight-8,y+18))+'px';
 document.querySelectorAll('.channel.drop-before,.channel.drop-after').forEach(n=>n.classList.remove('drop-before','drop-after'));drag.target=null;
 const scroller=$('#channelScroll'),box=scroller.getBoundingClientRect(),head=$('.channel-table-head').getBoundingClientRect();
 if(x<box.left||x>box.right||y<box.top||y>box.bottom)return;
 const hitY=Math.max(Math.min(box.bottom-2,y),Math.min(box.bottom-2,head.bottom+2));
 let hit=document.elementFromPoint(x,hitY)?.closest('.channel');
 if(!hit){const rows=[...$('#channels').children].filter(n=>{const r=n.getBoundingClientRect();return r.bottom>head.bottom&&r.top<box.bottom});hit=y<box.top+box.height/2?rows[0]:rows.at(-1)}
 if(!hit||drag.moved.has(hit.dataset.id))return;
 const r=hit.getBoundingClientRect(),after=hitY>r.top+r.height/2;drag.target={id:hit.dataset.id,after};hit.classList.add(after?'drop-after':'drop-before');
}
function scrollChannelDrag(time){
 const drag=channelDrag;if(!drag)return;
 const box=$('#channelScroll').getBoundingClientRect(),head=$('.channel-table-head').getBoundingClientRect(),edge=56,top=Math.max(box.top,head.bottom);
 if(drag.x>=box.left&&drag.x<=box.right&&drag.y>=box.top-24&&drag.y<=box.bottom+24){
  const direction=drag.y<top+edge?-Math.min(1,(top+edge-drag.y)/edge):drag.y>box.bottom-edge?Math.min(1,(drag.y-box.bottom+edge)/edge):0;
  const elapsed=drag.time?Math.min(32,time-drag.time):16;$('#channelScroll').scrollTop+=direction*700*elapsed/1000;
  updateChannelDrag(drag.x,drag.y);
 }
 drag.time=time;drag.frame=requestAnimationFrame(scrollChannelDrag);
}
function relocate(id,targetId,targetGroup,after=false){
 const list=current(),ids=channelDrag?.ids.includes(id)&&channelDrag.listId===selected?channelDrag.ids:[id],movedIds=new Set(ids);
 const moved=ids.map(key=>list?.channels.find(c=>c.id===key)).filter(Boolean);if(!moved.length||movedIds.has(targetId))return;
 const target=list.channels.find(c=>c.id===targetId);if(!target&&!list.groups.includes(targetGroup))return;
 const destination=target?target.group:targetGroup,remaining=list.channels.filter(c=>!movedIds.has(c.id));
 const index=target?remaining.indexOf(target)+(after?1:0):remaining.length;
 remaining.splice(index,0,...moved);
 if(remaining.every((ch,i)=>ch===list.channels[i])&&moved.every(ch=>ch.group===destination))return;
 moved.forEach(ch=>ch.group=destination);list.channels=remaining;changed();
}
$('#channelScroll').addEventListener('dragover',event=>{if(!channelDrag)return;event.preventDefault();event.dataTransfer.dropEffect='move';updateChannelDrag(event.clientX,event.clientY)});
$('#channelScroll').addEventListener('drop',event=>{if(!channelDrag)return;event.preventDefault();updateChannelDrag(event.clientX,event.clientY);const target=channelDrag.target;if(target)relocate(dragId,target.id,undefined,target.after);finishChannelDrag()});
// Track even while the pointer is held still at an edge, or moves to the sidebar.
document.addEventListener('dragover',event=>{if(channelDrag)updateChannelDrag(event.clientX,event.clientY)});
document.addEventListener('drop',()=>{if(channelDrag)finishChannelDrag()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&channelDrag)finishChannelDrag()});
function bindTouchDrag(handle,id,enabled){
 let active=false;
 const stop=()=>{if(!active)return;active=false;finishChannelDrag()};
 handle.onpointerdown=e=>{if(!enabled||e.pointerType==='mouse')return;e.preventDefault();active=true;handle.setPointerCapture?.(e.pointerId);beginChannelDrag(id,e)};
 handle.onpointermove=e=>{if(!active||!channelDrag)return;e.preventDefault();updateChannelDrag(e.clientX,e.clientY);document.querySelectorAll('#groups .dragover').forEach(n=>n.classList.remove('dragover'));const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('#groups .nav-item[data-group]');if(hit){channelDrag.target={group:hit.dataset.group};hit.classList.add('dragover')}};
 handle.onpointerup=e=>{if(!active||!channelDrag)return;e.preventDefault();const target=channelDrag.target;if(target)relocate(id,target.id,target.group,target.after);stop()};
 handle.onpointercancel=stop;handle.onlostpointercapture=()=>{if(active)stop()};
}
function reorderSidebar(kind,id,targetId,after=false){
 const items=kind==='list'?state.lists:current()?.groups;if(!items||id===targetId)return;
 const key=item=>kind==='list'?item.id:item;const from=items.findIndex(item=>key(item)===id);if(from<0||!items.some(item=>key(item)===targetId))return;
 const [moved]=items.splice(from,1);const to=items.findIndex(item=>key(item)===targetId);items.splice(to+(after?1:0),0,moved);changed();
}
function sidebarAfter(row,x,y){const box=row.getBoundingClientRect();return matchMedia('(max-width:800px)').matches?x>box.left+box.width/2:y>box.top+box.height/2}
function bindSidebarDrag(row,kind,id){
 row.dataset.kind=kind;row.dataset.key=id;const handle=el('span','⠿','nav-handle');window.M3UI18n.setAttribute(handle,'title',window.M3UI18n.dynamic(()=>kind==='list'?t("m24"):t("m25")));handle.draggable=true;row.prepend(handle);
 handle.ondragstart=e=>{dragId=null;sidebarDrag={kind,id};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id)};
 handle.ondragend=()=>{sidebarDrag=null;clearDragMarks()};
 row.ondragover=e=>{if((sidebarDrag?.kind===kind)||(dragId&&kind==='group')){e.preventDefault();row.classList.add('dragover')}};
 row.ondragleave=()=>row.classList.remove('dragover');
 row.ondrop=e=>{e.preventDefault();const nav=sidebarDrag,channel=dragId;sidebarDrag=null;clearDragMarks();if(nav?.kind===kind)reorderSidebar(kind,nav.id,id,sidebarAfter(row,e.clientX,e.clientY));else if(channel&&kind==='group')relocate(channel,null,id);finishChannelDrag()};
 let active=false,target=null,frame=null,lastX=0,lastY=0;const scroller=kind==='list'?$('#lists'):$('#groups');
 const stop=()=>{active=false;cancelAnimationFrame(frame);clearDragMarks()};
 const autoScroll=()=>{if(!active)return;const box=scroller.getBoundingClientRect();if(matchMedia('(max-width:800px)').matches)scroller.scrollLeft+=lastX<box.left+30?-8:lastX>box.right-30?8:0;else scroller.scrollTop+=lastY<box.top+30?-8:lastY>box.bottom-30?8:0;frame=requestAnimationFrame(autoScroll)};
 handle.onpointerdown=e=>{if(e.pointerType==='mouse')return;e.preventDefault();active=true;target=null;lastX=e.clientX;lastY=e.clientY;handle.setPointerCapture?.(e.pointerId);row.classList.add('touch-dragging');frame=requestAnimationFrame(autoScroll)};
 handle.onpointermove=e=>{if(!active)return;e.preventDefault();lastX=e.clientX;lastY=e.clientY;clearDragMarks();row.classList.add('touch-dragging');target=null;const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.nav-item');if(hit?.dataset.kind===kind&&hit.dataset.key!==id){target={id:hit.dataset.key,after:sidebarAfter(hit,e.clientX,e.clientY)};hit.classList.add('dragover')}};
 handle.onpointerup=e=>{if(!active)return;e.preventDefault();const drop=target;stop();if(drop)reorderSidebar(kind,id,drop.id,drop.after)};
 handle.onpointercancel=stop;handle.onlostpointercapture=()=>{if(active)stop()};
}
function openEditor(ch){const list=current();if(!list.groups.length)return toast(t("m26"));editing=ch?.id||null;window.M3UI18n.setText($('#editorTitle'),window.M3UI18n.dynamic(()=>ch?t("m27"):t("m28")));const form=$('#channelForm');form.reset();form.elements.group.replaceChildren(...list.groups.map(g=>{const o=el('option',g);o.value=g;return o}));const values=ch||{group:group||list.groups[0],days:7,catchup:'default'};for(const key of ['name','group','logo','url','fcc_url','catchup_url','catchup','days','epg_id','epg'])form.elements[key].value=values[key]??'';$('#editor').showModal()}
$('#channelForm').onsubmit=e=>{e.preventDefault();const ch=Object.fromEntries(new FormData(e.target));ch.id=editing||uid();ch.days=Number(ch.days);const list=current();if(editing)list.channels[list.channels.findIndex(c=>c.id===editing)]=ch;else list.channels.push(ch);$('#editor').close();changed()};
$('#newEmptyList').onclick=async()=>{const name=await uiPrompt({title:t('uiNewList'),label:t('m29'),confirmLabel:t('uiCreate'),validate:value=>!value.trim()?t('uiNameRequired'):null});if(!name?.trim())return;const list={id:uid(),name:name.trim(),enabled:true,epg:'',groups:[String(t("m30")),String(t("m31"))],channels:[]};state.lists.push(list);selected=list.id;group='';changed()};
$('#newGroup').onclick=async()=>{const list=current();if(!list)return;const name=await uiPrompt({title:t('uiNewGroup'),label:t('uiGroupName'),confirmLabel:t('uiCreate'),validate:value=>!value.trim()?t('uiNameRequired'):list.groups.includes(value.trim())?t('m6'):null});if(name===null)return;list.groups.push(name);changed()};
$('#add').onclick=()=>openEditor();$('#search').oninput=render;
$('#search').addEventListener('focus',()=>{const node=$('#search');node.dataset.i18nPlaceholder='uiSearchHint';window.M3UI18n.setAttribute(node,'placeholder',window.M3UI18n.dynamic(()=>t('uiSearchHint')))});
$('#search').addEventListener('blur',()=>{const node=$('#search');node.dataset.i18nPlaceholder='uiSearchCompact';window.M3UI18n.setAttribute(node,'placeholder',window.M3UI18n.dynamic(()=>t('uiSearchCompact')))});
$('#search').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();$('#search').value='';render();$('#search').blur()}});

$('#save').onclick=async()=>{const btn=$('#save');btn.disabled=true;const submitted=core.clone(state), sent=core.fingerprint(submitted);try{const result=await api('/api/state',json('PUT',submitted));state.revision=result.revision;publishedFingerprint=core.fingerprint(result.state);if(core.fingerprint(state)===sent){state.lists=result.state.lists;state.epg=result.state.epg;draftHistory.record(state)}syncDirty();render();toast(dirty?t("m33"):t("m34"))}catch(err){toast(window.M3UI18n.error(err.message))}finally{btn.disabled=false}};
function openImport(create=false){
 importContext={create,listId:selected,fingerprint:core.fingerprint(state)};
 $('#importForm').reset();$('#playlistUrl').value='';$('#importForm button.primary').disabled=false;$('#importListNameLabel').hidden=!create;$('#importListName').disabled=!create;$('#importListName').required=create;
 const name=current()?.name||'';
 window.M3UI18n.setText($('#importTitle'),window.M3UI18n.dynamic(()=>create?t('m376'):t('m379',{p0:name})));
 updateImportScope();setImportMode('url');$('#playlistFileName').textContent='';$('#importDialog').showModal();
}
function updateImportScope(){window.M3UI18n.setText($('#importScope'),window.M3UI18n.dynamic(()=>t(importContext?.create?'m380':'m382')))}
$('#import').onclick=()=>openImport();$('#importNewList').onclick=()=>openImport(true);
$('#playlistFile').onchange=async e=>{const file=e.target.files[0],context=importContext;if(file){const text=await file.text();if(context===importContext&&e.target.files[0]===file){$('#playlistText').value=text;$('#playlistUrl').value=''}}};
function showImportReport(report){
 window.M3UI18n.setText($('#importReportSummary'),window.M3UI18n.dynamic(()=>t('m350',{p0:report.imported,p1:report.repaired,p2:report.skipped})));
 $('#importReportDetails').replaceChildren();
 for(const issue of report.issues){const row=el('div',undefined,'preview-row');window.M3UI18n.setText(row,window.M3UI18n.dynamic(()=>t('m351',{p0:issue.line,p1:issue.name||'—',p2:t(issue.action==='skipped'?'m352':'m353'),p3:issue.reason})));$('#importReportDetails').append(row)}
 if(report.omitted)$('#importReportDetails').append(el('p',t('m354',{p0:report.omitted}),'hint'));
 $('#importReportDialog').showModal();
}
function importInputFingerprint(){const file=$('#playlistFile').files[0];return JSON.stringify({name:$('#importListName').value,text:$('#playlistText').value,url:$('#playlistUrl').value,file:file?[file.name,file.size,file.lastModified]:null})}
$('#importForm').onsubmit=async e=>{
 e.preventDefault();const submit=$('#importForm button.primary'),context=importContext,input=importInputFingerprint();submit.disabled=true;
 try{
  const options={create:context.create,listId:context.listId,id:context.create?uid():undefined,name:$('#importListName').value};
  const link=$('#playlistUrl').value.trim();
  const parsed=await api(link?'/api/import/url':'/api/import',json('POST',link?{url:link}:{text:$('#playlistText').value}));
  if(!$('#importDialog').open||importContext!==context)return;
  if(core.fingerprint(state)!==context.fingerprint||importInputFingerprint()!==input)throw Error(t('m383'));
  if(parsed.channels.length){
   const result=core.importChannels(state,parsed,options),checked=await api('/api/validate',json('POST',result.draft));
   if(!$('#importDialog').open||importContext!==context)return;
   if(core.fingerprint(state)!==context.fingerprint||importInputFingerprint()!==input)throw Error(t('m383'));
   state.lists=checked.lists;state.epg=checked.epg;selected=result.listId;group='';changed();
  }
  $('#importDialog').close();
  if(parsed.report&&(parsed.report.issues.length||parsed.report.skipped))showImportReport(parsed.report);
  else toast(t('m36',{p0:parsed.channels.length}));
 }catch(err){if(importContext===context)toast(window.M3UI18n.error(err.message))}finally{if(importContext===context)submit.disabled=false}
};
$('#pickLogo').onclick=()=>openLogoPicker({editor:true},{name:$('#channelForm').elements.name.value,epg_id:$('#channelForm').elements.epg_id.value,logo:$('#channelForm').elements.logo.value});
$('#logoFile').onchange=async e=>{
 const file=e.target.files[0],target=logoPickerContext;if(!file||!target)return;$('#uploadLogoButton').disabled=true;
 try{const result=await uploadLibraryLogo(file);if(result){await refreshLogoLibrary();render();if($('#logosDialog').open&&logoPickerContext===target){applyLogoChoice(result.path,target);toast(t("m37"))}}}
 catch(err){toast(window.M3UI18n.error(err.message))}finally{$('#uploadLogoButton').disabled=false;e.target.value=''}
};
$('#settings').onclick=()=>{$('#globalEpg').value=state.epg;$('#links').replaceChildren();const add=(label,path)=>{const a=el('input');a.type='text';a.readOnly=true;a.value=state.base_url+path;window.M3UI18n.setAttribute(a,'aria-label',label);const row=el('div',undefined,'subscription-row'),copy=button(t("m38"),()=>copySubscription(a.value,copy));window.M3UI18n.setAttribute(copy,'aria-label',window.M3UI18n.dynamic(()=>t("m39")+label+t("m40")));row.append(a,copy);$('#links').append(el('strong',label),row)};add(t("m41"),'/tv.m3u');add(t("m42"),'/tv.txt');state.lists.forEach(list=>{add(window.M3UI18n.dynamic(()=>list.name+t("m43",{p0:(list.channels.length)})),list.slug?`/${list.slug}.m3u`:`/lists/${list.id}/tv.m3u`);add(window.M3UI18n.dynamic(()=>list.name+t("m44",{p0:(list.channels.length)})),list.slug?`/${list.slug}.txt`:`/lists/${list.id}/tv.txt`)});$('#settingsDialog').showModal()};$('#settingsForm').onsubmit=e=>{e.preventDefault();state.epg=$('#globalEpg').value.trim();$('#settingsDialog').close();changed()};
function openListSettings(listId=selected){if(listId!==selected){selected=listId;group='';render()}const list=current();if(!list)return;$('#listName').value=list.name;$('#listSlug').value=list.slug||'';$('#listEpg').value=list.epg;$('#listEnabled').checked=list.enabled;window.M3UI18n.setText($('#listId'),window.M3UI18n.dynamic(()=>t("m45")+list.id+t("m46")));$('#listDialog').showModal()};$('#listForm').onsubmit=e=>{e.preventDefault();const slug=$('#listSlug').value.trim().toLowerCase();if(slug&&(!/^[a-z0-9][a-z0-9_-]{0,23}$/.test(slug)||['tv','api','static','logo','lists','healthz'].includes(slug)))return toast(t("m47"));if(slug&&state.lists.some(list=>list.id!==selected&&(list.slug||'').toLowerCase()===slug))return toast(t("m48"));Object.assign(current(),{slug,name:$('#listName').value.trim(),epg:$('#listEpg').value.trim(),enabled:$('#listEnabled').checked});$('#listDialog').close();changed()};$('#deleteList').onclick=async()=>{if(!await uiConfirm(t("m49")))return;state.lists=state.lists.filter(l=>l.id!==selected);selected=state.lists[0]?.id;group='';$('#listDialog').close();changed()};
$('#backup').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=el('a');a.href=URL.createObjectURL(blob);a.download='iptv-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast(t("m50"))};
$('#restore').onclick=()=>$('#restoreFile').click();$('#restoreFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const raw=JSON.parse(await file.text());if(!Array.isArray(raw.lists))throw Error(t("m51"));if(!await uiConfirm(t("m52"),{title:t("uiConfirmAction"),confirmLabel:t("m125")}))return;state.lists=raw.lists;state.epg=raw.epg||'';selected=state.lists[0]?.id;group='';$('#preferencesDialog').close();changed()}catch(err){toast(window.M3UI18n.error(err.message))}e.target.value=''};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog.fixed-action-dialog').forEach(dialog=>new MutationObserver(()=>{if(dialog.open)dialog.querySelector('.dialog-scroll-body').scrollTop=0}).observe(dialog,{attributes:true,attributeFilter:['open']}));
const formBaselines=new WeakMap();
const formFingerprint=form=>JSON.stringify([...new FormData(form)].map(([key,value])=>[key,value instanceof File?[value.name,value.size,value.name?value.lastModified:0]:value]));
for(const id of ['channelForm','importForm','settingsForm','listForm']){const form=$('#'+id),dialog=form.closest('dialog');new MutationObserver(()=>{if(dialog.open)formBaselines.set(form,formFingerprint(form));else formBaselines.delete(form)}).observe(dialog,{attributes:true,attributeFilter:['open']})}
function pendingFormChanges(){return ['channelForm','importForm','settingsForm','listForm'].some(id=>{const form=$('#'+id);return form.closest('dialog').open&&formBaselines.has(form)&&formFingerprint(form)!==formBaselines.get(form)})}
window.addEventListener('beforeunload',e=>{if(dirty||pendingFormChanges()){e.preventDefault();e.returnValue=''}});
function showAuth(setup){stopSourceCheck();stopSingleChecks();if($('#sourceCheckDialog').open)$('#sourceCheckDialog').close();authMode=setup?'setup':'login';$('#appShell').hidden=true;$('#authScreen').hidden=false;window.M3UI18n.setText($('#authTitle'),window.M3UI18n.dynamic(()=>setup?t("m53"):t("m54")));window.M3UI18n.setText($('#authHint'),window.M3UI18n.dynamic(()=>setup?t("m55"):t("m56")));window.M3UI18n.setText($('#authSubmit'),window.M3UI18n.dynamic(()=>setup?t("m57"):t("m58")));$('#confirmLabel').hidden=!setup;const fields=$('#authForm').elements;fields.password.minLength=setup?8:0;fields.password.autocomplete=setup?'new-password':'current-password';fields.confirm_password.required=setup;fields.password.value='';fields.confirm_password.value='';window.M3UI18n.setText($('#authError'),'')}
function renderUserMenu(){window.M3UI18n.setText($('#currentUserName'),window.M3UI18n.dynamic(()=>username||''))}
async function loadWorkspace(){renderUserMenu();if(!dirty||!state||workspaceOwner!==username){if(state&&dirty)persistDraft();dirty=false;workspaceOwner=username;state=await api('/api/state');publishedFingerprint=core.fingerprint(state);draftHistory.reset(state);selectedChannels.clear();selected=state.lists[0]?.id;group='';
 try{draftStore=core.createDraftStore(window.localStorage,'m3u-studio-draft:'+username);const saved=draftStore.read();
  if(saved){if(core.fingerprint(saved.content)===publishedFingerprint)draftStore.clear();else if(await uiConfirm(t('m318',{p0:new Date(saved.savedAt).toLocaleString(window.M3UI18n.locale),p1:saved.baseline===publishedFingerprint?'':t('m319')}),{danger:false,confirmLabel:t('m125')})){const checked=await api('/api/validate',json('POST',saved.content));state.lists=checked.lists;state.epg=checked.epg;selected=state.lists[0]?.id;draftHistory.record(state);syncDirty();toast(t('m321'))}else draftStore.clear()}
 }catch{toast(t('m320'))}
 }$('#authScreen').hidden=true;$('#appShell').hidden=false;renderSaveStatus();render();window.dispatchEvent(new Event("m3u-workspace-ready"))}
$('#authForm').onsubmit=async e=>{e.preventDefault();const f=e.target.elements;if(authMode==='setup'&&f.password.value!==f.confirm_password.value){window.M3UI18n.setText($('#authError'),window.M3UI18n.dynamic(()=>t("m60")));return}$('#authSubmit').disabled=true;try{const result=await api('/api/auth/'+authMode,json('POST',{username:f.username.value,password:f.password.value}));username=result.username;f.password.value='';f.confirm_password.value='';await loadWorkspace()}catch(err){window.M3UI18n.setText($('#authError'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))}finally{$('#authSubmit').disabled=false}};
$('#logout').onclick=async()=>{if(dirty&&!await uiConfirm(t("m61"),{danger:false,confirmLabel:t("m159")}))return;try{await api('/api/auth/logout',json('POST',{}));stopSourceCheck();stopSingleChecks();sourceCheckResults.clear();persistDraft();state=null;dirty=false;draftStore=null;selectedChannels.clear();publishedFingerprint='';showAuth(false)}catch(err){toast(window.M3UI18n.error(err.message))}};
$('#preferences').onclick=()=>$('#preferencesDialog').showModal();
$('#userAccountSettings').onclick=()=>$('#accountSettings').click();
$('#accountSettings').onclick=()=>{const form=$('#accountForm');form.reset();form.elements.username.value=username;$('#accountDialog').showModal()};
$('#accountForm').onsubmit=async e=>{e.preventDefault();const form=e.target;if(form.elements.password.value!==form.elements.confirm_password.value)return toast(t("m62"));try{const result=await api('/api/auth/account',json('PUT',Object.fromEntries(new FormData(form))));username=result.username;renderUserMenu();form.reset();$('#accountDialog').close();toast(t("m63"))}catch(err){toast(window.M3UI18n.error(err.message))}};
function updateSelection(){
 const hasSelection=selectedChannels.size>0;$('.bulk-actions').hidden=!hasSelection;$('.bulk-toolbar').classList.toggle('has-selection',hasSelection);
 const all=visibleChannels.length>0&&visibleChannels.every(ch=>selectedChannels.has(ch.id));
 $('#selectVisible').checked=all;$('#selectVisible').indeterminate=!all&&visibleChannels.some(ch=>selectedChannels.has(ch.id));$('#selectVisible').disabled=!visibleChannels.length;
 window.M3UI18n.setText($('#selectionCount'),window.M3UI18n.dynamic(()=>t("m64",{p0:(selectedChannels.size)})));$('#clearSelection').disabled=!selectedChannels.size;$('#batchEdit').disabled=!selectedChannels.size;$('#batchDelete').disabled=!selectedChannels.size;$('#checkSources').disabled=!current()?.channels.length||!!sourceSingleRuns.size;$('#autoLogo').disabled=!(selectedChannels.size||visibleChannels.length);
 $('#undo').disabled=!draftHistory.canUndo;$('#redo').disabled=!draftHistory.canRedo;
}
$('#selectVisible').onchange=e=>{visibleChannels.forEach(ch=>{if(e.target.checked)selectedChannels.add(ch.id);else selectedChannels.delete(ch.id)});render()};
$('#clearSelection').onclick=()=>{selectedChannels.clear();render()};
$('#undo').onclick=()=>{const content=draftHistory.undo();if(content){applyContent(content);toast(t("m65"))}};
$('#redo').onclick=()=>{const content=draftHistory.redo();if(content)applyContent(content)};
window.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]')||!state||$('#appShell').hidden)return;
 if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('#redo'):$('#undo')).click()}
});
function previewRow(name,description){const row=el('div',undefined,'preview-row');row.append(el('strong',name),el('p',description,'hint'));return row}
const maskUrl=value=>(value||'').replace(/(\w+:\/\/)[^/@\s]+@/g,'$1••••@');
function invalidateBatch(){batchCandidate=null;batchStats=null;$('#batchApply').disabled=true;$('#batchPreview').replaceChildren();syncTransferPresentation();window.M3UI18n.setText($('#batchMessage'),window.M3UI18n.dynamic(()=>t("m66")))}
function batchInputFingerprint(){return JSON.stringify({transferMode:$('#batchTransferMode').value,targetList:$('#batchTargetList').value,targetGroup:$('#batchTargetGroup').value,newGroup:$('#batchNewGroup').value,group:$('#batchGroup').value,epg:$('#batchEpg').value,fcc:$('#batchFcc').value,from:$('#replaceFrom').value,to:$('#replaceTo').value,toggles:batchControls.map(([id])=>$('#'+id).checked),live:$('#replaceLive').checked,catchup:$('#replaceCatchup').checked})}
const batchControls=[['changeTransfer',['batchTransferMode','batchTargetList','batchTargetGroup']],['changeGroup',['batchGroup']],['changeEpg',['batchEpg']],['changeFcc',['batchFcc']],['changeReplace',['replaceFrom','replaceTo','replaceLive','replaceCatchup']]];
for(const [toggle,fields] of batchControls)$('#'+toggle).onchange=()=>{fields.forEach(id=>$('#'+id).disabled=!$('#'+toggle).checked);syncTransferFields();invalidateBatch()};
function syncTransferPresentation(){
 const active=$('#changeTransfer').checked,move=$('#batchTransferMode').value==='move';
 for(const [id] of batchControls){const input=$('#'+id);input.closest('section').classList.toggle('is-selected',input.checked&&!input.disabled)}
 $('#batchTransferNotice').hidden=!active;
 $('#batchTransferNotice').closest('section').classList.toggle('is-move',active&&move);
 window.M3UI18n.setText($('#batchTransferNotice'),window.M3UI18n.dynamic(()=>t(move?'m371':'m370')));
 window.M3UI18n.setText($('#batchApply'),window.M3UI18n.dynamic(()=>t('m233')));
}
$('#batchTransferMode').onchange=()=>{invalidateBatch()};
function syncTransferFields(){
 const active=$('#changeTransfer').checked;
 $('#batchNewGroupLabel').hidden=$('#batchTargetGroup').value!=='new';
 $('#batchNewGroup').disabled=!active||$('#batchTargetGroup').value!=='new';
 $('#changeGroup').disabled=active;$('#batchGroup').disabled=active||!$('#changeGroup').checked;
}
function populateTargetGroups(){
 const target=state.lists.find(l=>l.id===$('#batchTargetList').value);
 const option=(value,text)=>{const o=el('option',text);o.value=value;return o};
 $('#batchTargetGroup').replaceChildren(option('keep',window.M3UI18n.dynamic(()=>t('m364'))),...(target?.groups||[]).map(g=>option('group:'+g,g)),option('new',window.M3UI18n.dynamic(()=>t('m365'))));
 $('#batchNewGroup').value='';syncTransferFields();invalidateBatch();
}
$('#batchTargetList').onchange=populateTargetGroups;
$('#batchTargetGroup').onchange=()=>{syncTransferFields();invalidateBatch()};
$('#batchForm').addEventListener('input',invalidateBatch);
$('#batchEdit').onclick=()=>{
 batchContext={listId:selected,ids:[...selectedChannels],fingerprint:core.fingerprint(state)};$('#batchForm').reset();batchControls.forEach(([toggle,fields])=>fields.forEach(id=>$('#'+id).disabled=true));
 $('#batchTargetList').replaceChildren(...state.lists.filter(l=>l.id!==selected).map(l=>{const o=el('option',l.name);o.value=l.id;return o}));
 populateTargetGroups();
 $('#batchGroup').replaceChildren(...current().groups.map(g=>{const o=el('option',g);o.value=g;return o}));window.M3UI18n.setText($('#batchScope'),window.M3UI18n.dynamic(()=>t("m67",{p0:(current().name),p1:(batchContext.ids.length)})));invalidateBatch();$('#batchDialog').showModal();
};
$('#batchForm').onsubmit=async e=>{
 e.preventDefault();invalidateBatch();const changes={},inputFingerprint=batchInputFingerprint(),context=batchContext;
 if($('#changeTransfer').checked){if(!$('#batchTargetList').value)return toast(t('m361'));changes.transfer={mode:$('#batchTransferMode').value,listId:$('#batchTargetList').value};const targetGroup=$('#batchTargetGroup').value;
  if(targetGroup!=='keep'){const name=targetGroup==='new'?$('#batchNewGroup').value.trim():targetGroup.slice(6);if(!name||name.length>200||/[,"\r\n]/.test(name))return toast(t('m367'));changes.transfer.group=name}}

 if(!changes.transfer&&$('#changeGroup').checked)changes.group=$('#batchGroup').value;
 if($('#changeEpg').checked)changes.epg=$('#batchEpg').value.trim();
 if($('#changeFcc').checked)changes.fcc_url=$('#batchFcc').value.trim();
 if($('#changeReplace').checked){const fields=[];if($('#replaceLive').checked)fields.push('url');if($('#replaceCatchup').checked)fields.push('catchup_url');if(fields.length!==1)return toast(t("m68"));changes.replace={from:$('#replaceFrom').value,to:$('#replaceTo').value,fields}}
 if(!Object.keys(changes).length)return toast(t("m69"));
 const btn=$('#batchPreviewButton');btn.disabled=true;
 try{
  if(core.fingerprint(state)!==batchContext.fingerprint)throw Error(t("m70"));
  const {draft,count,total,skipped,transfers}=core.batchEdit(state,batchContext.listId,batchContext.ids,changes);
  if(!count){window.M3UI18n.setText($('#batchMessage'),t('m322',{p0:total,p1:0,p2:skipped,p3:''}));return}
  const checked=await api('/api/validate',json('POST',draft));
  if(!$('#batchDialog').open||batchContext!==context)return;
  // Form input while validation was pending makes the returned preview stale.
  if(inputFingerprint!==batchInputFingerprint()){toast(t("m72"));return}
  batchCandidate=checked;batchStats={count,total,skipped};const before=current(),beforeById=new Map(before.channels.map(ch=>[ch.id,ch])),ids=new Set(batchContext.ids),after=checked.lists.find(l=>l.id===batchContext.listId);let displayed=0;
  if(changes.transfer){
   const target=checked.lists.find(l=>l.id===changes.transfer.listId),targetById=new Map(target.channels.map(ch=>[ch.id,ch]));
   for(const pair of transfers){if(displayed++>=100)continue;const ch=targetById.get(pair.targetId);$('#batchPreview').append(previewRow(ch.name,window.M3UI18n.dynamic(()=>t('m362',{p0:changes.transfer.mode==='move'?t('m357'):t('m358'),p1:before.name,p2:target.name,p3:ch.group}))))}
  }
  for(const ch of changes.transfer?[]:after.channels){const old=beforeById.get(ch.id);if(!ids.has(ch.id)||!['group','epg','fcc_url','url','catchup_url'].some(key=>old[key]!==ch[key]))continue;if(displayed++>=100)continue;
   const descriptions=()=>{const lines=[];for(const key of ['group','epg','fcc_url','url','catchup_url'])if(old[key]!==ch[key])lines.push(`${({group:t("m73"),epg:'EPG',fcc_url:'FCC',url:t("m74"),catchup_url:t("m20")})[key]}${window.M3UI18n.language==='zh'?'：':': '}${maskUrl(old[key])||t("m75")} → ${maskUrl(ch[key])||t("m75")}`);
   return lines.join('\n')};
   $('#batchPreview').append(previewRow(ch.name,window.M3UI18n.dynamic(descriptions)));
  }
  window.M3UI18n.setText($('#batchMessage'),window.M3UI18n.dynamic(()=>t('m322',{p0:total,p1:count,p2:skipped,p3:displayed>100?t('m76'):''})));$('#batchApply').disabled=false;
 }catch(err){toast(window.M3UI18n.error(err.message))}finally{btn.disabled=false}
};
$('#batchApply').onclick=()=>{if(!batchCandidate)return;if(core.fingerprint(state)!==batchContext.fingerprint)return toast(t("m78"));state.lists=batchCandidate.lists;state.epg=batchCandidate.epg;const remainingIds=new Set(current().channels.map(ch=>ch.id));selectedChannels=new Set([...selectedChannels].filter(id=>remainingIds.has(id)));$('#batchDialog').close();changed();toast(t('m323',{p0:batchStats.count,p1:batchStats.skipped}),true)};
async function loadLogos(){logoLibrary=await api('/api/logos');return logoLibrary}
function libraryPaths(){return logoLibrary.logos}
let logoPickerContext=null,logoPickerChannel=null;
function selectLogoTab(kind){
 for(const [id,panel,key] of [['tabBuiltin','logoCatalogPanel','builtin'],['tabLink','logoLinkPanel','link'],['tabUpload','logoUploadPanel','upload']]){const active=key===kind;$('#'+id).setAttribute('aria-selected',String(active));$('#'+panel).hidden=!active}
}
async function openLogoPicker(context,channel){
 logoPickerContext=context;logoPickerChannel=channel;window.M3UI18n.setText($('#logoPickerTitle'),window.M3UI18n.dynamic(()=>t("m81",{p0:(channel.name||t("m80"))})));$('#logoSearch').value='';$('#logoLink').value=channel.logo?.startsWith('http')?channel.logo:'';$('#logoGrid').replaceChildren();window.M3UI18n.setText($('#logoCount'),window.M3UI18n.dynamic(()=>t("m82")));updateLogoPreview(channel.logo,channel.name);selectLogoTab('builtin');$('#logosDialog').showModal();
 try{await loadLogos();if(logoPickerContext!==context||!$('#logosDialog').open)return;renderLogoPicker()}catch(err){window.M3UI18n.setText($('#logoCount'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))}
}
function applyLogoChoice(path,target=logoPickerContext){
 if(!target)return;
 if(target.editor){if(!$('#editor').open)return;$('#channelForm').elements.logo.value=path}
 else{const ch=state.lists.find(l=>l.id===target.listId)?.channels.find(c=>c.id===target.channelId);if(!ch)return toast(t("m83"));if(ch.logo!==path){ch.logo=path;changed()}}
 $('#logosDialog').close();toast(t("m84"));
}
function renderLogoPicker(){
 if(!logoLibrary||!logoPickerChannel)return;
 const query=core.normalizeName($('#logoSearch').value),paths=libraryPaths(),suggestion=core.matchLogo(logoPickerChannel,paths,logoLibrary.aliases);
 const filtered=paths.filter(path=>core.normalizeName(core.logoName(path)).includes(query)).sort((a,b)=>(a===suggestion?-1:b===suggestion?1:core.logoName(a).localeCompare(core.logoName(b),window.M3UI18n.locale,{numeric:true})));
 $('#logoGrid').replaceChildren();window.M3UI18n.setText($('#logoCount'),window.M3UI18n.dynamic(()=>filtered.length?t("m87",{p0:(filtered.length),p1:(suggestion?t("m85"):''),p2:(filtered.length>300?t("m86"):'')}):t("m88")));
 filtered.slice(0,300).forEach(path=>{const name=core.logoName(path),b=button('',()=>applyLogoChoice(path)),img=el('img');img.src=path;img.alt=name;img.loading='lazy';img.referrerPolicy='no-referrer';window.M3UI18n.setAttribute(b,'title',name);b.onmouseenter=()=>updateLogoPreview(path,name,true);b.onfocus=()=>updateLogoPreview(path,name,true);b.append(img,el('small',name));if(path===suggestion)b.append(el('small',t("m89"),'logo-recommend'));$('#logoGrid').append(b)});
}
$('#tabBuiltin').onclick=()=>selectLogoTab('builtin');$('#tabLink').onclick=()=>selectLogoTab('link');$('#tabUpload').onclick=()=>selectLogoTab('upload');
$('.logo-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[$('#tabBuiltin'),$('#tabUpload'),$('#tabLink')],i=tabs.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;tabs[next].click();tabs[next].focus()};
$('#uploadLogoButton').onclick=()=>$('#logoFile').click();
$('#logoLinkForm').onsubmit=e=>{e.preventDefault();const value=$('#logoLink').value.trim();try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error();applyLogoChoice(value)}catch{toast(t("m90"))}};
function confirmLogoReplace(name,users=[]){
 return new Promise(resolve=>{
  const dialog=$('#logoConflictDialog');window.M3UI18n.setText($('#logoConflictMessage'),window.M3UI18n.dynamic(()=>t("m92",{p0:(name),p1:(users.length?t("m91",{p0:(users.length)}):'')})));
  let replaced=false;$('#logoConflictReplace').onclick=()=>{replaced=true;dialog.close()};$('#logoConflictStop').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>resolve(replaced),{once:true});dialog.showModal();
 });
}
async function uploadLibraryLogo(file,name=null){
 const send=replace=>{const data=new FormData();data.append('file',file,name||file.name);if(replace)data.append('replace','1');return api('/api/logos',{method:'POST',body:data})};
 try{return await send(false)}catch(err){if(!err.data?.conflict)throw err;if(!await confirmLogoReplace(err.data.name,err.data.users))return null;return send(true)}
}
async function refreshLogoLibrary(){await loadLogos();if($('#logoManagerDialog').open)renderLogoManager();if($('#logosDialog').open)renderLogoPicker()}
async function openLogoManager(){
 $('#managerLogoSearch').value='';$('#managerLogoGrid').replaceChildren();window.M3UI18n.setText($('#managerLogoStatus'),window.M3UI18n.dynamic(()=>t("m93")));$('#logoManagerDialog').showModal();
 try{await loadLogos();renderLogoManager()}catch(err){window.M3UI18n.setText($('#managerLogoStatus'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))}
}
function draftLogoUsers(path){
 return (state?.lists||[]).flatMap(list=>list.channels.filter(ch=>{
  try{const url=new URL(ch.logo,location.origin);return url.origin===location.origin&&'/logo/'+(logoLibrary.aliases[decodeURIComponent(url.pathname).slice(6)]||decodeURIComponent(url.pathname).slice(6))===path}catch{return false}
 }).map(ch=>({list:list.name,name:ch.name})));
}
function usageText(users){return users.slice(0,12).map(u=>`${u.list} / ${u.name}`).join(window.M3UI18n.language==='zh'?'、':', ')+(users.length>12?t("m94",{p0:(users.length)}):'')}
async function removeLibraryLogo(entry){
 const users=[...entry.users,...draftLogoUsers(entry.path)],warning=users.length?t("m95",{p0:(usageText(users))}):t("m96");
 if(!await uiConfirm(t("m97",{p0:(entry.name),p1:(warning)})))return;
 const path='/api/logos/'+encodeURIComponent(entry.name);
 try{await api(path,{method:'DELETE'})}catch(err){if(!err.data?.in_use)throw err;if(!await uiConfirm(t("m98",{p0:(usageText(err.data.users))})))return;await api(path+'?confirm=1',{method:'DELETE'})}
 await refreshLogoLibrary();render();toast(t("m99"));
}
let replacementLogoName=null,managerUploadBusy=false;
function renderLogoManager(){
 if(!logoLibrary)return;
 const query=core.normalizeName($('#managerLogoSearch').value),entries=logoLibrary.entries.filter(e=>core.normalizeName(core.logoName(e.path)).includes(query)).sort((a,b)=>a.name.localeCompare(b.name,window.M3UI18n.locale,{numeric:true}));
 $('#managerLogoGrid').replaceChildren();window.M3UI18n.setText($('#managerLogoStatus'),window.M3UI18n.dynamic(()=>t("m101",{p0:(logoLibrary.entries.length),p1:(entries.length),p2:(entries.length>300?t("m100"):'')})));
 for(const entry of entries.slice(0,300)){
  const row=el('section',undefined,'library-logo-card'),img=el('img');img.src=entry.path;img.alt=core.logoName(entry.path);img.loading='lazy';row.append(img,el('strong',core.logoName(entry.path)),el('small',t("m104",{p0:(entry.uploaded?t("m102"):t("m103")),p1:(entry.users.length)})));
  const actions=el('div',undefined,'library-logo-actions'),replace=button(t("m105"),()=>{replacementLogoName=entry.name;$('#replaceLogoFile').click()}),remove=button(t("m22"),async()=>{remove.disabled=true;try{await removeLibraryLogo(entry)}catch(err){toast(window.M3UI18n.error(err.message))}finally{remove.disabled=false}},'danger');replace.disabled=remove.disabled=managerUploadBusy;actions.append(replace,remove);row.append(actions);$('#managerLogoGrid').append(row);
 }
}
async function uploadManagerFiles(files,name=null){
 if(managerUploadBusy)return;managerUploadBusy=true;$('#managerUpload').disabled=true;renderLogoManager();let count=0,stopped=false;
 try{for(const file of files){window.M3UI18n.setText($('#managerLogoStatus'),window.M3UI18n.dynamic(()=>t("m106",{p0:(file.name)})));const result=await uploadLibraryLogo(file,name);if(!result){stopped=true;break}count++} }
 catch(err){toast(window.M3UI18n.error(err.message))}finally{managerUploadBusy=false;$('#managerUpload').disabled=false;try{await refreshLogoLibrary();render();window.M3UI18n.setText($('#managerLogoStatus'),window.M3UI18n.dynamic(()=>t("m101",{p0:logoLibrary.entries.length,p1:logoLibrary.entries.filter(e=>core.normalizeName(core.logoName(e.path)).includes(core.normalizeName($('#managerLogoSearch').value))).length,p2:''})+t("m108",{p0:(count),p1:(stopped?t("m107"):'')})))}catch(err){toast(window.M3UI18n.error(err.message))}}
}
$('#manageLogos').onclick=openLogoManager;$('#pickerManageLogos').onclick=openLogoManager;
$('#managerLogoSearch').oninput=renderLogoManager;$('#managerUpload').onclick=()=>$('#managerLogoFile').click();
$('#managerLogoFile').onchange=async e=>{const files=[...e.target.files];e.target.value='';await uploadManagerFiles(files)};
$('#replaceLogoFile').onchange=async e=>{const file=e.target.files[0],name=replacementLogoName;e.target.value='';if(file&&name)await uploadManagerFiles([file],name)};
$('#logoSearch').oninput=renderLogoPicker;
$('#autoLogo').onclick=async()=>{
 const list=current(),ids=selectedChannels.size?[...selectedChannels]:visibleChannels.map(c=>c.id);
 logoContext={listId:selected,ids,fingerprint:core.fingerprint(state)};
 try{await loadLogos();if(core.fingerprint(state)!==logoContext.fingerprint)return toast(t("m109"));$('#replaceLogos').checked=false;window.M3UI18n.setText($('#autoLogoScope'),window.M3UI18n.dynamic(()=>t("m112",{p0:(list.name),p1:(selectedChannels.size?t("m110"):t("m111")),p2:(ids.length)})));renderAutoLogos();$('#autoLogoDialog').showModal()}catch(err){toast(window.M3UI18n.error(err.message))}
};
function renderAutoLogos(){
 const list=state.lists.find(l=>l.id===logoContext.listId),paths=libraryPaths(),ids=new Set(logoContext.ids);logoMatches=[];let missing=0,kept=0,same=0;$('#autoLogoPreview').replaceChildren();
 list.channels.filter(ch=>ids.has(ch.id)).forEach(ch=>{
  if(ch.logo&&!$('#replaceLogos').checked){kept++;return}const path=core.matchLogo(ch,paths,logoLibrary.aliases);if(!path){missing++;return}if(ch.logo===path){same++;return}
  logoMatches.push({id:ch.id,path});if(logoMatches.length<=100){const row=previewRow(ch.name,`${ch.logo?t("m113"):t("m114")} → ${core.logoName(path)}`),img=el('img');img.src=path;img.alt=core.logoName(path);row.prepend(img);$('#autoLogoPreview').append(row)}
 });
 window.M3UI18n.setText($('#autoLogoSummary'),window.M3UI18n.dynamic(()=>t("m116",{p0:(logoMatches.length),p1:(kept),p2:(same),p3:(missing),p4:(logoMatches.length>100?t("m115"):'')})));$('#autoLogoApply').disabled=!logoMatches.length;
}
$('#replaceLogos').onchange=renderAutoLogos;
$('#autoLogoApply').onclick=()=>{if(core.fingerprint(state)!==logoContext.fingerprint)return toast(t("m109"));const list=state.lists.find(l=>l.id===logoContext.listId);const paths=new Map(logoMatches.map(m=>[m.id,m.path]));list.channels.forEach(ch=>{if(paths.has(ch.id))ch.logo=paths.get(ch.id)});$('#autoLogoDialog').close();changed();toast(t("m117",{p0:(logoMatches.length)}),true)};
function legacyCopy(text){
 const previous=document.activeElement,area=el('textarea');area.className='clipboard-helper';area.value=text;$('#settingsDialog').append(area);area.focus();area.select();
 let ok=false;try{ok=document.execCommand('copy')}finally{area.remove();previous?.focus()}return ok;
}
async function copySubscription(text,copyButton=null){
 let copied=false;
 if(window.isSecureContext&&navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);copied=true}catch{}}
 if(!copied){try{copied=legacyCopy(text)}catch{}}
 if(!copied)toast(t("m119"));
 if(copied&&copyButton){clearTimeout(copyButton.copyTimer);window.M3UI18n.setText(copyButton,t('uiCopied'));copyButton.classList.add('is-copied');copyButton.copyTimer=setTimeout(()=>{window.M3UI18n.setText(copyButton,t('m38'));copyButton.classList.remove('is-copied')},1500)}
}
$('#history').onclick=async()=>{
 $('#historyEntries').replaceChildren();window.M3UI18n.setText($('#historyStatus'),window.M3UI18n.dynamic(()=>t("m120")));$('#historyDialog').showModal();
 try{const data=await api('/api/history');if(!$('#historyDialog').open)return;window.M3UI18n.setText($('#historyStatus'),window.M3UI18n.dynamic(()=>t("m121",{p0:(data.revision),p1:(data.entries.length)})));
  if(!data.entries.length)$('#historyEntries').append(el('p',t("m122"),'hint'));
  data.entries.forEach(entry=>{const row=previewRow(window.M3UI18n.dynamic(()=>`v${entry.revision}${entry.revision===data.revision-1?t("m123"):''}`),window.M3UI18n.dynamic(()=>t("m124",{p0:(new Date(entry.created_at).toLocaleString(window.M3UI18n.locale)),p1:(entry.lists),p2:(entry.channels)}))),restore=button(t("m125"),async()=>{
   if(!await uiConfirm(t("m127",{p0:(entry.revision),p1:(dirty?t("m126"):'')}),{danger:false,confirmLabel:t("m125")}))return;
   restore.disabled=true;try{const snapshot=await api('/api/history/'+entry.revision);state.lists=snapshot.state.lists;state.epg=snapshot.state.epg;selected=state.lists[0]?.id;group='';selectedChannels.clear();$('#historyDialog').close();$('#preferencesDialog').close();changed();toast(t("m128",{p0:(entry.revision)}))}catch(err){toast(window.M3UI18n.error(err.message))}finally{restore.disabled=false}
  });row.append(restore);$('#historyEntries').append(row)});
 }catch(err){window.M3UI18n.setText($('#historyStatus'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))}
};
const sourceCheckResults=new Map(),sourceSingleRuns=new Map();
let sourceRun=null,sourceItems=[],sourceDone=0,sourceTotal=0,sourceCancelled=false,sourceStarted=false;
const sourceResultKey=(listId,ch)=>JSON.stringify([listId,ch.id,ch.url]);
const sourceItem=(listId,ch)=>({listId,id:ch.id,name:ch.name,url:ch.url,key:sourceResultKey(listId,ch)});
const sourceDisplayResult=key=>sourceSingleRuns.has(key)?{status:'checking'}:sourceCheckResults.get(key);
function sourceBadge(result,item=null){
 result=result||{status:'idle'};
 const text=result.status==='idle'?'—':result.status==='ok'?`${result.ms}ms`:t(({checking:'m341',timeout:'m332',unavailable:'m333',unsupported:'m334'})[result.status]||'m333');
 const badge=item?button(text,()=>checkSingleSource(item)):el('span',text);badge.className='source-latency '+M3USourceCheck.color(result)+(result.status==='idle'?' source-idle':'');
 if(item){badge.disabled=!!sourceRun||sourceSingleRuns.has(item.key)||sourceSingleRuns.size>=4;window.M3UI18n.setAttribute(badge,'title',window.M3UI18n.dynamic(()=>t('m343',{p0:item.name})));window.M3UI18n.setAttribute(badge,'aria-label',window.M3UI18n.dynamic(()=>t('m343',{p0:item.name})))}
 return badge;
}
async function checkSingleSource(item){
 if(sourceRun||sourceSingleRuns.has(item.key))return;
 if(sourceSingleRuns.size>=4)return toast(t('m344'));
 const controller=new AbortController();sourceSingleRuns.set(item.key,controller);sourceCheckResults.delete(item.key);updateSourceBadges();updateSelection();
 try{const result=await probeSource(item,controller.signal);if(!controller.signal.aborted)sourceCheckResults.set(item.key,result)}
 catch{if(!controller.signal.aborted)sourceCheckResults.set(item.key,{status:'unavailable'})}
 finally{if(sourceSingleRuns.get(item.key)===controller)sourceSingleRuns.delete(item.key);updateSourceBadges();updateSelection()}
}
function stopSingleChecks(){for(const controller of sourceSingleRuns.values())controller.abort();sourceSingleRuns.clear()}

function updateSourceBadges(){
 const channels=new Map((current()?.channels||[]).map(ch=>[ch.id,ch]));
 for(const row of $('#channels').children){const cell=row.querySelector('.channel-status'),ch=channels.get(row.dataset.id);if(!cell||!ch)continue;const result=sourceDisplayResult(sourceResultKey(selected,ch));cell.replaceChildren(sourceBadge(result,sourceItem(selected,ch)))}
}
function renderSourceResults(){
 $('#sourceCheckResults').replaceChildren();
 let failures=0;
 for(const item of sourceItems){const result=sourceCheckResults.get(item.key);if(result&&M3USourceCheck.failed(result))failures++;if($('#sourceCheckFailed').checked&&(!result||!M3USourceCheck.failed(result)))continue;
 const row=el('div',undefined,'source-check-row');row.append(el('span',item.name),result?sourceBadge(result):el('span',sourceCancelled?t('m335'):t('m336'),'muted'));$('#sourceCheckResults').append(row)}
 $('#sourceCheckProgress').max=Math.max(1,sourceTotal);$('#sourceCheckProgress').value=sourceDone;
 window.M3UI18n.setText($('#sourceCheckStatus'),window.M3UI18n.dynamic(()=>t(!sourceStarted?'m346':sourceRun?'m337':sourceCancelled?'m338':'m339',{p0:sourceDone,p1:sourceTotal,p2:failures})));
 window.M3UI18n.setText($('#sourceCheckAgain'),window.M3UI18n.dynamic(()=>t(sourceStarted?'m342':'m345')));
 $('#sourceCheckAgain').disabled=!!sourceRun||!sourceItems.length;$('#sourceCheckRetry').disabled=!sourceStarted||!!sourceRun||!failures;$('#sourceCheckCancel').disabled=!sourceRun;
}
async function probeSource(item,signal){
 while(!signal.aborted){
  const response=await fetch('/api/source-check',{method:'POST',signal,headers:{'Content-Type':'application/json','X-IPTV-Request':'1'},body:JSON.stringify({url:item.url})});
  if(response.status===429){await new Promise(resolve=>{const timer=setTimeout(done,250);function done(){clearTimeout(timer);signal.removeEventListener('abort',done);resolve()}signal.addEventListener('abort',done,{once:true})});continue}
  if(response.status===401){stopSourceCheck();showAuth(false);return {status:'unavailable'}}
  if(!response.ok)return {status:'unavailable'};
  return response.json();
 }
 throw new DOMException('Cancelled','AbortError');
}
async function runSourceCheck(items){
 if(sourceRun||sourceSingleRuns.size)return;const controller=new AbortController();sourceRun=controller;sourceStarted=true;sourceCancelled=false;sourceDone=0;sourceTotal=items.length;
 for(const item of items)sourceCheckResults.delete(item.key);renderSourceResults();render();
 try{await M3USourceCheck.run(items,probeSource,(item,result)=>{sourceCheckResults.set(item.key,result);sourceDone++;renderSourceResults();updateSourceBadges()},controller.signal)}
 finally{if(sourceRun===controller){sourceRun=null;renderSourceResults();render()}}
}
function stopSourceCheck(){if(sourceRun){sourceCancelled=true;sourceRun.abort();renderSourceResults()}}
$('#checkSources').onclick=()=>{
 if(sourceRun){$('#sourceCheckDialog').showModal();return}
 const list=current();if(!list)return;const ids=selectedChannels.size?new Set(selectedChannels):null;
 sourceItems=list.channels.filter(ch=>!ids||ids.has(ch.id)).map(ch=>sourceItem(list.id,ch));
 $('#sourceCheckFailed').checked=false;window.M3UI18n.setText($('#sourceCheckScope'),window.M3UI18n.dynamic(()=>t('m340',{p0:list.name,p1:sourceItems.length})));sourceStarted=false;sourceCancelled=false;sourceDone=0;sourceTotal=sourceItems.length;renderSourceResults();$('#sourceCheckDialog').showModal();
};
$('#sourceCheckAgain').onclick=()=>{$('#sourceCheckFailed').checked=false;runSourceCheck(sourceItems)};
$('#sourceCheckCancel').onclick=stopSourceCheck;
$('#sourceCheckDialog').addEventListener('close',stopSourceCheck);
$('#sourceCheckFailed').onchange=renderSourceResults;
$('#sourceCheckRetry').onclick=()=>runSourceCheck(sourceItems.filter(item=>M3USourceCheck.failed(sourceCheckResults.get(item.key)||{})));
window.addEventListener('m3u-language-change',()=>{if($('#sourceCheckDialog').open)renderSourceResults()});
api('/api/auth/status').then(async data=>{window.M3UUpdates.setCurrentVersion(data.version);username=data.username;if(data.authenticated)await loadWorkspace();else showAuth(!data.initialized)}).catch(err=>{showAuth(false);window.M3UI18n.setText($('#authError'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))});

window.addEventListener('m3u-language-change',()=>{if(state){render();if(logoLibrary&&$('#logoManagerDialog').open)renderLogoManager();if(logoLibrary&&$('#logosDialog').open)renderLogoPicker();if(logoContext&&$('#autoLogoDialog').open)renderAutoLogos();}});

$('#batchDelete').onclick=async()=>{
 const list=current();if(!list)return;
 const ids=new Set(list.channels.filter(ch=>selectedChannels.has(ch.id)).map(ch=>ch.id));
 if(!ids.size||!await uiConfirm(t('studioDeleteConfirm',{p0:ids.size})))return;
 list.channels=list.channels.filter(ch=>!ids.has(ch.id));
 selectedChannels.clear();changed();toast(t('studioDeleted',{p0:ids.size}),true);
};

function setImportMode(mode){
 const modes=['url','file','paste'];
 for(const name of modes){const active=name===mode,tab=$('#importTab-'+name);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$('#importPanel-'+name).hidden=!active}
 $('#playlistUrl').required=mode==='url';
 if(mode!=='url')$('#playlistUrl').value='';
}
for(const tab of document.querySelectorAll('[data-import-mode]')){
 tab.onclick=()=>setImportMode(tab.dataset.importMode);
 tab.onkeydown=e=>{const modes=['url','file','paste'],index=modes.indexOf(tab.dataset.importMode);let next;if(e.key==='ArrowRight')next=(index+1)%3;else if(e.key==='ArrowLeft')next=(index+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();setImportMode(modes[next]);$('#importTab-'+modes[next]).focus()};
}
const playlistDrop=$('#playlistDrop');
playlistDrop.onclick=()=>$('#playlistFile').click();
playlistDrop.ondragover=e=>{e.preventDefault();playlistDrop.classList.add('is-dragover')};
playlistDrop.ondragleave=()=>playlistDrop.classList.remove('is-dragover');
playlistDrop.ondrop=e=>{e.preventDefault();playlistDrop.classList.remove('is-dragover');const file=e.dataTransfer.files[0];if(!file)return;const transfer=new DataTransfer();transfer.items.add(file);$('#playlistFile').files=transfer.files;$('#playlistFile').dispatchEvent(new Event('change',{bubbles:true}))};
$('#playlistFile').addEventListener('change',()=>{$('#playlistFileName').textContent=$('#playlistFile').files[0]?.name||''});

function updateLogoPreview(path,name=logoPickerChannel?.name||'',candidate=false){
 const stage=$('#logoPreviewStage');stage.replaceChildren();
 window.M3UI18n.setText($('#logoPreviewLabel'),t(candidate?'uiLogoPreview':'uiCurrentLogo'));
 $('#logoPreviewName').textContent=name;
 const source=$('#logoPreviewSource');source.replaceChildren();
 if(!path)source.append(el('span',t('uiLogoPreviewEmpty')));
 else{
  let local=false;
  try{const u=new URL(path,location.href);local=u.origin===location.origin&&u.pathname.startsWith('/logo/')}catch{}
  if(candidate||local)source.append(el('span',t('uiLogoInLibrary')));
  else if(/^https?:\/\//i.test(path))source.append(el('span',t('uiLogoFromLink')),el('span',path,'logo-source-url'));
  else source.append(el('span',t('uiLogoLocal')));
 }
 const empty=el('span',t(path?'uiLogoPreviewError':'uiLogoPreviewEmpty'),'logo-preview-empty');
 if(!path){stage.append(empty);return}
 const image=el('img');image.alt=name;image.referrerPolicy='no-referrer';
 image.onerror=()=>{image.remove();stage.append(empty)};
 image.src=path;stage.append(image);
}
$('#logoGrid').addEventListener('mouseleave',()=>updateLogoPreview(logoPickerChannel?.logo,logoPickerChannel?.name));
$('#logoGrid').addEventListener('focusout',e=>{if(!$('#logoGrid').contains(e.relatedTarget))updateLogoPreview(logoPickerChannel?.logo,logoPickerChannel?.name)});
