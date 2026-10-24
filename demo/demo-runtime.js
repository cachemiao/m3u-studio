/* Static demo: all operations stay in this page's memory. No API/network adapter. */
(() => {
 'use strict';
 const copy=value=>JSON.parse(JSON.stringify(value));
 const zh=()=>window.M3UI18n?.language!=='en';
 const msg=(a,b)=>zh()?a:b;
 const messages={
 demoMode:['演示模式','Demo mode'],demoNotice:['虚构数据 · 不上传、不连接播放源 · 刷新恢复','Fictional data · No uploads or stream connections · Refresh to reset'],
 demoReset:['重置演示','Reset demo'],demoSamples:['导入示例','Import samples'],demoSampleTitle:['导入示例频道','Import sample channels'],
 demoSampleHint:['选择内置示例，体验追加频道或新建列表。演示版不接收文件、粘贴内容或远程链接。','Choose built-in samples to append channels or create a playlist. Files, pasted content and remote URLs are not accepted.'],
 demoSampleAdd:['追加到当前列表','Append to current playlist'],demoSampleNew:['导入为新列表','Import as a new playlist'],
 demoSampleOne:['户外与生活 · 3 个频道','Outdoors & lifestyle · 3 channels'],demoSampleTwo:['纪录与音乐 · 3 个频道','Documentary & music · 3 channels'],
 demoLogoOnly:['演示版仅支持内置示例台标，请点击“选择台标”。','Only bundled sample logos are available. Use “Choose logo”.'],
 demoSimulated:['模拟结果','Simulated results'],demoNoExternal:['演示版不支持此操作。所有修改仅在本页内存中生效。','This action is unavailable in the demo. Changes remain only in this page’s memory.'],
 demoTip:['试试：勾选几个频道一起拖动，或使用批量编辑。','Try selecting channels and dragging them together, or use Bulk edit.'],
 demoLinksTitle:['订阅与 EPG · 示例','Subscriptions & EPG · sample'],demoLinksHint:['以下均为不可用的虚构订阅地址，仅供体验复制和配置；不会生成真实订阅。','These fictional subscription URLs are not usable. Try copying and configuring them; no real subscription is published.'],
 demoPrefHint:['演示版仅提供外观、示例台标与本页发布历史，不涉及账号、文件上传或配置备份。','The demo includes appearance, sample logos and this page’s publish history. Account, upload and backup operations are unavailable.']
 };
 for(const [key,[a,b]] of Object.entries(messages))window.M3UTranslations[key]={zh:a,en:b};
 Object.assign(window.M3UTranslations,{
 m160:{zh:'演示发布',en:'Simulate publish'},m2:{zh:'演示修改未发布',en:'Unpublished demo changes'},m3:{zh:'演示内容已就绪',en:'Demo ready'},
 m34:{zh:'已完成演示发布，仅保存在本页，未生成真实订阅。',en:'Demo published in this page only. No real subscription was created.'},
 uiStatus:{zh:'模拟状态',en:'Simulated status'},studioSourceStatus:{zh:'模拟检测结果',en:'Simulated check result'},
 m326:{zh:'模拟检测',en:'Simulated checks'},m327:{zh:'模拟响应状态与耗时，不读取或连接任何播放地址。',en:'Simulated response states and timings. No stream URL is read or contacted.'},
 m242:{zh:'内置虚构台标，可搜索、选择和自动匹配。不开放上传或外部图片链接。',en:'Bundled fictional logos support search, selection and matching. Uploads and external image URLs are unavailable.'},
 m248:{zh:'选择后应用到演示草稿，刷新即可恢复。',en:'Apply a logo to the demo draft. Refresh to reset.'},
 m183:{zh:'查看内置示例台标，体验搜索与选择',en:'Browse, search and select bundled sample logos'},
 m249:{zh:'这是只读的内置示例台标库，不开放上传、替换和删除。可在频道中选择台标或体验自动匹配。',en:'This bundled sample logo library is read-only. Upload, replace and delete are unavailable. Try choosing logos or automatic matching.'},
 m186:{zh:'仅保留当前页面的演示发布记录，刷新后清空。',en:'Demo snapshots are kept in this page only and cleared on refresh.'},
 appearanceHint:{zh:'外观和语言偏好保存在此浏览器；频道内容仅在本页内存中生效。',en:'Only appearance and language preferences are saved in this browser. Channel changes remain in this page’s memory.'}
 });
 const seed=window.M3UDemoSeed;
 const logos=new Set(seed.logos);
 let published=copy(seed.state),history=[];
 const isLogo=path=>!path||logos.has(path);
 function validate(raw){
  const data=copy(raw);
  if(!Array.isArray(data.lists)||data.lists.length>30)throw Error(msg('列表格式不正确','Invalid playlist structure'));
  for(const list of data.lists){
   if(!Array.isArray(list.groups)||!Array.isArray(list.channels))throw Error(msg('频道格式不正确','Invalid channel structure'));
   for(const channel of list.channels){
    if(!channel.name?.trim()||!channel.url?.trim())throw Error(msg('频道名称和播放地址不能为空','A channel name and stream URL are required'));
    if(!isLogo(channel.logo))throw Error(msg(...messages.demoLogoOnly));
   }
  }
  return data;
 }
 async function api(path,options={}){
  const method=options.method||'GET';
  if(path==='/api/auth/status'&&method==='GET')return {initialized:true,authenticated:true,username:'Demo',version:seed.version};
  if(path==='/api/state'&&method==='GET')return copy(published);
  if(path==='/api/validate'&&method==='POST')return validate(JSON.parse(options.body));
  if(path==='/api/state'&&method==='PUT'){
   const submitted=validate(JSON.parse(options.body));
   history.unshift({revision:published.revision,created_at:new Date().toISOString(),state:copy(published)});history=history.slice(0,30);
   published={...submitted,revision:published.revision+1,base_url:'https://demo.example.invalid'};
   return {revision:published.revision,state:copy(published)};
  }
  if(path==='/api/logos'&&method==='GET')return {logos:[...logos],aliases:{},entries:[...logos].map(path=>({path,name:path.split('/').at(-1),uploaded:false,users:[]}))};
  if(path==='/api/history'&&method==='GET')return {revision:published.revision,entries:history.map(x=>({revision:x.revision,created_at:x.created_at,lists:x.state.lists.length,channels:x.state.lists.reduce((n,l)=>n+l.channels.length,0)}))};
  if(/^\/api\/history\/\d+$/.test(path)&&method==='GET'){
   const found=history.find(x=>x.revision===Number(path.split('/').at(-1)));if(found)return {state:copy(found.state),revision:found.revision};
  }
  throw Error(msg(...messages.demoNoExternal));
 }
 async function simulatedFetch(path,options={}){
  if(path!=='/api/source-check')throw Error(msg(...messages.demoNoExternal));
  const signal=options.signal;if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  await new Promise((resolve,reject)=>{
   const done=()=>{signal?.removeEventListener('abort',abort);resolve()};
   const timer=setTimeout(done,180);function abort(){clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'))}signal?.addEventListener('abort',abort,{once:true});
  });
  const url=JSON.parse(options.body).url||'';let code=0;for(const ch of url)code=(code*31+ch.charCodeAt(0))>>>0;
  const outcomes=[{status:'ok',ms:68+code%160},{status:'ok',ms:320+code%240},{status:'timeout'},{status:'unavailable'},{status:'ok',ms:85+code%80}];
  return new Response(JSON.stringify(outcomes[code%5]),{status:200,headers:{'Content-Type':'application/json'}});
 }
 window.M3UDemo={api,fetch:simulatedFetch,isLogo,sample:index=>copy(seed.samples[index]||seed.samples[0])};
 window.M3UUpdates={setCurrentVersion(version){const n=document.getElementById('headerVersion');if(n)n.textContent='v '+version}};
})();
