'use strict';
const $=s=>document.querySelector(s), el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
let state, selected, group='', dirty=false, editing=null, uploadTarget=null, dragId=null, authMode='login', username='', sidebarDrag=null;
const core=AliceEditorCore, draftHistory=core.createHistory();
let publishedFingerprint='', selectedChannels=new Set(), selectionList=null, visibleChannels=[], logoLibrary=null, batchContext=null, batchCandidate=null, logoContext=null, logoMatches=[];
const current=()=>state?.lists.find(x=>x.id===selected), uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',5000)}
async function api(path,options={}){const r=await fetch(path,{...options,headers:{'X-IPTV-Request':'1',...options.headers}});const data=await r.json();if(!r.ok){if(r.status===401&&!path.startsWith('/api/auth/'))showAuth(false);const error=Error(data.error||'请求失败');error.status=r.status;error.data=data;throw error;}return data}
const json=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function changed(){draftHistory.record(state);syncDirty();render()}
function syncDirty(){dirty=core.fingerprint(state)!==publishedFingerprint;$('#status').textContent=dirty?'有未保存更改':'已保存';$('#undo').disabled=!draftHistory.canUndo;$('#redo').disabled=!draftHistory.canRedo}
function applyContent(content){state.lists=content.lists;state.epg=content.epg;if(!current())selected=state.lists[0]?.id;if(!current()?.groups.includes(group))group='';syncDirty();render()}
function button(text,action,cls){const n=el('button',text,cls);n.type='button';n.onclick=action;return n}
function render(){if(!state)return;const list=current();$('#lists').replaceChildren();state.lists.forEach(x=>{const row=el('div',undefined,'nav-item'+(x.id===selected?' active':''));row.append(button(x.name,()=>{selected=x.id;group='';render()}));bindSidebarDrag(row,'list',x.id);$('#lists').append(row)});
$('#groups').replaceChildren();if(list){const all=el('div',undefined,'nav-item'+(!group?' active':''));all.append(button('全部频道',()=>{group='';render()}));$('#groups').append(all);list.groups.forEach(g=>{const row=el('div',undefined,'nav-item'+(group===g?' active':''));row.dataset.group=g;row.append(button(g,()=>{group=g;render()}),button('✎',()=>{const name=prompt('重命名分组',g);if(!name||name===g)return;if(list.groups.includes(name))return toast('分组已存在');list.groups[list.groups.indexOf(g)]=name;list.channels.forEach(ch=>{if(ch.group===g)ch.group=name});if(group===g)group=name;changed()},'small'),button('×',()=>{if(list.channels.some(c=>c.group===g))return toast('请先移动或删除此分组的频道');if(!confirm('删除空分组 '+g+'？'))return;list.groups=list.groups.filter(x=>x!==g);group='';changed()},'small'));
bindSidebarDrag(row,'group',g);$('#groups').append(row)})}
$('#title').textContent=list?list.name:'创建你的频道列表';$('#count').textContent=list?`${list.channels.length} 个频道 · ${list.groups.length} 个分组`:'';
for(const id of ['#add','#import','#newGroup','#listSettings'])$(id).disabled=!list;
$('#channels').replaceChildren();const query=$('#search').value.trim().toLowerCase();let channels=list?list.groups.flatMap(g=>list.channels.filter(c=>c.group===g)):[];channels=channels.filter(c=>(!group||c.group===group)&&[c.name,c.url,c.epg_id].some(x=>x.toLowerCase().includes(query)));$('#empty').hidden=!!channels.length;$('#empty').textContent=query?'没有匹配的频道，请调整或清空搜索。':group?'此分组还没有频道。':'从创建列表、导入频道开始。';
visibleChannels=channels;if(selectionList!==selected){selectedChannels.clear();selectionList=selected}const existing=new Set(list?.channels.map(c=>c.id)||[]);selectedChannels=new Set([...selectedChannels].filter(id=>existing.has(id)));updateSelection();
channels.forEach(ch=>{const row=el('article',undefined,'channel');row.dataset.id=ch.id;const check=el('input');check.type='checkbox';check.className='channel-select';check.setAttribute('aria-label','选择频道 '+ch.name);check.checked=selectedChannels.has(ch.id);check.onchange=()=>{if(check.checked)selectedChannels.add(ch.id);else selectedChannels.delete(ch.id);updateSelection()};const handle=el('span','⠿','handle');handle.draggable=!query;handle.title=query?'清空搜索后可拖拽排序':'拖拽排序或拖到分组';handle.ondragstart=e=>{sidebarDrag=null;dragId=ch.id;e.dataTransfer.setData('text/plain',ch.id)};handle.ondragend=()=>{dragId=null;clearDragMarks()};bindTouchDrag(handle,ch.id,!query);
row.ondragover=e=>{if(dragId&&!query){e.preventDefault();row.classList.add('dragover')}};row.ondragleave=()=>row.classList.remove('dragover');row.ondrop=e=>{e.preventDefault();if(query)return;const box=row.getBoundingClientRect();relocate(dragId,ch.id,ch.group,e.clientY>box.top+box.height/2);dragId=null;clearDragMarks()};
const logo=button('',()=>{openLogoPicker({listId:selected,channelId:ch.id},ch)},'logo');logo.title='选择台标：台标库、上传或链接';logo.setAttribute('aria-label','选择台标 '+ch.name);if(ch.logo){const img=el('img');img.src=ch.logo;img.alt=ch.name;img.onerror=()=>{img.hidden=true;logo.append(el('small','选择台标'))};logo.append(img)}else logo.textContent='＋Logo';
const info=el('div');const title=el('div',ch.name,'channel-title');title.append(el('span',ch.group,'pill'));if(ch.catchup_url)title.append(el('span','回放','pill replay'));if(ch.fcc_url)title.append(el('span','FCC','pill fcc'));const stream=el('div',ch.url,'stream');stream.title=ch.url;info.append(title,stream);
const actions=el('div',undefined,'actions');actions.append(button('编辑',()=>openEditor(ch)),button('删除',()=>{if(confirm('删除频道 '+ch.name+'？')){list.channels=list.channels.filter(c=>c.id!==ch.id);changed()}},'danger'));row.append(check,handle,logo,info,actions);$('#channels').append(row)})}
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
 row.dataset.kind=kind;row.dataset.key=id;const handle=el('span','⠿','nav-handle');handle.title=kind==='list'?'拖拽调整列表顺序':'拖拽调整分组顺序';handle.draggable=true;row.prepend(handle);
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
function openEditor(ch){const list=current();if(!list.groups.length)return toast('请先新建分组');editing=ch?.id||null;$('#editorTitle').textContent=ch?'编辑频道':'添加频道';const form=$('#channelForm');form.reset();form.elements.group.replaceChildren(...list.groups.map(g=>{const o=el('option',g);o.value=g;return o}));const values=ch||{group:group||list.groups[0],days:7,catchup:'default'};for(const key of ['name','group','logo','url','fcc_url','catchup_url','catchup','days','epg_id','epg'])form.elements[key].value=values[key]??'';$('#editor').showModal()}
$('#channelForm').onsubmit=e=>{e.preventDefault();const ch=Object.fromEntries(new FormData(e.target));ch.id=editing||uid();ch.days=Number(ch.days);const list=current();if(editing)list.channels[list.channels.findIndex(c=>c.id===editing)]=ch;else list.channels.push(ch);$('#editor').close();changed()};
$('#newList').onclick=()=>{const name=prompt('新列表名称，例如：内蒙古联通');if(!name?.trim())return;const list={id:uid(),name:name.trim(),enabled:true,epg:'',groups:['央视','卫视'],channels:[]};state.lists.push(list);selected=list.id;group='';changed()};
$('#newGroup').onclick=()=>{const name=prompt('新分组名称');if(!name?.trim())return;if(current().groups.includes(name.trim()))return toast('分组已存在');current().groups.push(name.trim());changed()};
$('#add').onclick=()=>openEditor();$('#search').oninput=render;
$('#save').onclick=async()=>{const btn=$('#save');btn.disabled=true;const submitted=core.clone(state), sent=core.fingerprint(submitted);try{const result=await api('/api/state',json('PUT',submitted));state.revision=result.revision;publishedFingerprint=core.fingerprint(result.state);if(core.fingerprint(state)===sent){state.lists=result.state.lists;state.epg=result.state.epg;draftHistory.record(state)}syncDirty();render();toast(dirty?'已发布提交的版本；新的编辑仍待保存':'订阅已更新，发布前版本已加入历史')}catch(err){toast(err.message)}finally{btn.disabled=false}};
$('#import').onclick=()=>{$('#playlistText').value='';$('#playlistFile').value='';$('#replaceImport').checked=false;$('#importDialog').showModal()};$('#playlistFile').onchange=async e=>{const file=e.target.files[0];if(file)$('#playlistText').value=await file.text()};
$('#importForm').onsubmit=async e=>{e.preventDefault();try{const parsed=await api('/api/import',json('POST',{text:$('#playlistText').value}));const list=current();if($('#replaceImport').checked){if(!confirm('替换当前列表所有频道？'))return;list.channels=parsed.channels;list.groups=parsed.groups}else{list.channels.push(...parsed.channels);list.groups=[...new Set([...list.groups,...parsed.groups])]};if(parsed.epg)list.epg=parsed.epg;$('#importDialog').close();changed();toast(`已导入 ${parsed.channels.length} 个频道，请保存发布`)}catch(err){toast(err.message)}};
$('#pickLogo').onclick=()=>openLogoPicker({editor:true},{name:$('#channelForm').elements.name.value,epg_id:$('#channelForm').elements.epg_id.value,logo:$('#channelForm').elements.logo.value});
$('#logoFile').onchange=async e=>{
 const file=e.target.files[0],target=logoPickerContext;if(!file||!target)return;$('#uploadLogoButton').disabled=true;
 try{const result=await uploadLibraryLogo(file);if(result){await refreshLogoLibrary();render();if($('#logosDialog').open&&logoPickerContext===target){applyLogoChoice(result.path,target);toast('已加入台标库并应用到草稿，保存发布后更新频道绑定')}}}
 catch(err){toast(err.message)}finally{$('#uploadLogoButton').disabled=false;e.target.value=''}
};
$('#settings').onclick=()=>{$('#globalEpg').value=state.epg;$('#links').replaceChildren();const add=(label,path)=>{const a=el('a',state.base_url+path);a.href=state.base_url+path;a.target='_blank';a.rel='noopener';const row=el('div',undefined,'subscription-row'),copy=button('复制',()=>copySubscription(a.href));copy.setAttribute('aria-label','复制 '+label+' 订阅地址');row.append(a,copy);$('#links').append(el('strong',label),row)};add('合并 M3U','/tv.m3u');add('合并 TXT','/tv.txt');state.lists.forEach(list=>{add(list.name+` · ${list.channels.length} 个频道 · M3U`,list.slug?`/${list.slug}.m3u`:`/lists/${list.id}/tv.m3u`);add(list.name+` · ${list.channels.length} 个频道 · TXT`,list.slug?`/${list.slug}.txt`:`/lists/${list.id}/tv.txt`)});$('#settingsDialog').showModal()};$('#settingsForm').onsubmit=e=>{e.preventDefault();state.epg=$('#globalEpg').value.trim();$('#settingsDialog').close();changed()};
$('#listSettings').onclick=()=>{const list=current();$('#listName').value=list.name;$('#listSlug').value=list.slug||'';$('#listEpg').value=list.epg;$('#listEnabled').checked=list.enabled;$('#listId').textContent='固定订阅 ID：'+list.id+'（重命名不会改变地址）';$('#listDialog').showModal()};$('#listForm').onsubmit=e=>{e.preventDefault();const slug=$('#listSlug').value.trim().toLowerCase();if(slug&&(!/^[a-z0-9][a-z0-9_-]{0,23}$/.test(slug)||['tv','api','static','logo','lists','healthz'].includes(slug)))return toast('请使用 1–24 位字母、数字、下划线或短横线，避开系统保留名称');if(slug&&state.lists.some(list=>list.id!==selected&&(list.slug||'').toLowerCase()===slug))return toast('订阅短名称已被另一套列表使用');Object.assign(current(),{slug,name:$('#listName').value.trim(),epg:$('#listEpg').value.trim(),enabled:$('#listEnabled').checked});$('#listDialog').close();changed()};$('#deleteList').onclick=()=>{if(!confirm('删除整套列表及其全部频道？保存发布后生效。'))return;state.lists=state.lists.filter(l=>l.id!==selected);selected=state.lists[0]?.id;group='';$('#listDialog').close();changed()};
$('#backup').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=el('a');a.href=URL.createObjectURL(blob);a.download='iptv-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('备份含当前草稿；台标图片和台标库设置请一并备份 data 目录')};
$('#restore').onclick=()=>$('#restoreFile').click();$('#restoreFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const raw=JSON.parse(await file.text());if(!Array.isArray(raw.lists))throw Error('备份格式错误');if(!confirm('用备份替换全部列表？应用后仍需保存发布。'))return;state.lists=raw.lists;state.epg=raw.epg||'';selected=state.lists[0]?.id;group='';$('#preferencesDialog').close();changed()}catch(err){toast(err.message)}e.target.value=''};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
function showAuth(setup){authMode=setup?'setup':'login';$('#appShell').hidden=true;$('#authScreen').hidden=false;$('#authTitle').textContent=setup?'首次使用，创建管理账号':'登录频道编辑器';$('#authHint').textContent=setup?'设置一次即可，服务器地址会自动识别。':'请输入你的管理账号。';$('#authSubmit').textContent=setup?'创建账号并进入':'登录';$('#confirmLabel').hidden=!setup;const fields=$('#authForm').elements;fields.password.minLength=setup?8:0;fields.password.autocomplete=setup?'new-password':'current-password';fields.confirm_password.required=setup;fields.password.value='';fields.confirm_password.value='';$('#authError').textContent=''}
async function loadWorkspace(){if(!dirty||!state){state=await api('/api/state');publishedFingerprint=core.fingerprint(state);draftHistory.reset(state);selectedChannels.clear();selected=state.lists[0]?.id;group=''}$('#authScreen').hidden=true;$('#appShell').hidden=false;$('#status').textContent=dirty?'有未保存更改':'已加载';render()}
$('#authForm').onsubmit=async e=>{e.preventDefault();const f=e.target.elements;if(authMode==='setup'&&f.password.value!==f.confirm_password.value){$('#authError').textContent='两次密码不一致';return}$('#authSubmit').disabled=true;try{const result=await api('/api/auth/'+authMode,json('POST',{username:f.username.value,password:f.password.value}));username=result.username;f.password.value='';f.confirm_password.value='';await loadWorkspace()}catch(err){$('#authError').textContent=err.message}finally{$('#authSubmit').disabled=false}};
$('#logout').onclick=async()=>{if(dirty&&!confirm('有未保存更改，确认退出？'))return;try{await api('/api/auth/logout',json('POST',{}));state=null;dirty=false;selectedChannels.clear();publishedFingerprint='';showAuth(false)}catch(err){toast(err.message)}};
$('#preferences').onclick=()=>$('#preferencesDialog').showModal();
$('#accountSettings').onclick=()=>{const form=$('#accountForm');form.reset();form.elements.username.value=username;$('#accountDialog').showModal()};
$('#accountForm').onsubmit=async e=>{e.preventDefault();const form=e.target;if(form.elements.password.value!==form.elements.confirm_password.value)return toast('两次新密码不一致');try{const result=await api('/api/auth/account',json('PUT',Object.fromEntries(new FormData(form))));username=result.username;form.reset();$('#accountDialog').close();toast('账号已更新')}catch(err){toast(err.message)}};
function updateSelection(){
 const all=visibleChannels.length>0&&visibleChannels.every(ch=>selectedChannels.has(ch.id));
 $('#selectVisible').checked=all;$('#selectVisible').indeterminate=!all&&visibleChannels.some(ch=>selectedChannels.has(ch.id));$('#selectVisible').disabled=!visibleChannels.length;
 $('#selectionCount').textContent=`已选 ${selectedChannels.size} 个`;$('#clearSelection').disabled=!selectedChannels.size;$('#batchEdit').disabled=!selectedChannels.size;$('#autoLogo').disabled=!(selectedChannels.size||visibleChannels.length);
 $('#undo').disabled=!draftHistory.canUndo;$('#redo').disabled=!draftHistory.canRedo;
}
$('#selectVisible').onchange=e=>{visibleChannels.forEach(ch=>{if(e.target.checked)selectedChannels.add(ch.id);else selectedChannels.delete(ch.id)});render()};
$('#clearSelection').onclick=()=>{selectedChannels.clear();render()};
$('#undo').onclick=()=>{const content=draftHistory.undo();if(content){applyContent(content);toast('已撤销；发布配置不会立即改变')}};
$('#redo').onclick=()=>{const content=draftHistory.redo();if(content)applyContent(content)};
window.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]')||!state||$('#appShell').hidden)return;
 if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('#redo'):$('#undo')).click()}
});
function previewRow(name,description){const row=el('div',undefined,'preview-row');row.append(el('strong',name),el('p',description,'hint'));return row}
const maskUrl=value=>(value||'').replace(/(\w+:\/\/)[^/@\s]+@/g,'$1••••@');
function invalidateBatch(){batchCandidate=null;$('#batchApply').disabled=true;$('#batchPreview').replaceChildren();$('#batchMessage').textContent='先预览，确认修改范围和内容后应用。'}
function batchInputFingerprint(){return JSON.stringify({group:$('#batchGroup').value,epg:$('#batchEpg').value,fcc:$('#batchFcc').value,from:$('#replaceFrom').value,to:$('#replaceTo').value,toggles:batchControls.map(([id])=>$('#'+id).checked),live:$('#replaceLive').checked,catchup:$('#replaceCatchup').checked})}
const batchControls=[['changeGroup',['batchGroup']],['changeEpg',['batchEpg']],['changeFcc',['batchFcc']],['changeReplace',['replaceFrom','replaceTo','replaceLive','replaceCatchup']]];
for(const [toggle,fields] of batchControls)$('#'+toggle).onchange=()=>{fields.forEach(id=>$('#'+id).disabled=!$('#'+toggle).checked);invalidateBatch()};
$('#batchForm').addEventListener('input',invalidateBatch);
$('#batchEdit').onclick=()=>{
 batchContext={listId:selected,ids:[...selectedChannels],fingerprint:core.fingerprint(state)};$('#batchForm').reset();batchControls.forEach(([toggle,fields])=>fields.forEach(id=>$('#'+id).disabled=true));
 $('#batchGroup').replaceChildren(...current().groups.map(g=>{const o=el('option',g);o.value=g;return o}));$('#batchScope').textContent=`${current().name} · 仅修改已选的 ${batchContext.ids.length} 个频道（包含筛选后隐藏的已选频道）`;invalidateBatch();$('#batchDialog').showModal();
};
$('#batchForm').onsubmit=async e=>{
 e.preventDefault();invalidateBatch();const changes={},inputFingerprint=batchInputFingerprint(),context=batchContext;
 if($('#changeGroup').checked)changes.group=$('#batchGroup').value;
 if($('#changeEpg').checked)changes.epg=$('#batchEpg').value.trim();
 if($('#changeFcc').checked)changes.fcc_url=$('#batchFcc').value.trim();
 if($('#changeReplace').checked){const fields=[];if($('#replaceLive').checked)fields.push('url');if($('#replaceCatchup').checked)fields.push('catchup_url');if(!fields.length)return toast('请选择要替换的地址类型');changes.replace={from:$('#replaceFrom').value,to:$('#replaceTo').value,fields}}
 if(!Object.keys(changes).length)return toast('请选择至少一项修改');
 const btn=$('#batchPreviewButton');btn.disabled=true;
 try{
  if(core.fingerprint(state)!==batchContext.fingerprint)throw Error('编辑内容已变化，请重新打开批量编辑');
  const {draft,count}=core.batchEdit(state,batchContext.listId,batchContext.ids,changes);
  if(!count){$('#batchMessage').textContent='没有频道需要修改。';return}
  const checked=await api('/api/validate',json('POST',draft));
  if(!$('#batchDialog').open||batchContext!==context)return;
  // Form input while validation was pending makes the returned preview stale.
  if(inputFingerprint!==batchInputFingerprint()){toast('预览期间选项已变化，请重新预览');return}
  batchCandidate=checked;const before=current(),beforeById=new Map(before.channels.map(ch=>[ch.id,ch])),ids=new Set(batchContext.ids),after=checked.lists.find(l=>l.id===batchContext.listId);let displayed=0;
  for(const ch of after.channels){const old=beforeById.get(ch.id);if(!ids.has(ch.id)||!['group','epg','fcc_url','url','catchup_url'].some(key=>old[key]!==ch[key]))continue;if(displayed++>=100)continue;
   const descriptions=[];for(const key of ['group','epg','fcc_url','url','catchup_url'])if(old[key]!==ch[key])descriptions.push(`${({group:'分组',epg:'EPG',fcc_url:'FCC',url:'直播',catchup_url:'回放'})[key]}：${maskUrl(old[key])||'空'} → ${maskUrl(ch[key])||'空'}`);
   $('#batchPreview').append(previewRow(ch.name,descriptions.join('\n')));
  }
  $('#batchMessage').textContent=`将修改 ${count} 个频道${displayed>100?'，下方展示前 100 个':''}；尚未应用或发布。`;$('#batchApply').disabled=false;
 }catch(err){toast(err.message)}finally{btn.disabled=false}
};
$('#batchApply').onclick=()=>{if(!batchCandidate)return;if(core.fingerprint(state)!==batchContext.fingerprint)return toast('草稿已变化，请重新预览');state.lists=batchCandidate.lists;state.epg=batchCandidate.epg;$('#batchDialog').close();changed();toast('批量修改已应用，可撤销；保存发布后生效')};
async function loadLogos(){logoLibrary=await api('/api/logos');return logoLibrary}
function libraryPaths(){return logoLibrary.logos}
let logoPickerContext=null,logoPickerChannel=null;
function selectLogoTab(kind){
 for(const [id,panel,key] of [['tabBuiltin','logoCatalogPanel','builtin'],['tabLink','logoLinkPanel','link'],['tabUpload','logoUploadPanel','upload']]){const active=key===kind;$('#'+id).setAttribute('aria-selected',String(active));$('#'+panel).hidden=!active}
}
async function openLogoPicker(context,channel){
 logoPickerContext=context;logoPickerChannel=channel;$('#logoPickerTitle').textContent=`选择台标 · ${channel.name||'新频道'}`;$('#logoSearch').value='';$('#logoLink').value=channel.logo?.startsWith('http')?channel.logo:'';$('#logoGrid').replaceChildren();$('#logoCount').textContent='正在加载图库…';selectLogoTab('builtin');$('#logosDialog').showModal();
 try{await loadLogos();if(logoPickerContext!==context||!$('#logosDialog').open)return;renderLogoPicker()}catch(err){$('#logoCount').textContent=err.message}
}
function applyLogoChoice(path,target=logoPickerContext){
 if(!target)return;
 if(target.editor){if(!$('#editor').open)return;$('#channelForm').elements.logo.value=path}
 else{const ch=state.lists.find(l=>l.id===target.listId)?.channels.find(c=>c.id===target.channelId);if(!ch)return toast('频道已不存在');if(ch.logo!==path){ch.logo=path;changed()}}
 $('#logosDialog').close();toast('台标已应用到草稿，保存并发布后生效');
}
function renderLogoPicker(){
 if(!logoLibrary||!logoPickerChannel)return;
 const query=core.normalizeName($('#logoSearch').value),paths=libraryPaths(),suggestion=core.matchLogo(logoPickerChannel,paths,logoLibrary.aliases);
 const filtered=paths.filter(path=>core.normalizeName(core.logoName(path)).includes(query)).sort((a,b)=>(a===suggestion?-1:b===suggestion?1:core.logoName(a).localeCompare(core.logoName(b),'zh-CN',{numeric:true})));
 $('#logoGrid').replaceChildren();$('#logoCount').textContent=filtered.length?`${filtered.length} 个台标${suggestion?' · 推荐项优先显示':''}${filtered.length>300?' · 显示前 300 个，请搜索缩小范围':''}`:'没有匹配的台标';
 filtered.slice(0,300).forEach(path=>{const name=core.logoName(path),b=button('',()=>applyLogoChoice(path)),img=el('img');img.src=path;img.alt=name;img.loading='lazy';img.referrerPolicy='no-referrer';b.title=name;b.append(img,el('small',name));if(path===suggestion)b.append(el('small','推荐','logo-recommend'));$('#logoGrid').append(b)});
}
$('#tabBuiltin').onclick=()=>selectLogoTab('builtin');$('#tabLink').onclick=()=>selectLogoTab('link');$('#tabUpload').onclick=()=>selectLogoTab('upload');
$('.logo-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[$('#tabBuiltin'),$('#tabUpload'),$('#tabLink')],i=tabs.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;tabs[next].click();tabs[next].focus()};
$('#uploadLogoButton').onclick=()=>$('#logoFile').click();
$('#logoLinkForm').onsubmit=e=>{e.preventDefault();const value=$('#logoLink').value.trim();try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error();applyLogoChoice(value)}catch{toast('请填写有效的 HTTP 或 HTTPS 图片直链')}};
function confirmLogoReplace(name,users=[]){
 return new Promise(resolve=>{
  const dialog=$('#logoConflictDialog');$('#logoConflictMessage').textContent=`台标库中已有“${name}”。${users.length?`已发布频道中有 ${users.length} 个正在使用。`:''}是否替换？`;
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
 $('#managerLogoSearch').value='';$('#managerLogoGrid').replaceChildren();$('#managerLogoStatus').textContent='正在加载…';$('#logoManagerDialog').showModal();
 try{await loadLogos();renderLogoManager()}catch(err){$('#managerLogoStatus').textContent=err.message}
}
function draftLogoUsers(path){
 return (state?.lists||[]).flatMap(list=>list.channels.filter(ch=>{
  try{const url=new URL(ch.logo,location.origin);return url.origin===location.origin&&'/logo/'+(logoLibrary.aliases[decodeURIComponent(url.pathname).slice(6)]||decodeURIComponent(url.pathname).slice(6))===path}catch{return false}
 }).map(ch=>({list:list.name,name:ch.name})));
}
function usageText(users){return users.slice(0,12).map(u=>`${u.list} / ${u.name}`).join('、')+(users.length>12?` 等 ${users.length} 个频道`:'')}
async function removeLibraryLogo(entry){
 const users=[...entry.users,...draftLogoUsers(entry.path)],warning=users.length?`以下频道使用此台标：${usageText(users)}。删除后无法显示该图片。`:'删除后可重新上传恢复。';
 if(!confirm(`删除“${entry.name}”？${warning}`))return;
 const path='/api/logos/'+encodeURIComponent(entry.name);
 try{await api(path,{method:'DELETE'})}catch(err){if(!err.data?.in_use)throw err;if(!confirm(`已发布频道正在使用：${usageText(err.data.users)}。确定删除并使这些图片无法显示？`))return;await api(path+'?confirm=1',{method:'DELETE'})}
 await refreshLogoLibrary();render();toast('台标已删除');
}
let replacementLogoName=null,managerUploadBusy=false;
function renderLogoManager(){
 if(!logoLibrary)return;
 const query=core.normalizeName($('#managerLogoSearch').value),entries=logoLibrary.entries.filter(e=>core.normalizeName(core.logoName(e.path)).includes(query)).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN',{numeric:true}));
 $('#managerLogoGrid').replaceChildren();$('#managerLogoStatus').textContent=`台标库共 ${logoLibrary.entries.length} 个 · 找到 ${entries.length} 个${entries.length>300?'，显示前 300 个，请搜索缩小范围':''}`;
 for(const entry of entries.slice(0,300)){
  const row=el('section',undefined,'library-logo-card'),img=el('img');img.src=entry.path;img.alt=core.logoName(entry.path);img.loading='lazy';row.append(img,el('strong',core.logoName(entry.path)),el('small',`${entry.uploaded?'已上传':'原有台标'} · ${entry.users.length} 个已发布频道使用`));
  const actions=el('div',undefined,'library-logo-actions'),replace=button('替换',()=>{replacementLogoName=entry.name;$('#replaceLogoFile').click()}),remove=button('删除',async()=>{remove.disabled=true;try{await removeLibraryLogo(entry)}catch(err){toast(err.message)}finally{remove.disabled=false}},'danger');replace.disabled=remove.disabled=managerUploadBusy;actions.append(replace,remove);row.append(actions);$('#managerLogoGrid').append(row);
 }
}
async function uploadManagerFiles(files,name=null){
 if(managerUploadBusy)return;managerUploadBusy=true;$('#managerUpload').disabled=true;renderLogoManager();let count=0,stopped=false;
 try{for(const file of files){$('#managerLogoStatus').textContent=`正在上传 ${file.name}…`;const result=await uploadLibraryLogo(file,name);if(!result){stopped=true;break}count++} }
 catch(err){toast(err.message)}finally{managerUploadBusy=false;$('#managerUpload').disabled=false;try{await refreshLogoLibrary();render();$('#managerLogoStatus').textContent+=` · 已上传 ${count} 个${stopped?'，已停止后续上传':''}`}catch(err){toast(err.message)}}
}
$('#manageLogos').onclick=openLogoManager;$('#pickerManageLogos').onclick=openLogoManager;
$('#managerLogoSearch').oninput=renderLogoManager;$('#managerUpload').onclick=()=>$('#managerLogoFile').click();
$('#managerLogoFile').onchange=async e=>{const files=[...e.target.files];e.target.value='';await uploadManagerFiles(files)};
$('#replaceLogoFile').onchange=async e=>{const file=e.target.files[0],name=replacementLogoName;e.target.value='';if(file&&name)await uploadManagerFiles([file],name)};
$('#logoSearch').oninput=renderLogoPicker;
$('#autoLogo').onclick=async()=>{
 const list=current(),ids=selectedChannels.size?[...selectedChannels]:visibleChannels.map(c=>c.id);
 logoContext={listId:selected,ids,fingerprint:core.fingerprint(state)};
 try{await loadLogos();if(core.fingerprint(state)!==logoContext.fingerprint)return toast('草稿已变化，请重新匹配');$('#replaceLogos').checked=false;$('#autoLogoScope').textContent=`${list.name} · ${selectedChannels.size?'已选频道':'当前筛选结果'} ${ids.length} 个`;renderAutoLogos();$('#autoLogoDialog').showModal()}catch(err){toast(err.message)}
};
function renderAutoLogos(){
 const list=state.lists.find(l=>l.id===logoContext.listId),paths=libraryPaths(),ids=new Set(logoContext.ids);logoMatches=[];let missing=0,kept=0,same=0;$('#autoLogoPreview').replaceChildren();
 list.channels.filter(ch=>ids.has(ch.id)).forEach(ch=>{
  if(ch.logo&&!$('#replaceLogos').checked){kept++;return}const path=core.matchLogo(ch,paths,logoLibrary.aliases);if(!path){missing++;return}if(ch.logo===path){same++;return}
  logoMatches.push({id:ch.id,path});if(logoMatches.length<=100){const row=previewRow(ch.name,`${ch.logo?'替换已有台标':'新增台标'} → ${core.logoName(path)}`),img=el('img');img.src=path;img.alt=core.logoName(path);row.prepend(img);$('#autoLogoPreview').append(row)}
 });
 $('#autoLogoSummary').textContent=`可应用 ${logoMatches.length} 个，保留已有 ${kept} 个，已一致 ${same} 个，无唯一匹配 ${missing} 个${logoMatches.length>100?'（展示前 100 个）':''}`;$('#autoLogoApply').disabled=!logoMatches.length;
}
$('#replaceLogos').onchange=renderAutoLogos;
$('#autoLogoApply').onclick=()=>{if(core.fingerprint(state)!==logoContext.fingerprint)return toast('草稿已变化，请重新匹配');const list=state.lists.find(l=>l.id===logoContext.listId);const paths=new Map(logoMatches.map(m=>[m.id,m.path]));list.channels.forEach(ch=>{if(paths.has(ch.id))ch.logo=paths.get(ch.id)});$('#autoLogoDialog').close();changed();toast(`已应用 ${logoMatches.length} 个台标，可撤销；保存发布后生效`)};
function legacyCopy(text){
 const previous=document.activeElement,area=el('textarea');area.className='clipboard-helper';area.value=text;$('#settingsDialog').append(area);area.focus();area.select();
 let ok=false;try{ok=document.execCommand('copy')}finally{area.remove();previous?.focus()}return ok;
}
async function copySubscription(text){
 let copied=false;
 if(window.isSecureContext&&navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);copied=true}catch{}}
 if(!copied){try{copied=legacyCopy(text)}catch{}}
 toast(copied?'订阅地址已复制':'复制失败，请长按或选中地址手动复制');
}
$('#history').onclick=async()=>{
 $('#historyEntries').replaceChildren();$('#historyStatus').textContent='正在读取历史…';$('#historyDialog').showModal();
 try{const data=await api('/api/history');if(!$('#historyDialog').open)return;$('#historyStatus').textContent=`当前发布版本 v${data.revision} · ${data.entries.length} 份发布前快照`;
  if(!data.entries.length)$('#historyEntries').append(el('p','暂无历史，第一次发布后会自动生成。','hint'));
  data.entries.forEach(entry=>{const row=previewRow(`v${entry.revision}${entry.revision===data.revision-1?' · 上一版':''}`,`备份时间 ${new Date(entry.created_at).toLocaleString('zh-CN')} · ${entry.lists} 套列表 · ${entry.channels} 个频道`),restore=button('恢复到草稿',async()=>{
   if(!confirm(`将 v${entry.revision} 恢复到当前草稿？${dirty?'会替换当前未保存内容，可用撤销找回。':''}订阅在保存发布后才会改变。`))return;
   restore.disabled=true;try{const snapshot=await api('/api/history/'+entry.revision);state.lists=snapshot.state.lists;state.epg=snapshot.state.epg;selected=state.lists[0]?.id;group='';selectedChannels.clear();$('#historyDialog').close();$('#preferencesDialog').close();changed();toast(`已恢复 v${entry.revision} 到草稿，请检查后保存发布`)}catch(err){toast(err.message)}finally{restore.disabled=false}
  });row.append(restore);$('#historyEntries').append(row)});
 }catch(err){$('#historyStatus').textContent=err.message}
};
api('/api/auth/status').then(async data=>{username=data.username;if(data.authenticated)await loadWorkspace();else showAuth(!data.initialized)}).catch(err=>{showAuth(false);$('#authError').textContent=err.message});
