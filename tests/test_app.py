import importlib.util, io
from pathlib import Path
import pytest
from PIL import Image

@pytest.fixture
def server(tmp_path, monkeypatch):
    monkeypatch.setenv('DATA_DIR', str(tmp_path))
    monkeypatch.setenv('ADMIN_PASSWORD', 'test-password-12345')
    monkeypatch.setenv('PUBLIC_BASE_URL', 'http://192.168.6.3:8324')
    spec = importlib.util.spec_from_file_location('iptv_server', Path(__file__).parents[1] / 'app/server.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.app.config['TESTING'] = True
    return module

@pytest.fixture
def auth():
    return {'X-IPTV-Request':'1'}

def client(server, auth):
    c = server.app.test_client()
    response = c.post('/api/auth/login', json={'username':'admin','password':'test-password-12345'}, headers=auth)
    assert response.status_code == 200
    return c

def sample():
    def playlist(ident, enabled=True):
        return {'id':ident,'name':ident,'groups':['央视','卫视'], 'enabled':enabled, 'epg':'https://example.com/'+ident+'.xml', 'channels':[
            {'id':'a','name':'CCTV-1','group':'央视','url':'rtp://239.1.1.1:4120','logo':'/logo/CCTV1.png','epg_id':'cctv1','catchup_url':'rtsp://192.168.8.1/replay?start={utc}&end={utcend}'},
            {'id':'b','name':'湖南卫视','group':'卫视','url':'http://192.168.8.3:3224/udp/239.1.1.2:4120'}]}
    return {'revision':0,'epg':'https://example.com/epg.xml','lists':[playlist('neimeng'),playlist('shanghai',False)]}

def test_auth_and_csrf(server, auth):
    c=server.app.test_client()
    assert c.get('/').status_code==200
    assert c.get('/api/state').status_code==401
    assert c.get('/tv.m3u').status_code==200
    assert c.get('/healthz').status_code==200
    assert c.post('/api/auth/login',json={'username':'admin','password':'test-password-12345'},headers=auth).status_code==200
    assert c.get('/api/state').status_code==200
    assert c.put('/api/state',json=sample()).status_code==403

def test_save_export_isolation_and_conflict(server,auth):
    c=client(server,auth);s=sample()
    assert c.put('/api/state',json=s,headers=auth).json['revision']==1
    m3u=c.get('/tv.m3u').text
    assert m3u.count('#EXTINF')==2
    assert 'http://localhost/logo/CCTV1.png' in m3u
    assert 'catchup-source="rtsp://192.168.8.1/replay?start={utc}&end={utcend}"' in m3u
    assert 'shanghai.xml' not in m3u
    assert c.get('/lists/shanghai/tv.m3u').text.count('#EXTINF')==2
    assert c.get('/lists/missing/tv.txt').status_code==404
    assert c.put('/api/state',json=s,headers=auth).status_code==409
    assert c.get('/tv.txt').text.startswith('央视,#genre#\nCCTV-1,rtp://')

def test_reorder_and_cross_group(server,auth):
    c=client(server,auth);s=sample();p=s['lists'][0]
    p['groups']=['卫视','央视'];p['channels'][0]['group']='卫视';p['channels'].reverse()
    assert c.put('/api/state',json=s,headers=auth).status_code==200
    m=c.get('/tv.m3u').text
    assert m.index(',湖南卫视')<m.index(',CCTV-1')
    assert m.count('group-title="卫视"')==2

def test_invalid_config_does_not_publish(server,auth):
    c=client(server,auth);s=sample();s['lists'][0]['channels'][0]['url']='javascript:alert(1)'
    assert c.put('/api/state',json=s,headers=auth).status_code==400
    assert c.get('/api/state',headers=auth).json['revision']==0
    s=sample();s['lists'][0]['channels'][0]['name']='bad\n#EXTINF:inject'
    assert c.put('/api/state',json=s,headers=auth).status_code==400
    assert c.get('/api/state',headers=auth).json['revision']==0

def test_import_roundtrip(server,auth):
    c=client(server,auth);c.put('/api/state',json=sample(),headers=auth)
    m=c.get('/tv.m3u').text
    result=c.post('/api/import',json={'text':m},headers=auth)
    assert result.status_code==200
    assert result.json['channels'][0]['catchup_url'].endswith('{utcend}')
    txt=c.get('/tv.txt').text
    result=c.post('/api/import',json={'text':'\ufeff'+txt},headers=auth)
    assert result.json['channels'][0]['catchup_url'].startswith('rtsp://')
    assert result.json['groups']==['央视','卫视']
    assert c.post('/api/import',json={'text':'#EXTINF:-1,孤立'},headers=auth).status_code==400

def test_import_url_comma(server,auth):
    c=client(server,auth)
    result=c.post('/api/import',json={'text':'#EXTM3U\n#EXTINF:-1 tvg-logo="https://example.com/a,b.png" group-title="央视",CCTV1\nhttp://example.com/live'},headers=auth)
    assert result.status_code==200
    assert result.json['channels'][0]['logo']=='https://example.com/a,b.png'

def test_logo_validation_thumbnail_and_public_access(server,auth):
    c=client(server,auth);buf=io.BytesIO();Image.new('RGB',(1200,1200),'red').save(buf,'JPEG');buf.seek(0)
    result=c.post('/api/logos',data={'file':(buf,'../新测试台标.jpg')},headers=auth)
    assert result.status_code==200
    assert (result.json['width'],result.json['height'])==(180,180)
    image=c.get(result.json['path']);assert image.status_code==200
    assert Image.open(io.BytesIO(image.data)).size==(180,180)
    assert c.post('/api/logos',data={'file':(io.BytesIO(b'not image'),'fake.png')},headers=auth).status_code==400
    assert c.get('/logo/../../database/iptv.db').status_code==404

def test_backup_restore_and_persistence(server,auth):
    c=client(server,auth);s=sample();c.put('/api/state',json=s,headers=auth)
    backup=c.get('/api/backup',headers=auth).json;backup['revision']=1
    assert c.put('/api/state',json=backup,headers=auth).status_code==200
    assert c.get('/api/state',headers=auth).json['lists'][0]['id']=='neimeng'
    assert len(list((server.DATA/'backup').glob('*.json')))==2
    assert server.read_state()['revision']==2

def test_combined_txt_groups(server,auth):
    c=client(server,auth);s=sample();s['lists'][1]['enabled']=True
    c.put('/api/state',json=s,headers=auth)
    t=c.get('/tv.txt').text
    assert t.count('央视,#genre#')==1
    assert t.count('CCTV-1,')==2


def test_first_run_setup_login_and_no_reinitialization(server,auth):
    with server.db() as conn: conn.execute('DELETE FROM account')
    c=server.app.test_client()
    assert c.get('/api/auth/status').json=={'initialized':False,'authenticated':False,'username':''}
    assert c.get('/api/state').status_code==401
    assert c.post('/api/auth/setup',json={'username':'测试用户','password':'123'},headers=auth).status_code==400
    assert c.post('/api/auth/setup',json={'username':'测试用户','password':'my-password-123'},headers=auth).status_code==200
    assert c.get('/api/state').status_code==200
    assert c.post('/api/auth/setup',json={'username':'other','password':'other-password'},headers=auth).status_code==409
    assert server.account()[1]!='my-password-123'
    assert c.post('/api/auth/logout',headers=auth).status_code==200
    assert c.get('/api/state').status_code==401
    assert c.post('/api/auth/login',json={'username':'测试用户','password':'wrong'},headers=auth).status_code==401
    assert c.post('/api/auth/login',json={'username':'测试用户','password':'my-password-123'},headers=auth).status_code==200


def test_web_account_change_revokes_other_sessions(server,auth):
    first=client(server,auth);second=client(server,auth)
    changed={'username':'new-admin','current_password':'test-password-12345','password':'new-password-123'}
    assert first.put('/api/auth/account',json=changed,headers=auth).status_code==200
    assert first.get('/api/state').status_code==200
    assert second.get('/api/state').status_code==401
    assert second.post('/api/auth/login',json={'username':'admin','password':'test-password-12345'},headers=auth).status_code==401
    assert second.post('/api/auth/login',json={'username':'new-admin','password':'new-password-123'},headers=auth).status_code==200


def test_account_migration_persistence_ignores_changed_env(server,auth,monkeypatch):
    original=server.account()
    monkeypatch.setenv('ADMIN_PASSWORD','new-env-password')
    spec=importlib.util.spec_from_file_location('restarted_server',Path(__file__).parents[1]/'app/server.py')
    restarted=importlib.util.module_from_spec(spec);spec.loader.exec_module(restarted)
    assert restarted.account()==original
    assert restarted.app.secret_key==server.app.secret_key


def test_automatic_base_uses_access_host(server,auth):
    c=client(server,auth)
    c.post('/api/auth/login',json={'username':'admin','password':'test-password-12345'},headers=auth,base_url='http://192.168.6.189:8324')
    assert c.get('/api/state',headers={'Host':'192.168.6.189:8324'}).json['base_url']=='http://192.168.6.189:8324'
    c.put('/api/state',json=sample(),headers=auth)
    assert 'http://192.168.8.189:8324/logo/CCTV1.png' in c.get('/tv.m3u',headers={'Host':'192.168.8.189:8324'}).text


def test_fcc_export_import_and_clear(server,auth):
    c=client(server,auth);s=sample()
    s['lists'][0]['channels'][0]['fcc_url']='udp://10.255.14.152:15970'
    s['lists'][0]['channels'][1]['url']='http://192.168.6.3:3224/rtp/239.1.1.2:4120?r2h-token=a%2Bb&fcc-type=huawei'
    s['lists'][0]['channels'][1]['fcc_url']='10.255.14.152:8027'
    assert c.put('/api/state',json=s,headers=auth).status_code==200
    text=c.get('/tv.m3u').text
    assert 'rtp://239.1.1.1:4120/?fcc=10.255.14.152:15970' in text
    assert 'r2h-token=a%2Bb&fcc-type=huawei&fcc=10.255.14.152:8027' in text
    imported=c.post('/api/import',json={'text':text},headers=auth).json
    assert imported['channels'][0]['fcc_url']=='10.255.14.152:15970'
    assert 'fcc=' not in imported['channels'][0]['url']
    txt_import=c.post('/api/import',json={'text':c.get('/tv.txt').text},headers=auth).json
    assert txt_import['channels'][1]['fcc_url']=='10.255.14.152:8027'
    state=c.get('/api/state').json;state['lists'][0]['channels'][0]['fcc_url']=''
    assert c.put('/api/state',json=state,headers=auth).status_code==200
    assert 'rtp://239.1.1.1:4120\n' in c.get('/tv.m3u').text


def test_fcc_invalid_address_and_url_query_preservation(server,auth):
    c=client(server,auth);s=sample()
    s['lists'][0]['channels'][0]['fcc_url']='10.255.1.1:99999'
    assert c.put('/api/state',json=s,headers=auth).status_code==400
    assert server.fcc_address('http://192.168.6.3:3224/rtp/239.1.1.1:4120?fcc=10.1.1.1:8027')=='10.1.1.1:8027'
    assert server.fcc_address('[2001:db8::1]:8027')=='[2001:db8::1]:8027'
    assert server.separate_fcc('http://host/live?token=a%2Bb&fcc=10.1.1.1%3A8027&fcc-type=huawei')==('http://host/live?token=a%2Bb&fcc-type=huawei','10.1.1.1:8027')


def test_login_rate_limit(server,auth):
    c=server.app.test_client()
    for _ in range(10):assert c.post('/api/auth/login',json={'username':'admin','password':'wrong'},headers=auth).status_code==401
    assert c.post('/api/auth/login',json={'username':'admin','password':'wrong'},headers=auth).status_code==429


def test_empty_library_and_uploaded_legacy_aliases(server, auth):
    c=client(server,auth)
    library=c.get('/api/logos').json
    assert library['logos']==[] and library['builtin']==[]
    assert c.get('/logo/CCTV1.png').status_code==404
    assert upload(c,auth,'湖南卫视.png').status_code==200
    assert upload(c,auth,'CCTV5+.png').status_code==200
    assert c.get('/logo/HunanTV.png').data==c.get('/logo/湖南卫视.png').data
    assert c.get('/logo/CCTV5plus.png').data==c.get('/logo/CCTV5+.png').data
    assert '/logo/湖南卫视.png' in c.get('/api/logos').json['logos']


def test_chinese_logo_configuration_and_encoded_export(server,auth):
    c=client(server,auth);s=sample()
    assert upload(c,auth,'湖南卫视.png').status_code==200
    s['lists'][0]['channels'][0]['logo']='/logo/湖南卫视.png'
    assert c.put('/api/state',json=s,headers=auth).status_code==200
    text=c.get('/tv.m3u').text
    from urllib.parse import quote
    encoded=quote('/logo/湖南卫视.png',safe='/')
    assert 'http://localhost'+encoded in text
    assert c.get(encoded).status_code==200
    s['revision']=1;s['lists'][0]['channels'][0]['logo']='/logo/../../iptv.db.png'
    assert c.put('/api/state',json=s,headers=auth).status_code==400


def test_history_access_and_restore_without_immediate_publish(server, auth):
    c=client(server,auth)
    assert server.app.test_client().get('/api/history').status_code==401
    assert server.app.test_client().get('/api/history/0').status_code==401
    assert c.get('/api/history').json['entries']==[]
    first=c.put('/api/state',json=sample(),headers=auth)
    assert first.status_code==200
    original=c.get('/api/state').json
    updated=dict(original);updated['epg']='https://example.com/new.xml'
    assert c.put('/api/state',json=updated,headers=auth).json['revision']==2
    entries=c.get('/api/history').json['entries']
    assert [e['revision'] for e in entries]==[1,0]
    assert entries[0]['channels']==4
    assert 'payload' not in entries[0]
    restored=c.get('/api/history/1').json['state']
    assert restored['epg']==sample()['epg']
    assert server.read_state()['epg']=='https://example.com/new.xml'
    restored['revision']=2
    assert c.put('/api/state',json=restored,headers=auth).json['revision']==3
    assert c.get('/api/history/2').json['state']['epg']=='https://example.com/new.xml'
    assert c.get('/api/history/999').status_code==404


def test_history_conflicts_and_invalid_drafts_do_not_create_snapshots(server,auth):
    c=client(server,auth)
    c.put('/api/state',json=sample(),headers=auth)
    entries=c.get('/api/history').json['entries']
    assert c.put('/api/state',json=sample(),headers=auth).status_code==409
    bad=sample();bad['revision']=1;bad['lists'][0]['channels'][0]['url']='javascript:bad'
    assert c.put('/api/state',json=bad,headers=auth).status_code==400
    assert c.get('/api/history').json['entries']==entries


def test_history_retains_thirty_and_migrates_legacy_backups(server,auth):
    c=client(server,auth)
    for revision in range(32):
        state=sample();state['revision']=revision
        assert c.put('/api/state',json=state,headers=auth).status_code==200
    entries=c.get('/api/history').json['entries']
    assert len(entries)==30
    assert entries[0]['revision']==31 and entries[-1]['revision']==2
    assert c.get('/api/history/1').status_code==404
    with server.db() as conn:conn.execute('DELETE FROM history')
    server.migrate_history()
    assert len(c.get('/api/history').json['entries'])==30
    assert c.get('/api/history/31').json['state']['lists'][0]['id']=='neimeng'
    (server.DATA/'backup'/'000000000099.json').write_text('{broken')
    server.migrate_history()  # corrupt legacy file is skipped
    assert c.get('/api/history/99').status_code==404


def test_validate_batch_draft_does_not_change_state_or_history(server,auth):
    c=client(server,auth);draft=sample()
    draft['lists'][0]['channels'][0]['fcc_url']='udp://10.1.1.1:8027'
    response=c.post('/api/validate',json=draft,headers=auth)
    assert response.status_code==200
    assert response.json['lists'][0]['channels'][0]['fcc_url']=='10.1.1.1:8027'
    assert server.read_state()['revision']==0
    assert c.get('/api/history').json['entries']==[]
    draft['lists'][0]['channels'][0]['fcc_url']='10.1.1.1:99999'
    assert c.post('/api/validate',json=draft,headers=auth).status_code==400
    assert c.post('/api/validate',json=sample()).status_code==403


def test_matching_aliases_do_not_add_missing_images(server,auth):
    c=client(server,auth);library=c.get('/api/logos').json
    assert library['aliases']['卡酷少儿.png']=='北京卡酷少儿.png'
    assert library['logos']==[]
    assert upload(c,auth,'北京卡酷少儿.png').status_code==200
    assert '/logo/北京卡酷少儿.png' in c.get('/api/logos').json['logos']


def upload(c, auth, name, color='red', **fields):
    buf=io.BytesIO();Image.new('RGBA',(600,300),color).save(buf,'PNG');buf.seek(0)
    return c.post('/api/logos',data={'file':(buf,name),**fields},headers=auth)


def test_unified_library_names_collisions_and_replace(server,auth):
    c=client(server,auth)
    response=upload(c,auth,'测试频道.jpg')
    assert response.status_code==200 and response.json['path']=='/logo/测试频道.png'
    assert '/logo/测试频道.png' in c.get('/api/logos').json['logos']
    before=c.get(response.json['path']).data
    collision=upload(c,auth,'测试频道.webp','blue')
    assert collision.status_code==409 and collision.json['conflict']
    assert c.get(response.json['path']).data==before
    assert upload(c,auth,'测试频道.png','blue',replace='1').status_code==200
    assert c.get(response.json['path']).data!=before
    assert c.get(response.json['path']).headers['Cache-Control']=='no-store'
    assert c.get('/api/logos').json['logos'].count(response.json['path'])==1
    assert 'sources' not in c.get('/api/logos').json
    assert c.get('/api/logo-sources').status_code==404


def test_replace_uploaded_and_legacy_alias_updates_same_path(server,auth):
    c=client(server,auth)
    assert upload(c,auth,'湖南卫视.png').status_code==200
    before=c.get('/logo/湖南卫视.png').data
    assert upload(c,auth,'湖南卫视.png').status_code==409
    assert c.get('/logo/湖南卫视.png').data==before
    assert upload(c,auth,'HunanTV.jpg','blue',replace='1').status_code==200
    assert c.get('/logo/湖南卫视.png').data==c.get('/logo/HunanTV.png').data
    assert c.get('/logo/湖南卫视.png').data!=before
    assert len(c.get('/api/logos').json['logos'])==1


def test_delete_in_use_requires_confirmation_and_can_restore(server,auth):
    c=client(server,auth);c.put('/api/state',json=sample(),headers=auth)
    assert upload(c,auth,'CCTV1.png').status_code==200
    response=c.delete('/api/logos/CCTV1.png',headers=auth)
    assert response.status_code==409 and len(response.json['users'])==2
    assert c.get('/logo/CCTV1.png').status_code==200
    assert c.delete('/api/logos/CCTV1.png?confirm=1',headers=auth).status_code==200
    assert c.get('/logo/CCTV1.png').status_code==404
    assert '/logo/CCTV1.png' not in c.get('/api/logos').json['logos']
    assert server.read_state()['revision']==1
    assert c.delete('/api/logos/CCTV1.png',headers=auth).status_code==404
    assert upload(c,auth,'CCTV1.png').status_code==200
    assert c.get('/logo/CCTV1.png').status_code==200
    assert '/logo/CCTV1.png' in c.get('/api/logos').json['logos']


def test_delete_uploaded_and_auth(server,auth):
    c=client(server,auth);path=upload(c,auth,'本地台标.png').json['path']
    assert server.app.test_client().delete('/api/logos/本地台标.png',headers=auth).status_code==401
    assert c.delete('/api/logos/本地台标.png').status_code==403
    assert c.delete('/api/logos/本地台标.png',headers=auth).status_code==200
    assert c.get(path).status_code==404
    assert not (server.DATA/'logo/本地台标.png').exists()


def test_link_not_added_and_invalid_upload_does_not_replace(server,auth):
    c=client(server,auth);s=sample();s['lists'][0]['channels'][0]['logo']='https://example.com/remote.png'
    assert c.put('/api/state',json=s,headers=auth).status_code==200
    assert c.get('/api/logos').json['logos']==[]
    assert upload(c,auth,'CCTV1.png').status_code==200
    before=c.get('/logo/CCTV1.png').data
    assert c.post('/api/logos',data={'file':(io.BytesIO(b'invalid'),'CCTV1.png'),'replace':'1'},headers=auth).status_code==400
    assert c.get('/logo/CCTV1.png').data==before
    assert upload(c,auth,'.hidden.png').status_code==400
    assert upload(c,auth,'bad.svg').status_code==400


def test_library_deleted_state_survives_restart(server,auth):
    c=client(server,auth)
    assert upload(c,auth,'湖南卫视.png').status_code==200
    assert c.delete('/api/logos/湖南卫视.png',headers=auth).status_code==200
    spec=importlib.util.spec_from_file_location('restarted_logo_server',Path(__file__).parents[1]/'app/server.py')
    restarted=importlib.util.module_from_spec(spec);spec.loader.exec_module(restarted)
    restarted_client=client(restarted,auth)
    assert '/logo/湖南卫视.png' not in restarted_client.get('/api/logos').json['logos']
    assert restarted_client.get('/logo/HunanTV.png').status_code==404


def test_short_subscription_matches_legacy_and_survives_reload(server,auth):
    c=client(server,auth);s=sample()
    s['lists'][0]['slug']='LT'
    s['lists'][1]['slug']='yd'
    s['lists'][1]['enabled']=False
    response=c.put('/api/state',json=s,headers=auth)
    assert response.status_code==200
    assert c.get('/api/state').json['lists'][0]['slug']=='lt'
    for fmt in ('m3u','txt'):
        assert c.get('/lt.'+fmt).status_code==200
        assert c.get('/lt.'+fmt).data==c.get('/lists/neimeng/tv.'+fmt).data
        assert c.get('/yd.'+fmt).data==c.get('/lists/shanghai/tv.'+fmt).data
    assert c.get('/missing.m3u').status_code==404
    assert c.get('/lt.json').status_code==404
    assert c.get('/tv.m3u').data==c.get('/lt.m3u').data
    assert c.get('/api/backup').json['lists'][0]['slug']=='lt'
    updated=c.get('/api/state').json
    updated['lists'][0]['slug']='unicom'
    assert c.put('/api/state',json=updated,headers=auth).status_code==200
    assert c.get('/lt.m3u').status_code==404
    assert c.get('/unicom.m3u').status_code==200
    assert c.get('/lists/neimeng/tv.m3u').status_code==200
    assert c.get('/api/history/1').json['state']['lists'][0]['slug']=='lt'


def test_short_name_validation_does_not_publish(server,auth):
    c=client(server,auth)
    for invalid in ('tv','TV','api','static','logo','lists','healthz','a.b','a/b','中文','-lt','a'*25):
        s=sample();s['lists'][0]['slug']=invalid
        assert c.put('/api/state',json=s,headers=auth).status_code==400
    s=sample();s['lists'][0]['slug']='lt';s['lists'][1]['slug']='LT'
    assert c.post('/api/validate',json=s,headers=auth).status_code==400
    assert c.put('/api/state',json=s,headers=auth).status_code==400
    assert server.read_state()['revision']==0
    s=sample();s['lists'][0]['slug']='';s['lists'][1]['slug']=''
    assert c.put('/api/state',json=s,headers=auth).status_code==200
    assert c.get('/lists/neimeng/tv.m3u').status_code==200


def test_import_language_does_not_translate_user_data(server, auth):
    c = client(server, auth)
    content = '#EXTM3U\n#EXTINF:-1,我的频道\nhttp://example.com/live\n#EXTINF:-1 group-title="央视",CCTV1\nhttp://example.com/one'
    english = c.post('/api/import', json={'text': content}, headers={**auth, 'Accept-Language': 'en-US'}).json
    chinese = c.post('/api/import', json={'text': content}, headers={**auth, 'Accept-Language': 'zh-CN'}).json
    assert english['groups'] == ['Ungrouped', '央视']
    assert chinese['groups'] == ['未分组', '央视']
    assert english['channels'][0]['name'] == '我的频道'
    assert english['channels'][0]['url'] == 'http://example.com/live'


def test_epg_id_falls_back_to_channel_name_without_changing_explicit_id(server):
    channel = {'name': '湖南卫视', 'group': '卫视', 'url': 'http://example.com/live', 'logo': '', 'epg_id': '', 'epg': '', 'catchup_url': '', 'fcc_url': ''}
    playlists = [{'groups': ['卫视'], 'channels': [channel], 'epg': ''}]
    output = server.generate(playlists, '', 'http://localhost:8324', 'm3u')
    assert 'tvg-id="湖南卫视"' in output
    assert channel['epg_id'] == ''
    channel['epg_id'] = 'hunan.tv'
    assert 'tvg-id="hunan.tv"' in server.generate(playlists, '', 'http://localhost:8324', 'm3u')

def test_source_check_requires_login_and_request_header(server, auth, monkeypatch):
    c = server.app.test_client()
    assert c.post('/api/source-check', json={'url':'http://example.com'}, headers=auth).status_code == 401
    c = client(server, auth)
    assert c.post('/api/source-check', json={'url':'http://example.com'}).status_code == 403
    monkeypatch.setattr(server, 'probe_http', lambda url: {'status':'ok', 'ms':50})
    before = server.read_state()
    assert c.post('/api/source-check', json={'url':'http://example.com'}, headers=auth).json == {'status':'ok','ms':50}
    assert server.read_state() == before
    assert c.post('/api/source-check', json={'url':123}, headers=auth).status_code == 400
    acquired = [server.probe_slots.acquire(False) for _ in range(4)]
    assert all(acquired)
    try:
        assert c.post('/api/source-check', json={'url':'http://example.com'}, headers=auth).status_code == 429
    finally:
        for _ in acquired: server.probe_slots.release()


def test_probe_reads_only_one_byte_closes_and_handles_http_errors(server, monkeypatch):
    import probe
    calls = []
    class Response:
        status = 200
        def read1(self, count): calls.append(('read',count)); return b'x'
    class Connection:
        sock = None
        def __init__(self,*args,**kwargs): pass
        def request(self,method,path,headers): calls.append(('request',headers['Connection']))
        def getresponse(self): return Response()
        def close(self): calls.append(('close',))
    monkeypatch.setattr(probe.http.client,'HTTPConnection',Connection)
    assert probe.probe_http('http://example.com/live')['status'] == 'ok'
    assert ('read',1) in calls and ('request','close') in calls and calls[-1] == ('close',)
    calls.clear();Response.status = 404
    assert probe.probe_http('http://example.com/missing') == {'status':'unavailable','http_status':404}
    assert not any(call[0]=='read' for call in calls)
    assert probe.probe_http('udp://239.1.1.1:1234') == {'status':'unsupported'}


def test_probe_timeout_and_redirect_limits(server, monkeypatch):
    import probe
    closed = []
    class Response:
        status = 302
        def getheader(self,key): return '/again'
    class Connection:
        sock = None
        def __init__(self,*args,**kwargs): pass
        def request(self,*args,**kwargs): pass
        def getresponse(self): return Response()
        def close(self): closed.append(True)
    monkeypatch.setattr(probe.http.client,'HTTPConnection',Connection)
    assert probe.probe_http('http://example.com/live')['status'] == 'unavailable'
    assert len(closed) == 4
    def timed_out(self): raise TimeoutError()
    monkeypatch.setattr(Connection,'getresponse',timed_out)
    assert probe.probe_http('http://example.com/live') == {'status':'timeout'}
    assert len(closed) == 5
    monkeypatch.setattr(Connection,'getresponse',lambda self: Response())
    monkeypatch.setattr(Response,'getheader',lambda self,key:'file:///etc/passwd')
    assert probe.probe_http('http://example.com/live') == {'status':'unsupported'}
