"""Build a self-contained static demo; never include accounts, uploads or live data."""
from pathlib import Path
import json
import re
import shutil
import html
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'docs/demo'
OUT.mkdir(parents=True, exist_ok=True)
ASSETS = OUT / 'assets'
ASSETS.mkdir(exist_ok=True)

# Only explicitly named public UI assets are copied, never DATA_DIR or workspace files.
files = ['translations.js', 'i18n.js', 'theme.js', 'preferences.js', 'style.css', 'studio.css',
         'theme-colors.css', 'updates.css', 'editor-core.js', 'source-check-core.js', 'ui-dialogs.js', 'favicon.svg']
for name in files:
    shutil.copy2(ROOT / 'app/static' / name, ASSETS / name)
for name in ['demo-runtime.js', 'demo-ui.js', 'demo.css']:
    shutil.copy2(ROOT / 'demo' / name, ASSETS / name)

names = ['城市综合 HD', '晨间直播 HD', '公共服务 HD', '国际视野 HD', '生活方式 HD', '体育现场 HD',
         '自然探索 4K', '人文地理 HD', '科学发现 HD', '历史映像 HD', '旅行世界 4K', '纪录视界 HD',
         '电影时光 HD', '音乐现场 HD', '戏剧舞台 HD', '动画乐园 HD', '文化印记 HD', '经典放映 HD',
         '山野行走 HD', '海岸风景 4K', '城市漫步 HD', '乡村慢行 HD', '运动生活 HD', '星空观察 4K']
groups = ['综合频道', '纪录与探索', '电影与文化', '风景与生活']
colors = ['#8B87F4', '#58B9B1', '#7F9DCF', '#BC8EBF', '#CBA868', '#73AF92']
logo_paths=[]
(ASSETS/'logos').mkdir(exist_ok=True)
for i,name in enumerate(names):
    filename = f'{name}.png'
    shutil.copy2(ROOT/'demo/logos'/filename, ASSETS/'logos'/filename)
    logo_paths.append('assets/logos/'+filename)

def channel(i,ident,group,missing=True):
    return {'id':ident,'name':names[i], 'group':group,'url':f'https://stream.example.invalid/live/demo-{i+1:02d}.m3u8',
            'logo':'' if missing and i%5==2 else logo_paths[i], 'epg_id':f'demo.{i+1:02d}',
            'catchup_url':f'https://stream.example.invalid/replay/{i+1}?start={{utc}}&end={{utcend}}' if i%3==0 else '',
            'fcc_url':'fcc.example.invalid:9000' if i%4==0 else '', 'catchup':'default','days':7,'epg':''}
state={'revision':0,'epg':'https://epg.example.invalid/programs.xml','base_url':'https://demo.example.invalid','lists':[
    {'id':'demo-main','name':'家庭频道示例','groups':groups,'channels':[channel(i,f'demo-main-{i}',groups[i//6]) for i in range(24)],'enabled':True,'epg':'','slug':'family'},
    {'id':'demo-travel','name':'旅行与自然','groups':['精选风景','自然纪录'],'channels':[channel(i,f'demo-travel-{i}','精选风景' if i<12 else '自然纪录') for i in [6,7,10,11,18,19,20,21,23]],'enabled':True,'epg':'','slug':'travel'}]}
samples=[]
for title,indices in [('户外与生活示例',[18,20,22]),('纪录与音乐示例',[7,11,13])]:
    items=[channel(i,f'sample-{i}',title,False) for i in indices]
    samples.append({'name':title,'groups':[title],'channels':items})
seed={'version':(ROOT/'app/VERSION').read_text().strip(),'state':state,'logos':logo_paths,'samples':samples}
(ASSETS/'demo-state.js').write_text('window.M3UDemoSeed = '+json.dumps(seed,ensure_ascii=False)+';\n',encoding='utf-8')

shutil.copy2(ROOT/'app/static/app.js', ASSETS/'app.js')
for name in ['workspace-model.js','transport.js']:
    shutil.copy2(ROOT/'app/static'/name, ASSETS/name)
shutil.copytree(ROOT/'app/static/controllers', ASSETS/'controllers', dirs_exist_ok=True)
shutil.copytree(ROOT/'app/static/styles', ASSETS/'styles', dirs_exist_ok=True)

index=(ROOT/'app/static/index.html').read_text(encoding='utf-8')
index=index.replace('/static/','assets/')
csp="default-src 'self'; connect-src 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
index=index.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+html.escape(csp,quote=True)+'"><meta name="referrer" content="no-referrer">',1)
index=index.replace('<title>M3U Studio</title>','<title>M3U Studio · 功能演示</title>',1)
index=index.replace('<script src="assets/i18n.js">','<script src="assets/demo-state.js"></script><script src="assets/demo-runtime.js"></script><script src="assets/i18n.js">',1)
index=index.replace('</head>','<link rel="stylesheet" href="assets/demo.css"></head>',1)
banner='''<section id="demoBanner" aria-label="Demo mode"><span class="demo-mode" data-demo-i18n="demoMode">演示模式</span><span class="demo-banner-notice" data-demo-i18n="demoNotice">虚构数据 · 不上传、不连接播放源 · 刷新恢复</span><div class="demo-banner-actions"><button id="demoReset" type="button" data-demo-i18n="demoReset">重置演示</button><a href="https://github.com/cachemiao/m3u-studio" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></section><p id="demoTip" data-demo-i18n="demoTip">试试：勾选几个频道一起拖动，或使用批量编辑。</p>'''
index=index.replace('<body>','<body>'+banner,1)
index=index.replace('<script src="assets/updates.js"></script>','')
extra='''<dialog id="demoSampleDialog" aria-labelledby="demoSampleTitle"><div class="dialog-head"><h2 id="demoSampleTitle" data-demo-i18n="demoSampleTitle">导入示例频道</h2><button id="demoSampleCancel" type="button" class="close" aria-label="Close">×</button></div><p data-demo-i18n="demoSampleHint"></p><select id="demoSampleChoice" aria-label="Sample channels"><option value="0">户外与生活 · 3 个频道</option><option value="1">纪录与音乐 · 3 个频道</option></select><footer><button id="demoSampleCancelFooter" type="button" data-i18n="m198">取消</button><button id="demoSampleApply" type="button" class="primary"></button></footer></dialog>'''
index=index.replace('<script src="assets/app.js"></script>','<script src="assets/app.js"></script>'+extra+'<script src="assets/demo-ui.js"></script>')
# Prevent browser form history from retaining typed example configuration.
index=index.replace('<form ', '<form autocomplete="off" ')
(OUT/'index.html').write_text(index,encoding='utf-8')
(OUT/'.nojekyll').touch()
for name in ['LICENSE','NOTICE']:
    shutil.copy2(ROOT/name,OUT/name)
print(f'Static demo built: {OUT} ({len(list(OUT.rglob("*")))} files/directories)')
