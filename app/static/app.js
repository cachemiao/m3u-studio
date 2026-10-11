'use strict';
const $=s=>document.querySelector(s), el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)window.M3UI18n.setText(n,text);if(cls)n.className=cls;return n};
let state, selected, group='', dirty=false, editing=null, uploadTarget=null, dragId=null, authMode='login', username='', sidebarDrag=null;
const core=AliceEditorCore, draftHistory=core.createHistory();
let publishedFingerprint='', selectedChannels=new Set(), selectionList=null, visibleChannels=[], logoLibrary=null, batchContext=null, batchCandidate=null, logoContext=null, logoMatches=[];
const current=()=>state?.lists.find(x=>x.id===selected), uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function toast(message){window.M3UI18n.setText($('#toast'),message);$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',5000)}
async function api(path,options={}){const r=await fetch(path,{...options,headers:{'X-IPTV-Request':'1','Accept-Language':window.M3UI18n.locale,...options.headers}});const data=await r.json();if(!r.ok){if(r.status===401&&!path.startsWith('/api/auth/'))showAuth(false);const error=Error(data.error||String(t("m1")));error.status=r.status;error.data=data;throw error;}return data}
const json=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function changed(){draftHistory.record(state);syncDirty();render()}
function syncDirty(){dirty=core.fingerprint(state)!==publishedFingerprint;window.M3UI18n.setText($('#status'),window.M3UI18n.dynamic(()=>dirty?t("m2"):t("m3")));$('#undo').disabled=!draftHistory.canUndo;$('#redo').disabled=!draftHistory.canRedo}
function applyContent(content){state.lists=content.lists;state.epg=content.epg;if(!current())selected=state.lists[0]?.id;if(!current()?.groups.includes(group))group='';syncDirty();render()}
function button(text,action,cls){const n=el('button',text,cls);n.type='button';n.onclick=action;return n}
function render(){if(!state)return;const list=current();$('#lists').replaceChildren();state.lists.forEach(x=>{const row=el('div',undefined,'nav-item'+(x.id===selected?' active':''));row.append(button(x.name,()=>{selected=x.id;group='';render()}));bindSidebarDrag(row,'list',x.id);$('#lists').append(row)});
$('#groups').replaceChildren();if(list){const all=el('div',undefined,'nav-item'+(!group?' active':''));all.append(button(t("m4"),()=>{group='';render()}));$('#groups').append(all);list.groups.forEach(g=>{const row=el('div',undefined,'nav-item'+(group===g?' active':''));row.dataset.group=g;row.append(button(g,()=>{group=g;render()}),button('✎',()=>{const name=prompt(t("m5"),g);if(!name||name===g)return;if(list.groups.includes(name))return toast(t("m6"));list.groups[list.groups.indexOf(g)]=name;list.channels.forEach(ch=>{if(ch.group===g)ch.group=name});if(group===g)group=name;changed()},'small'),button('×',()=>{if(list.channels.some(c=>c.group===g))return toast(t("m7"));if(!confirm(t("m8")+g+(window.M3UI18n.language==='zh'?'？':'?')))return;list.groups=list.groups.filter(x=>x!==g);group='';changed()},'small'));
bindSidebarDrag(row,'group',g);$('#groups').append(row)})}
window.M3UI18n.setText($('#title'),window.M3UI18n.dynamic(()=>list?list.name:t("m9")));window.M3UI18n.setText($('#count'),window.M3UI18n.dynamic(()=>list?t("m10",{p0:(list.channels.length),p1:(list.groups.length)}):''));
for(const id of ['#add','#import','#newGroup','#listSettings'])$(id).disabled=!list;
$('#channels').replaceChildren();const query=$('#search').value.trim().toLowerCase();let channels=list?list.groups.flatMap(g=>list.channels.filter(c=>c.group===g)):[];channels=channels.filter(c=>(!group||c.group===group)&&[c.name,c.url,c.epg_id].some(x=>x.toLowerCase().includes(query)));$('#empty').hidden=!!channels.length;window.M3UI18n.setText($('#empty'),window.M3UI18n.dynamic(()=>query?t("m11"):group?t("m12"):t("m13")));
visibleChannels=channels;if(selectionList!==selected){selectedChannels.clear();selectionList=selected}const existing=new Set(list?.channels.map(c=>c.id)||[]);selectedChannels=new Set([...selectedChannels].filter(id=>existing.has(id)));updateSelection();
channels.forEach(ch=>{const row=el('article',undefined,'channel');row.dataset.id=ch.id;const check=el('input');check.type='checkbox';check.className='channel-select';window.M3UI18n.setAttribute(check,'aria-label',window.M3UI18n.dynamic(()=>t("m14")+ch.name));check.checked=selectedChannels.has(ch.id);check.onchange=()=>{if(check.checked)selectedChannels.add(ch.id);else selectedChannels.delete(ch.id);updateSelection()};const handle=el('span','⠿','handle');handle.draggable=!query;window.M3UI18n.setAttribute(handle,'title',window.M3UI18n.dynamic(()=>query?t("m15"):t("m16")));handle.ondragstart=e=>{sidebarDrag=null;dragId=ch.id;e.dataTransfer.setData('text/plain',ch.id)};handle.ondragend=()=>{dragId=null;clearDragMarks()};bindTouchDrag(handle,ch.id,!query);
row.ondragover=e=>{if(dragId&&!query){e.preventDefault();row.classList.add('dragover')}};row.ondragleave=()=>row.classList.remove('dragover');row.ondrop=e=>{e.preventDefault();if(query)return;const box=row.getBoundingClientRect();relocate(dragId,ch.id,ch.group,e.clientY>box.top+box.height/2);dragId=null;clearDragMarks()};
const logo=button('',()=>{openLogoPicker({listId:selected,channelId:ch.id},ch)},'logo');window.M3UI18n.setAttribute(logo,'title',window.M3UI18n.dynamic(()=>t("m17")));window.M3UI18n.setAttribute(logo,'aria-label',window.M3UI18n.dynamic(()=>t("m18")+ch.name));if(ch.logo){const img=el('img');img.src=ch.logo;img.alt=ch.name;img.onerror=()=>{img.hidden=true;logo.append(el('small',t("m19")))};logo.append(img)}else window.M3UI18n.setText(logo,'＋Logo');
const info=el('div');const title=el('div',ch.name,'channel-title');title.append(el('span',ch.group,'pill'));if(ch.catchup_url)title.append(el('span',t("m20"),'pill replay'));if(ch.fcc_url)title.append(el('span','FCC','pill fcc'));const stream=el('div',ch.url,'stream');window.M3UI18n.setAttribute(stream,'title',ch.url);info.append(title,stream);
const actions=el('div',undefined,'actions');actions.append(button(t("m21"),()=>openEditor(ch)),button(t("m22"),()=>{if(confirm(t("m23")+ch.name+(window.M3UI18n.language==='zh'?'？':'?'))){list.channels=list.channels.filter(c=>c.id!==ch.id);changed()}},'danger'));row.append(check,handle,logo,info,actions);$('#channels').append(row)})}
function clearDragMarks(){document.querySelectorAll('.dragover,.touch-dragging').forEach(n=>n.classList.remove('dragover','touch-dragging'))}
function relocate(id,targetId,targetGroup,after=false){const list=current();const moved=list?.channels.find(c=>c.id===id);if(!moved||id===targetId)return;const target=list.channels.find(c=>c.id===targetId);if(!target&&!list.groups.includes(targetGroup))return;list.channels=list.channels.filter(c=>c!==moved);moved.group=target?target.group:targetGroup;if(target)list.channels.splice(list.channels.indexOf(target)+(after?1:0),0,moved);else list.channels.push(moved);changed()}
function bindTouchDrag(handle,id,enabled){
 let active=false,target=null,frame=null,lastY=0;
 function stop(){active=false;cancelAnimationFrame(frame);clearDragMarks()}
 function autoScroll(){if(!active)return;const box=$('#channelScroll').getBoundingClientRect();let speed=lastY<box.top+50?-10:lastY>box.bottom-50?10:0;$('#channelScroll').scrollTop+=speed;frame=requestAnimationFrame(autoScroll)}
 handle.onpointerdown=e=>{if(!enabled||e.pointerType==='mouse')return;e.preventDefault();active=true;lastY=e.clientY;handle.setPointerCapture?.(e.pointerId);handle.closest('.channel').classList.add('touch-dragging');target=null;frame=requestAnimationFrame(autoScroll)};
 handle.onpointermove=e=>{if(!active)return;e.preventDefault();lastY=e.clientY;clearDragMarks();handle.closest('.channel')?.classList.add('touch-dragging');const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.channel,.nav-item');target=null;if(hit?.dataset.id&&hit.dataset.id!==id){const box=hit.getBoundingClientRect();target={id:hit.dataset.id,after:e.clientY>box.top+box.height/2};hit.classList.add('dragover')}else if(hit?.dataset.group){target={group:hit.dataset.group};hit.classList.add('dragover')}};
 handle.onpointerup=e=>{if(!active)return;e.preventDefault();const drop=target;stop();if(drop)relocate(id,drop.id,drop.group,drop.after)};
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
 row.ondrop=e=>{e.preventDefault();const nav=sidebarDrag,channel=dragId;sidebarDrag=null;dragId=null;clearDragMarks();if(nav?.kind===kind)reorderSidebar(kind,nav.id,id,sidebarAfter(row,e.clientX,e.clientY));else if(channel&&kind==='group')relocate(channel,null,id)};
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
$('#newList').onclick=()=>{const name=prompt(t("m29"));if(!name?.trim())return;const list={id:uid(),name:name.trim(),enabled:true,epg:'',groups:[String(t("m30")),String(t("m31"))],channels:[]};state.lists.push(list);selected=list.id;group='';changed()};
$('#newGroup').onclick=()=>{const name=prompt(t("m32"));if(!name?.trim())return;if(current().groups.includes(name.trim()))return toast(t("m6"));current().groups.push(name.trim());changed()};
$('#add').onclick=()=>openEditor();$('#search').oninput=render;
$('#save').onclick=async()=>{const btn=$('#save');btn.disabled=true;const submitted=core.clone(state), sent=core.fingerprint(submitted);try{const result=await api('/api/state',json('PUT',submitted));state.revision=result.revision;publishedFingerprint=core.fingerprint(result.state);if(core.fingerprint(state)===sent){state.lists=result.state.lists;state.epg=result.state.epg;draftHistory.record(state)}syncDirty();render();toast(dirty?t("m33"):t("m34"))}catch(err){toast(window.M3UI18n.error(err.message))}finally{btn.disabled=false}};
$('#import').onclick=()=>{$('#playlistText').value='';$('#playlistFile').value='';$('#replaceImport').checked=false;$('#importDialog').showModal()};$('#playlistFile').onchange=async e=>{const file=e.target.files[0];if(file)$('#playlistText').value=await file.text()};
$('#importForm').onsubmit=async e=>{e.preventDefault();try{const parsed=await api('/api/import',json('POST',{text:$('#playlistText').value}));const list=current();if($('#replaceImport').checked){if(!confirm(t("m35")))return;list.channels=parsed.channels;list.groups=parsed.groups}else{list.channels.push(...parsed.channels);list.groups=[...new Set([...list.groups,...parsed.groups])]};if(parsed.epg)list.epg=parsed.epg;$('#importDialog').close();changed();toast(t("m36",{p0:(parsed.channels.length)}))}catch(err){toast(window.M3UI18n.error(err.message))}};
$('#pickLogo').onclick=()=>openLogoPicker({editor:true},{name:$('#channelForm').elements.name.value,epg_id:$('#channelForm').elements.epg_id.value,logo:$('#channelForm').elements.logo.value});
$('#logoFile').onchange=async e=>{
 const file=e.target.files[0],target=logoPickerContext;if(!file||!target)return;$('#uploadLogoButton').disabled=true;
 try{const result=await uploadLibraryLogo(file);if(result){await refreshLogoLibrary();render();if($('#logosDialog').open&&logoPickerContext===target){applyLogoChoice(result.path,target);toast(t("m37"))}}}
 catch(err){toast(window.M3UI18n.error(err.message))}finally{$('#uploadLogoButton').disabled=false;e.target.value=''}
};
$('#settings').onclick=()=>{$('#globalEpg').value=state.epg;$('#links').replaceChildren();const add=(label,path)=>{const a=el('a',state.base_url+path);a.href=state.base_url+path;a.target='_blank';a.rel='noopener';const row=el('div',undefined,'subscription-row'),copy=button(t("m38"),()=>copySubscription(a.href));window.M3UI18n.setAttribute(copy,'aria-label',window.M3UI18n.dynamic(()=>t("m39")+label+t("m40")));row.append(a,copy);$('#links').append(el('strong',label),row)};add(t("m41"),'/tv.m3u');add(t("m42"),'/tv.txt');state.lists.forEach(list=>{add(window.M3UI18n.dynamic(()=>list.name+t("m43",{p0:(list.channels.length)})),list.slug?`/${list.slug}.m3u`:`/lists/${list.id}/tv.m3u`);add(window.M3UI18n.dynamic(()=>list.name+t("m44",{p0:(list.channels.length)})),list.slug?`/${list.slug}.txt`:`/lists/${list.id}/tv.txt`)});$('#settingsDialog').showModal()};$('#settingsForm').onsubmit=e=>{e.preventDefault();state.epg=$('#globalEpg').value.trim();$('#settingsDialog').close();changed()};
$('#listSettings').onclick=()=>{const list=current();$('#listName').value=list.name;$('#listSlug').value=list.slug||'';$('#listEpg').value=list.epg;$('#listEnabled').checked=list.enabled;window.M3UI18n.setText($('#listId'),window.M3UI18n.dynamic(()=>t("m45")+list.id+t("m46")));$('#listDialog').showModal()};$('#listForm').onsubmit=e=>{e.preventDefault();const slug=$('#listSlug').value.trim().toLowerCase();if(slug&&(!/^[a-z0-9][a-z0-9_-]{0,23}$/.test(slug)||['tv','api','static','logo','lists','healthz'].includes(slug)))return toast(t("m47"));if(slug&&state.lists.some(list=>list.id!==selected&&(list.slug||'').toLowerCase()===slug))return toast(t("m48"));Object.assign(current(),{slug,name:$('#listName').value.trim(),epg:$('#listEpg').value.trim(),enabled:$('#listEnabled').checked});$('#listDialog').close();changed()};$('#deleteList').onclick=()=>{if(!confirm(t("m49")))return;state.lists=state.lists.filter(l=>l.id!==selected);selected=state.lists[0]?.id;group='';$('#listDialog').close();changed()};
$('#backup').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=el('a');a.href=URL.createObjectURL(blob);a.download='iptv-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast(t("m50"))};
$('#restore').onclick=()=>$('#restoreFile').click();$('#restoreFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const raw=JSON.parse(await file.text());if(!Array.isArray(raw.lists))throw Error(t("m51"));if(!confirm(t("m52")))return;state.lists=raw.lists;state.epg=raw.epg||'';selected=state.lists[0]?.id;group='';$('#preferencesDialog').close();changed()}catch(err){toast(window.M3UI18n.error(err.message))}e.target.value=''};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
function showAuth(setup){authMode=setup?'setup':'login';$('#appShell').hidden=true;$('#authScreen').hidden=false;window.M3UI18n.setText($('#authTitle'),window.M3UI18n.dynamic(()=>setup?t("m53"):t("m54")));window.M3UI18n.setText($('#authHint'),window.M3UI18n.dynamic(()=>setup?t("m55"):t("m56")));window.M3UI18n.setText($('#authSubmit'),window.M3UI18n.dynamic(()=>setup?t("m57"):t("m58")));$('#confirmLabel').hidden=!setup;const fields=$('#authForm').elements;fields.password.minLength=setup?8:0;fields.password.autocomplete=setup?'new-password':'current-password';fields.confirm_password.required=setup;fields.password.value='';fields.confirm_password.value='';window.M3UI18n.setText($('#authError'),'')}
async function loadWorkspace(){if(!dirty||!state){state=await api('/api/state');publishedFingerprint=core.fingerprint(state);draftHistory.reset(state);selectedChannels.clear();selected=state.lists[0]?.id;group=''}$('#authScreen').hidden=true;$('#appShell').hidden=false;window.M3UI18n.setText($('#status'),window.M3UI18n.dynamic(()=>dirty?t("m2"):t("m59")));render()}
$('#authForm').onsubmit=async e=>{e.preventDefault();const f=e.target.elements;if(authMode==='setup'&&f.password.value!==f.confirm_password.value){window.M3UI18n.setText($('#authError'),window.M3UI18n.dynamic(()=>t("m60")));return}$('#authSubmit').disabled=true;try{const result=await api('/api/auth/'+authMode,json('POST',{username:f.username.value,password:f.password.value}));username=result.username;f.password.value='';f.confirm_password.value='';await loadWorkspace()}catch(err){window.M3UI18n.setText($('#authError'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))}finally{$('#authSubmit').disabled=false}};
$('#logout').onclick=async()=>{if(dirty&&!confirm(t("m61")))return;try{await api('/api/auth/logout',json('POST',{}));state=null;dirty=false;selectedChannels.clear();publishedFingerprint='';showAuth(false)}catch(err){toast(window.M3UI18n.error(err.message))}};
$('#preferences').onclick=()=>$('#preferencesDialog').showModal();
$('#accountSettings').onclick=()=>{const form=$('#accountForm');form.reset();form.elements.username.value=username;$('#accountDialog').showModal()};
$('#accountForm').onsubmit=async e=>{e.preventDefault();const form=e.target;if(form.elements.password.value!==form.elements.confirm_password.value)return toast(t("m62"));try{const result=await api('/api/auth/account',json('PUT',Object.fromEntries(new FormData(form))));username=result.username;form.reset();$('#accountDialog').close();toast(t("m63"))}catch(err){toast(window.M3UI18n.error(err.message))}};
function updateSelection(){
 const all=visibleChannels.length>0&&visibleChannels.every(ch=>selectedChannels.has(ch.id));
 $('#selectVisible').checked=all;$('#selectVisible').indeterminate=!all&&visibleChannels.some(ch=>selectedChannels.has(ch.id));$('#selectVisible').disabled=!visibleChannels.length;
 window.M3UI18n.setText($('#selectionCount'),window.M3UI18n.dynamic(()=>t("m64",{p0:(selectedChannels.size)})));$('#clearSelection').disabled=!selectedChannels.size;$('#batchEdit').disabled=!selectedChannels.size;$('#autoLogo').disabled=!(selectedChannels.size||visibleChannels.length);
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
function invalidateBatch(){batchCandidate=null;$('#batchApply').disabled=true;$('#batchPreview').replaceChildren();window.M3UI18n.setText($('#batchMessage'),window.M3UI18n.dynamic(()=>t("m66")))}
function batchInputFingerprint(){return JSON.stringify({group:$('#batchGroup').value,epg:$('#batchEpg').value,fcc:$('#batchFcc').value,from:$('#replaceFrom').value,to:$('#replaceTo').value,toggles:batchControls.map(([id])=>$('#'+id).checked),live:$('#replaceLive').checked,catchup:$('#replaceCatchup').checked})}
const batchControls=[['changeGroup',['batchGroup']],['changeEpg',['batchEpg']],['changeFcc',['batchFcc']],['changeReplace',['replaceFrom','replaceTo','replaceLive','replaceCatchup']]];
for(const [toggle,fields] of batchControls)$('#'+toggle).onchange=()=>{fields.forEach(id=>$('#'+id).disabled=!$('#'+toggle).checked);invalidateBatch()};
$('#batchForm').addEventListener('input',invalidateBatch);
$('#batchEdit').onclick=()=>{
 batchContext={listId:selected,ids:[...selectedChannels],fingerprint:core.fingerprint(state)};$('#batchForm').reset();batchControls.forEach(([toggle,fields])=>fields.forEach(id=>$('#'+id).disabled=true));
 $('#batchGroup').replaceChildren(...current().groups.map(g=>{const o=el('option',g);o.value=g;return o}));window.M3UI18n.setText($('#batchScope'),window.M3UI18n.dynamic(()=>t("m67",{p0:(current().name),p1:(batchContext.ids.length)})));invalidateBatch();$('#batchDialog').showModal();
};
$('#batchForm').onsubmit=async e=>{
 e.preventDefault();invalidateBatch();const changes={},inputFingerprint=batchInputFingerprint(),context=batchContext;
 if($('#changeGroup').checked)changes.group=$('#batchGroup').value;
 if($('#changeEpg').checked)changes.epg=$('#batchEpg').value.trim();
 if($('#changeFcc').checked)changes.fcc_url=$('#batchFcc').value.trim();
 if($('#changeReplace').checked){const fields=[];if($('#replaceLive').checked)fields.push('url');if($('#replaceCatchup').checked)fields.push('catchup_url');if(!fields.length)return toast(t("m68"));changes.replace={from:$('#replaceFrom').value,to:$('#replaceTo').value,fields}}
 if(!Object.keys(changes).length)return toast(t("m69"));
 const btn=$('#batchPreviewButton');btn.disabled=true;
 try{
  if(core.fingerprint(state)!==batchContext.fingerprint)throw Error(t("m70"));
  const {draft,count}=core.batchEdit(state,batchContext.listId,batchContext.ids,changes);
  if(!count){window.M3UI18n.setText($('#batchMessage'),window.M3UI18n.dynamic(()=>t("m71")));return}
  const checked=await api('/api/validate',json('POST',draft));
  if(!$('#batchDialog').open||batchContext!==context)return;
  // Form input while validation was pending makes the returned preview stale.
  if(inputFingerprint!==batchInputFingerprint()){toast(t("m72"));return}
  batchCandidate=checked;const before=current(),beforeById=new Map(before.channels.map(ch=>[ch.id,ch])),ids=new Set(batchContext.ids),after=checked.lists.find(l=>l.id===batchContext.listId);let displayed=0;
  for(const ch of after.channels){const old=beforeById.get(ch.id);if(!ids.has(ch.id)||!['group','epg','fcc_url','url','catchup_url'].some(key=>old[key]!==ch[key]))continue;if(displayed++>=100)continue;
   const descriptions=()=>{const lines=[];for(const key of ['group','epg','fcc_url','url','catchup_url'])if(old[key]!==ch[key])lines.push(`${({group:t("m73"),epg:'EPG',fcc_url:'FCC',url:t("m74"),catchup_url:t("m20")})[key]}${window.M3UI18n.language==='zh'?'：':': '}${maskUrl(old[key])||t("m75")} → ${maskUrl(ch[key])||t("m75")}`);
   return lines.join('\n')};
   $('#batchPreview').append(previewRow(ch.name,window.M3UI18n.dynamic(descriptions)));
  }
  window.M3UI18n.setText($('#batchMessage'),window.M3UI18n.dynamic(()=>t("m77",{p0:(count),p1:(displayed>100?t("m76"):'')})));$('#batchApply').disabled=false;
 }catch(err){toast(window.M3UI18n.error(err.message))}finally{btn.disabled=false}
};
$('#batchApply').onclick=()=>{if(!batchCandidate)return;if(core.fingerprint(state)!==batchContext.fingerprint)return toast(t("m78"));state.lists=batchCandidate.lists;state.epg=batchCandidate.epg;$('#batchDialog').close();changed();toast(t("m79"))};
async function loadLogos(){logoLibrary=await api('/api/logos');return logoLibrary}
function libraryPaths(){return logoLibrary.logos}
let logoPickerContext=null,logoPickerChannel=null;
function selectLogoTab(kind){
 for(const [id,panel,key] of [['tabBuiltin','logoCatalogPanel','builtin'],['tabLink','logoLinkPanel','link'],['tabUpload','logoUploadPanel','upload']]){const active=key===kind;$('#'+id).setAttribute('aria-selected',String(active));$('#'+panel).hidden=!active}
}
async function openLogoPicker(context,channel){
 logoPickerContext=context;logoPickerChannel=channel;window.M3UI18n.setText($('#logoPickerTitle'),window.M3UI18n.dynamic(()=>t("m81",{p0:(channel.name||t("m80"))})));$('#logoSearch').value='';$('#logoLink').value=channel.logo?.startsWith('http')?channel.logo:'';$('#logoGrid').replaceChildren();window.M3UI18n.setText($('#logoCount'),window.M3UI18n.dynamic(()=>t("m82")));selectLogoTab('builtin');$('#logosDialog').showModal();
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
 filtered.slice(0,300).forEach(path=>{const name=core.logoName(path),b=button('',()=>applyLogoChoice(path)),img=el('img');img.src=path;img.alt=name;img.loading='lazy';img.referrerPolicy='no-referrer';window.M3UI18n.setAttribute(b,'title',name);b.append(img,el('small',name));if(path===suggestion)b.append(el('small',t("m89"),'logo-recommend'));$('#logoGrid').append(b)});
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
 if(!confirm(t("m97",{p0:(entry.name),p1:(warning)})))return;
 const path='/api/logos/'+encodeURIComponent(entry.name);
 try{await api(path,{method:'DELETE'})}catch(err){if(!err.data?.in_use)throw err;if(!confirm(t("m98",{p0:(usageText(err.data.users))})))return;await api(path+'?confirm=1',{method:'DELETE'})}
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
$('#autoLogoApply').onclick=()=>{if(core.fingerprint(state)!==logoContext.fingerprint)return toast(t("m109"));const list=state.lists.find(l=>l.id===logoContext.listId);const paths=new Map(logoMatches.map(m=>[m.id,m.path]));list.channels.forEach(ch=>{if(paths.has(ch.id))ch.logo=paths.get(ch.id)});$('#autoLogoDialog').close();changed();toast(t("m117",{p0:(logoMatches.length)}))};
function legacyCopy(text){
 const previous=document.activeElement,area=el('textarea');area.className='clipboard-helper';area.value=text;$('#settingsDialog').append(area);area.focus();area.select();
 let ok=false;try{ok=document.execCommand('copy')}finally{area.remove();previous?.focus()}return ok;
}
async function copySubscription(text){
 let copied=false;
 if(window.isSecureContext&&navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);copied=true}catch{}}
 if(!copied){try{copied=legacyCopy(text)}catch{}}
 toast(copied?t("m118"):t("m119"));
}
$('#history').onclick=async()=>{
 $('#historyEntries').replaceChildren();window.M3UI18n.setText($('#historyStatus'),window.M3UI18n.dynamic(()=>t("m120")));$('#historyDialog').showModal();
 try{const data=await api('/api/history');if(!$('#historyDialog').open)return;window.M3UI18n.setText($('#historyStatus'),window.M3UI18n.dynamic(()=>t("m121",{p0:(data.revision),p1:(data.entries.length)})));
  if(!data.entries.length)$('#historyEntries').append(el('p',t("m122"),'hint'));
  data.entries.forEach(entry=>{const row=previewRow(window.M3UI18n.dynamic(()=>`v${entry.revision}${entry.revision===data.revision-1?t("m123"):''}`),window.M3UI18n.dynamic(()=>t("m124",{p0:(new Date(entry.created_at).toLocaleString(window.M3UI18n.locale)),p1:(entry.lists),p2:(entry.channels)}))),restore=button(t("m125"),async()=>{
   if(!confirm(t("m127",{p0:(entry.revision),p1:(dirty?t("m126"):'')})))return;
   restore.disabled=true;try{const snapshot=await api('/api/history/'+entry.revision);state.lists=snapshot.state.lists;state.epg=snapshot.state.epg;selected=state.lists[0]?.id;group='';selectedChannels.clear();$('#historyDialog').close();$('#preferencesDialog').close();changed();toast(t("m128",{p0:(entry.revision)}))}catch(err){toast(window.M3UI18n.error(err.message))}finally{restore.disabled=false}
  });row.append(restore);$('#historyEntries').append(row)});
 }catch(err){window.M3UI18n.setText($('#historyStatus'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))}
};
api('/api/auth/status').then(async data=>{username=data.username;if(data.authenticated)await loadWorkspace();else showAuth(!data.initialized)}).catch(err=>{showAuth(false);window.M3UI18n.setText($('#authError'),window.M3UI18n.dynamic(()=>window.M3UI18n.error(err.message)))});

window.addEventListener('m3u-language-change',()=>{if(state){render();if(logoLibrary&&$('#logoManagerDialog').open)renderLogoManager();if(logoLibrary&&$('#logosDialog').open)renderLogoPicker();if(logoContext&&$('#autoLogoDialog').open)renderAutoLogos();}});
