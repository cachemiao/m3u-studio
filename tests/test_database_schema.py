import sys,sqlite3,json,importlib.util
from pathlib import Path
import pytest
from werkzeug.security import generate_password_hash
sys.path.insert(0,str(Path(__file__).parents[1]/'app'))
from database_schema import ensure_schema,SCHEMA_VERSION

@pytest.fixture
def old_database(tmp_path):
 path=tmp_path/'legacy.db'
 payload=json.dumps({'epg':'','lists':[{'id':'one','name':'Legacy','groups':['News'],'enabled':True,'epg':'','channels':[{'id':'a','name':'Sample','group':'News','url':'https://example.invalid/live','logo':'/logo/Sample.png','epg':'','epg_id':'demo.sample','catchup':'default','catchup_url':'','fcc_url':'','days':7}]}]})
 with sqlite3.connect(path) as conn:
  conn.executescript('CREATE TABLE state(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL);CREATE TABLE history(revision INTEGER PRIMARY KEY,created_at TEXT NOT NULL,payload TEXT NOT NULL);CREATE TABLE account(id INTEGER PRIMARY KEY,username TEXT NOT NULL,password_hash TEXT NOT NULL,version TEXT NOT NULL);CREATE TABLE security(key TEXT PRIMARY KEY,value TEXT NOT NULL);')
  conn.execute('INSERT INTO state VALUES(1,7,?)',(payload,));conn.execute('INSERT INTO history VALUES(6,?,?)',('2026-10-01T00:00:00+00:00',payload))
  conn.execute('INSERT INTO account VALUES(1,?,?,?)',('legacy-user',generate_password_hash('legacy-password-only'),'existing-account-version'))
  conn.execute('INSERT INTO security VALUES(?,?)',('session_key','existing-session-key'))
 return path

def rows(path):
 with sqlite3.connect(path) as conn:return {name:conn.execute('SELECT * FROM '+name).fetchall() for name in ['state','history','account','security']}

def test_legacy_upgrade_preserves_all_rows_and_is_idempotent(old_database):
 before=rows(old_database);assert ensure_schema(old_database)==1
 assert rows(old_database)==before;ensure_schema(old_database);assert rows(old_database)==before
 with sqlite3.connect(old_database) as conn:assert conn.execute('PRAGMA user_version').fetchone()[0]==SCHEMA_VERSION

def test_future_schema_is_refused_without_modifying_data(old_database):
 with sqlite3.connect(old_database) as conn:conn.execute('PRAGMA user_version=2')
 before=old_database.read_bytes()
 with pytest.raises(RuntimeError,match='not supported'):ensure_schema(old_database)
 assert old_database.read_bytes()==before

def test_failed_migration_rolls_back_all_changes(tmp_path):
 path=tmp_path/'bad.db'
 with sqlite3.connect(path) as conn:conn.execute('CREATE TABLE state(id INTEGER PRIMARY KEY, unexpected TEXT)')
 with pytest.raises((RuntimeError,sqlite3.DatabaseError)):ensure_schema(path)
 with sqlite3.connect(path) as conn:
  assert conn.execute('PRAGMA user_version').fetchone()[0]==0
  assert {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}=={'state'}

def test_backup_restore_retains_login_channels_history_and_logo(old_database,tmp_path,monkeypatch):
 ensure_schema(old_database)
 restored=tmp_path/'restore';(restored/'database').mkdir(parents=True);(restored/'logo').mkdir()
 with sqlite3.connect(old_database) as source,sqlite3.connect(restored/'database/iptv.db') as destination:source.backup(destination)
 logo=b'example-logo-bytes';(restored/'logo/Sample.png').write_bytes(logo)
 monkeypatch.setenv('DATA_DIR',str(restored));monkeypatch.setenv('ADMIN_PASSWORD','must-not-overwrite-existing')
 spec=importlib.util.spec_from_file_location('restored_server',Path(__file__).parents[1]/'app/server.py');server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
 client=server.app.test_client();auth={'X-IPTV-Request':'1'}
 assert client.post('/api/auth/login',json={'username':'legacy-user','password':'legacy-password-only'},headers=auth).status_code==200
 assert client.get('/api/state').json['revision']==7
 assert client.get('/api/history').json['entries'][0]['revision']==6
 assert b'Sample' in client.get('/tv.m3u').data
 assert client.get('/logo/Sample.png').data==logo
 assert server.app.secret_key=='existing-session-key'
