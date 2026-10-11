import io, json, os, re, secrets, sqlite3, warnings, unicodedata
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, unquote, quote, parse_qs
from flask import Flask, request, jsonify, Response, send_from_directory, abort, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime, timezone
from time import monotonic
from threading import Lock
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).parent
DATA = Path(os.environ.get('DATA_DIR', '/data'))
PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
USERNAME = os.environ.get('ADMIN_USER', 'admin')
for directory in ('database', 'logo', 'backup'):
    (DATA / directory).mkdir(parents=True, exist_ok=True)
app = Flask(__name__, static_folder=None)
app.config.update(MAX_CONTENT_LENGTH=8 * 1024 * 1024, SESSION_COOKIE_HTTPONLY=True,
                  SESSION_COOKIE_SAMESITE='Strict', PERMANENT_SESSION_LIFETIME=timedelta(days=7))
Image.MAX_IMAGE_PIXELS = 16_000_000
LOGO_ALIASES = json.loads((ROOT / 'logo-aliases.json').read_text(encoding='utf-8'))
MATCH_ALIASES = {'卡酷少儿.png': '北京卡酷少儿.png', '金鹰卡通.png': '湖南金鹰卡通.png',
                 '嘉佳卡通.png': '广东嘉佳卡通.png', '金鹰纪实.png': '湖南金鹰纪实.png',
                 '纪实科教.png': '北京纪实科教.png', '哈哈炫动.png': '上海哈哈炫动.png'}

def valid_logo_filename(filename):
    return bool(re.fullmatch(r'[\w .+()（）-]{1,180}\.png', filename) and not filename.startswith('.'))

def db():
    conn = sqlite3.connect(DATA / 'database/iptv.db', timeout=20)
    conn.execute('PRAGMA journal_mode=WAL')
    return conn

with db() as conn:
    conn.execute('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)')
    conn.execute('INSERT OR IGNORE INTO state VALUES (1, 0, ?)', (json.dumps({'lists': [], 'epg': ''}),))
    conn.execute('CREATE TABLE IF NOT EXISTS history (revision INTEGER PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL)')

# 保存在数据卷中，重建容器不会重置账号或登录密钥。
with db() as conn:
    conn.execute('CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL, version TEXT NOT NULL)')
    conn.execute('CREATE TABLE IF NOT EXISTS security (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    conn.execute('INSERT OR IGNORE INTO security VALUES (?,?)', ('session_key', secrets.token_hex(32)))
    app.secret_key = conn.execute("SELECT value FROM security WHERE key='session_key'").fetchone()[0]
    # v0.1 的 .env 仅用于一次迁移。已存在网页账号时绝不覆盖。
    if PASSWORD and not conn.execute('SELECT 1 FROM account WHERE id=1').fetchone():
        conn.execute('INSERT INTO account VALUES (1,?,?,?)',
                     (USERNAME, generate_password_hash(PASSWORD), secrets.token_hex(16)))

def account():
    with db() as conn:
        return conn.execute('SELECT username,password_hash,version FROM account WHERE id=1').fetchone()

def logged_in(record=None):
    record = record or account()
    return bool(record and session.get('account_version') == record[2])

# 单进程多线程下限制错误登录频率；重启可清空，不永久锁定。
login_attempts = {}
attempt_lock = Lock()
def throttled():
    peer = request.remote_addr or ''
    now = monotonic()
    with attempt_lock:
        attempts = [t for t in login_attempts.get(peer, []) if now - t < 60]
        if len(login_attempts) > 1024:
            login_attempts.clear()
        login_attempts[peer] = attempts
        if len(attempts) >= 10: return True
        attempts.append(now)
    return False

def start_session(record):
    session.clear()
    session['account_version'] = record[2]
    session.permanent = True

def credentials(raw):
    username = clean(raw.get('username', ''), 80)
    password = raw.get('password', '')
    if not username: raise ValueError('请输入用户名')
    if not isinstance(password, str) or not 8 <= len(password) <= 200:
        raise ValueError('密码需为 8–200 个字符')
    return username, password

@app.route('/api/auth/status')
def auth_status():
    record = account()
    return jsonify(initialized=bool(record), authenticated=logged_in(record),
                   username=record[0] if logged_in(record) else '')

@app.route('/api/auth/setup', methods=['POST'])
def auth_setup():
    try:
        username, password = credentials(request.get_json())
        password_hash = generate_password_hash(password)
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            if conn.execute('SELECT 1 FROM account WHERE id=1').fetchone():
                return jsonify(error='账号已初始化，请登录'), 409
            version = secrets.token_hex(16)
            conn.execute('INSERT INTO account VALUES (1,?,?,?)', (username, password_hash, version))
        start_session((username, password_hash, version))
        return jsonify(ok=True, username=username)
    except (ValueError, TypeError, AttributeError) as error:
        return jsonify(error=str(error)), 400

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    if throttled(): return jsonify(error='尝试次数过多，请一分钟后重试'), 429
    raw = request.get_json() or {}
    if not isinstance(raw, dict): return jsonify(error='请求格式错误'), 400
    record = account()
    if not record: return jsonify(error='请先初始化账号'), 409
    username, password = raw.get('username', ''), raw.get('password', '')
    if (not isinstance(username, str) or not isinstance(password, str) or len(password) > 200
        or username != record[0] or not check_password_hash(record[1], password)):
        return jsonify(error='用户名或密码错误'), 401
    start_session(record)
    return jsonify(ok=True, username=record[0])

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify(ok=True)

@app.route('/api/auth/account', methods=['PUT'])
def auth_account():
    try:
        raw = request.get_json()
        record = account()
        old = raw.get('current_password', '')
        if not isinstance(old, str) or len(old) > 200 or not check_password_hash(record[1], old):
            return jsonify(error='当前密码错误'), 400
        username = clean(raw.get('username', ''), 80)
        password = raw.get('password', '') or old
        username, password = credentials({'username': username, 'password': password})
        version = secrets.token_hex(16)
        password_hash = generate_password_hash(password)
        with db() as conn:
            changed = conn.execute('UPDATE account SET username=?,password_hash=?,version=? WHERE id=1 AND version=?',
                                  (username, password_hash, version, record[2])).rowcount
            if not changed: return jsonify(error='账号已修改，请重新登录'), 409
        start_session((username, password_hash, version))
        return jsonify(ok=True, username=username)
    except (ValueError, TypeError, AttributeError) as error:
        return jsonify(error=str(error)), 400

def read_state():
    with db() as conn:
        revision, payload = conn.execute('SELECT revision,payload FROM state WHERE id=1').fetchone()
    state = json.loads(payload)
    for item in state['lists']:
        for ch in item['channels']:
            if 'fcc_url' not in ch:
                ch['url'], ch['fcc_url'] = separate_fcc(ch['url'])
    state['revision'] = revision
    return state

def clean(value, limit=2048):
    if not isinstance(value, str) or len(value) > limit or any(ord(c) < 32 for c in value):
        raise ValueError('字段过长、类型错误或含控制字符')
    return value.strip()

def url(value, schemes=('http', 'https', 'rtsp', 'rtp', 'udp')):
    value = clean(value, 8192)
    if value and (urlsplit(value).scheme.lower() not in schemes or not urlsplit(value).netloc):
        raise ValueError('链接格式无效：' + value[:80])
    return value

def separate_fcc(stream):
    parts = urlsplit(stream)
    query = parts.query.split('&') if parts.query else []
    value = ''
    kept = []
    for fragment in query:
        key, _, val = fragment.partition('=')
        if unquote(key) == 'fcc': value = unquote(val)
        else: kept.append(fragment)
    return urlunsplit(parts._replace(query='&'.join(kept))), value

def fcc_address(value):
    value = clean(value, 2048)
    if not value: return ''
    if '://' in value:
        parsed = urlsplit(value)
        params = parse_qs(parsed.query)
        if 'fcc' in params: value = params['fcc'][-1]
        elif parsed.scheme in ('udp', 'rtp', 'fcc') and parsed.path in ('', '/'):
            value = parsed.netloc
        else: raise ValueError('FCC 请填写 IP:端口，或带 fcc 参数的 rtp2httpd 链接')
    endpoint = urlsplit('//' + value)
    try: port = endpoint.port
    except ValueError: raise ValueError('FCC 端口无效')
    if (not endpoint.hostname or not port or endpoint.username or endpoint.password
        or endpoint.path or endpoint.query or endpoint.fragment or any(c.isspace() for c in value)
        or not re.fullmatch(r'[a-zA-Z0-9_.:\[\]-]+', value)):
        raise ValueError('FCC 地址格式应为 IP:端口，例如 10.255.14.152:15970')
    return value

def playback_url(ch):
    stream = ch['url']
    fcc = ch.get('fcc_url', '')
    if not fcc: return stream
    stream, _ = separate_fcc(stream)
    parts = urlsplit(stream)
    query = parts.query + ('&' if parts.query else '') + 'fcc=' + quote(fcc, safe=':[]')
    path = parts.path or ('/' if parts.scheme in ('rtp', 'udp') else '')
    return urlunsplit(parts._replace(path=path, query=query))

def validate(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get('lists'), list) or len(raw['lists']) > 100:
        raise ValueError('配置必须包含 lists 数组，最多 100 套列表')
    out = {'epg': url(raw.get('epg', ''), ('http', 'https')), 'lists': []}
    ids = set()
    slugs = set()
    total = 0
    for item in raw['lists']:
        ident = clean(item.get('id', ''), 80)
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', ident) or ident in ids:
            raise ValueError('列表 ID 必须唯一且只包含字母、数字、下划线、短横线')
        ids.add(ident)
        slug = clean(item.get('slug', ''), 24).lower()
        if slug:
            if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,23}', slug):
                raise ValueError('订阅短名称需为 1–24 位字母、数字、下划线或短横线，以字母或数字开头')
            if slug in {'tv', 'api', 'static', 'logo', 'lists', 'healthz'}:
                raise ValueError('此订阅短名称为系统保留名称，请换一个')
            if slug in slugs: raise ValueError('订阅短名称不能重复')
            slugs.add(slug)
        name = clean(item.get('name', ''), 200)
        if not name: raise ValueError('列表名称不能为空')
        groups = item.get('groups', [])
        channels = item.get('channels', [])
        if not isinstance(groups, list) or not isinstance(channels, list): raise ValueError('分组或频道格式错误')
        groups = [clean(g, 200) for g in groups]
        if any(not g or ',' in g or '"' in g for g in groups) or len(set(groups)) != len(groups):
            raise ValueError('分组不能为空、重复或包含逗号/双引号')
        result = {'id': ident, 'name': name, 'slug': slug, 'enabled': bool(item.get('enabled', True)),
                  'epg': url(item.get('epg', ''), ('http', 'https')), 'groups': groups, 'channels': []}
        channel_ids = set()
        for ch in channels:
            cid = clean(ch.get('id', ''), 80)
            if not cid or cid in channel_ids: raise ValueError('频道 ID 缺失或重复')
            channel_ids.add(cid)
            name = clean(ch.get('name', ''), 200)
            group = clean(ch.get('group', ''), 200)
            if not name or ',' in name: raise ValueError('频道名称不能为空或包含逗号（TXT 格式限制）')
            if group not in groups: raise ValueError('频道分组不存在')
            logo = clean(ch.get('logo', ''), 8192)
            if logo.startswith('/logo/'):
                if not valid_logo_filename(logo.removeprefix('/logo/')): raise ValueError('本地 Logo 路径无效')
            else: logo = url(logo, ('http', 'https'))
            stream = url(ch.get('url', ''))
            if not stream: raise ValueError('频道播放链接不能为空')
            stream, embedded_fcc = separate_fcc(stream)
            fcc = fcc_address(ch.get('fcc_url', embedded_fcc))
            catchup = clean(ch.get('catchup', 'default'), 40)
            if catchup not in ('default', 'append', 'shift', 'flussonic', 'xc'): raise ValueError('回放类型无效')
            days = int(ch.get('days', 7))
            if not 1 <= days <= 30: raise ValueError('回放天数需为 1–30')
            result['channels'].append({'id': cid, 'name': name, 'group': group, 'logo': logo,
                'url': stream, 'fcc_url': fcc, 'catchup_url': url(ch.get('catchup_url', '')), 'catchup': catchup,
                'days': days, 'epg_id': clean(ch.get('epg_id', ''), 200),
                'epg': url(ch.get('epg', ''), ('http', 'https'))})
        total += len(channels)
        if total > 20000: raise ValueError('最多 20000 个频道')
        out['lists'].append(result)
    return out

@app.before_request
def protect():
    if not request.path.startswith('/api/'): return
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and request.headers.get('X-IPTV-Request') != '1':
        return jsonify(error='请求校验失败，请刷新页面'), 403
    public = {'/api/auth/status', '/api/auth/setup', '/api/auth/login', '/api/auth/logout'}
    if request.path not in public and not logged_in():
        return jsonify(error='请登录后操作'), 401

@app.after_request
def headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'same-origin'
    response.headers['Cache-Control'] = 'no-store' if request.path.startswith(('/api/', '/logo/')) else 'no-cache'
    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' http: https: data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'"
    return response

@app.errorhandler(400)
@app.errorhandler(413)
def bad_request(error):
    return jsonify(error='请求格式错误或文件超过 8MB'), error.code

@app.route('/healthz')
def health():
    with db() as conn: conn.execute('SELECT 1').fetchone()
    return jsonify(status='ok')

@app.route('/')
def index(): return send_from_directory(ROOT / 'static', 'index.html')

@app.route('/static/<path:filename>')
def static(filename): return send_from_directory(ROOT / 'static', filename)

@app.route('/api/state', methods=['GET', 'PUT'])
def state():
    if request.method == 'GET':
        current = read_state()
        current['base_url'] = request.host_url.rstrip('/')
        return jsonify(current)
    try:
        raw = request.get_json()
        validated = validate(raw)
        revision = raw.get('revision')
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            old_revision, old_payload = conn.execute('SELECT revision,payload FROM state WHERE id=1').fetchone()
            if revision != old_revision: return jsonify(error='其他页面已修改配置，请刷新后重新操作'), 409
            # 配置与发布前快照在同一事务中写入，避免发布成功却没有历史。
            conn.execute('INSERT OR IGNORE INTO history VALUES (?,?,?)',
                         (old_revision, datetime.now(timezone.utc).isoformat(), old_payload))
            conn.execute('UPDATE state SET revision=?,payload=? WHERE id=1',
                         (old_revision + 1, json.dumps(validated, ensure_ascii=False)))
            conn.execute('DELETE FROM history WHERE revision NOT IN (SELECT revision FROM history ORDER BY revision DESC LIMIT 30)')
        # 保留旧版 JSON 备份格式；数据库中的事务快照才是历史的权威来源。
        try:
            (DATA / 'backup' / f'{old_revision:012d}.json').write_text(old_payload, encoding='utf-8')
            for path in sorted((DATA / 'backup').glob('*.json'))[:-30]: path.unlink(missing_ok=True)
        except OSError:
            app.logger.warning('JSON 备份写入失败，发布历史已保存在数据库中')
        return jsonify(revision=old_revision + 1, state=validated)
    except (ValueError, TypeError, AttributeError, KeyError) as error:
        return jsonify(error=str(error)), 400

@app.route('/api/validate', methods=['POST'])
def validate_draft():
    try:
        return jsonify(validate(request.get_json()))
    except (ValueError, TypeError, AttributeError, KeyError) as error:
        return jsonify(error=str(error)), 400

def migrate_history():
    """读取升级前的 30 份备份，不覆盖已有事务历史。"""
    with db() as conn:
        for path in sorted((DATA / 'backup').glob('*.json'))[-30:]:
            if not re.fullmatch(r'\d{12}\.json', path.name): continue
            revision = int(path.stem)
            if conn.execute('SELECT 1 FROM history WHERE revision=?', (revision,)).fetchone(): continue
            try:
                payload = json.dumps(validate(json.loads(path.read_text(encoding='utf-8'))), ensure_ascii=False)
                created = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()
                conn.execute('INSERT OR IGNORE INTO history VALUES (?,?,?)', (revision, created, payload))
            except (OSError, ValueError, TypeError, AttributeError, KeyError):
                app.logger.warning('跳过无效历史备份：%s', path.name)
        conn.execute('DELETE FROM history WHERE revision NOT IN (SELECT revision FROM history ORDER BY revision DESC LIMIT 30)')

@app.route('/api/history')
def history():
    with db() as conn:
        rows = conn.execute('SELECT revision,created_at,payload FROM history ORDER BY revision DESC LIMIT 30').fetchall()
    entries = []
    for revision, created, payload in rows:
        saved = json.loads(payload)
        entries.append({'revision': revision, 'created_at': created,
                        'lists': len(saved['lists']),
                        'channels': sum(len(item['channels']) for item in saved['lists'])})
    return jsonify(entries=entries, revision=read_state()['revision'])

@app.route('/api/history/<int:revision>')
def history_snapshot(revision):
    with db() as conn:
        row = conn.execute('SELECT payload FROM history WHERE revision=?', (revision,)).fetchone()
    if not row: return jsonify(error='历史版本不存在或已超过保留范围'), 404
    return jsonify(state=validate(json.loads(row[0])), revision=revision)

migrate_history()

ATTR = re.compile(r'([\w-]+)="([^"]*)"')
def parse_playlist(text):
    if not isinstance(text, str): raise ValueError('请提供文本')
    channels, groups, epg = [], [], ''
    group, pending = '未分组', None
    for line in text.lstrip('\ufeff').splitlines():
        line = line.strip()
        if not line: continue
        if line.startswith('#EXTM3U'):
            a = dict(ATTR.findall(line)); epg = a.get('x-tvg-url', a.get('url-tvg', ''))
        elif line.startswith('#EXTINF:'):
            # 找到引号之外的逗号，允许属性 URL 含逗号。
            quoted = False; split = None
            for i, char in enumerate(line):
                if char == '"': quoted = not quoted
                elif char == ',' and not quoted: split = i; break
            if split is None: raise ValueError('EXTINF 缺少频道名称')
            a = dict(ATTR.findall(line[:split]))
            pending = {'name': line[split+1:], 'group': a.get('group-title') or '未分组',
                'logo': a.get('tvg-logo', ''), 'epg_id': a.get('tvg-id', ''), 'epg': '',
                'catchup_url': a.get('catchup-source', ''), 'catchup': a.get('catchup', 'default'),
                'days': a.get('catchup-days', '7')}
        elif line.startswith('#'): continue
        else:
            if pending is not None:
                ch = pending; ch['url'] = line; pending = None
            elif ',#genre#' in line:
                group = line.split(',#genre#', 1)[0]
                if group not in groups: groups.append(group)
                continue
            elif ',' in line:
                parts = line.split(',', 2)
                ch = {'name': parts[0], 'url': parts[1], 'group': group,
                      'catchup_url': parts[2] if len(parts) > 2 else ''}
            else: raise ValueError('无法解析此行：' + line[:80])
            ch['id'] = secrets.token_hex(8)
            if ch['group'] not in groups: groups.append(ch['group'])
            channels.append(ch)
    if pending is not None: raise ValueError('最后一个频道缺少播放链接')
    if not channels: raise ValueError('未找到频道')
    parsed = validate({'epg': '', 'lists': [{'id': 'import', 'name': '导入', 'groups': groups, 'channels': channels, 'epg': epg}]})['lists'][0]
    return parsed

@app.route('/api/import', methods=['POST'])
def import_file():
    try: return jsonify(parse_playlist(request.get_json().get('text')))
    except (ValueError, TypeError, AttributeError) as error: return jsonify(error=str(error)), 400

@app.route('/api/backup')
def export_backup():
    return Response(json.dumps(read_state(), ensure_ascii=False, indent=2), mimetype='application/json',
                    headers={'Content-Disposition': 'attachment; filename=iptv-backup.json'})

# 台标删除记录保留在数据库中，兼容旧版本的隐藏状态。
with db() as conn:
    conn.execute('CREATE TABLE IF NOT EXISTS hidden_logos (name TEXT PRIMARY KEY)')

def logo_catalog(conn):
    hidden = {row[0] for row in conn.execute('SELECT name FROM hidden_logos')}
    uploaded = {p.name for p in (DATA / 'logo').glob('*.png') if valid_logo_filename(p.name)}
    return sorted(uploaded - hidden)

def canonical_logo(name):
    return LOGO_ALIASES.get(name, name)

def logo_users(filename, payload):
    users = []
    for item in payload.get('lists', []):
        for channel in item.get('channels', []):
            value = channel.get('logo', '')
            parts = urlsplit(value)
            # 仅本站相对地址或当前主机的绝对地址属于本地台标。
            if parts.netloc and parts.netloc.lower() != request.host.lower(): continue
            path = unquote(parts.path)
            if path.startswith('/logo/') and canonical_logo(path[6:]) == filename:
                users.append({'list': item['name'], 'name': channel['name']})
    return users

@app.route('/api/logos', methods=['GET', 'POST'])
def logos():
    if request.method == 'GET':
        with db() as conn:
            names = logo_catalog(conn)
            payload = json.loads(conn.execute('SELECT payload FROM state WHERE id=1').fetchone()[0])
        entries = [{'name': name, 'path': '/logo/' + name,
                    'uploaded': (DATA / 'logo' / name).is_file(),
                    'users': logo_users(name, payload)} for name in names]
        return jsonify(logos=['/logo/' + name for name in names], entries=entries,
                       builtin=[],
                       aliases={**LOGO_ALIASES, **MATCH_ALIASES})
    file = request.files.get('file')
    if not file: return jsonify(error='请选择图片'), 400
    original_name = unicodedata.normalize('NFC', (file.filename or '').replace('\\', '/').split('/')[-1])
    if Path(original_name).suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        return jsonify(error='仅支持 PNG/JPEG/WebP 文件'), 400
    filename = canonical_logo(Path(original_name).stem + '.png')
    if not valid_logo_filename(filename):
        return jsonify(error='文件名请使用频道名称、数字、空格、加号、括号或短横线，最多 180 个字符'), 400
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(file.stream, formats=('PNG', 'JPEG', 'WEBP')) as original:
                original.load()
                image = ImageOps.exif_transpose(original).convert('RGBA')
                image.thumbnail((300, 180), Image.Resampling.LANCZOS)
                output = io.BytesIO()
                image.save(output, 'PNG')
        with db() as conn:
            # SQLite 写事务串行化上传与删除，跨 Gunicorn worker 也不会静默覆盖。
            conn.execute('BEGIN IMMEDIATE')
            if filename in logo_catalog(conn) and request.form.get('replace') != '1':
                payload = json.loads(conn.execute('SELECT payload FROM state WHERE id=1').fetchone()[0])
                return jsonify(error='台标库中已有同名台标', conflict=True, name=filename,
                               users=logo_users(filename, payload)), 409
            temporary = DATA / 'logo' / ('.upload-' + secrets.token_hex(12))
            try:
                temporary.write_bytes(output.getvalue())
                os.replace(temporary, DATA / 'logo' / filename)
            finally:
                temporary.unlink(missing_ok=True)
            conn.execute('DELETE FROM hidden_logos WHERE name=?', (filename,))
        return jsonify(path='/logo/' + filename, name=filename, width=image.width, height=image.height)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return jsonify(error='仅支持有效 PNG/JPEG/WebP，图片不超过 1600 万像素'), 400

@app.route('/api/logos/<filename>', methods=['DELETE'])
def delete_logo(filename):
    if not valid_logo_filename(filename): return jsonify(error='台标名称无效'), 400
    filename = canonical_logo(filename)
    with db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        if filename not in logo_catalog(conn): return jsonify(error='台标已不存在'), 404
        payload = json.loads(conn.execute('SELECT payload FROM state WHERE id=1').fetchone()[0])
        users = logo_users(filename, payload)
        if users and request.args.get('confirm') != '1':
            return jsonify(error='已有频道使用此台标，删除后图片将无法显示', in_use=True, users=users), 409
        conn.execute('INSERT OR IGNORE INTO hidden_logos VALUES (?)', (filename,))
        (DATA / 'logo' / filename).unlink(missing_ok=True)
    return jsonify(ok=True)

@app.route('/logo/<filename>')
def logo(filename):
    if not valid_logo_filename(filename): abort(404)
    canonical = canonical_logo(filename)
    with db() as conn:
        if conn.execute('SELECT 1 FROM hidden_logos WHERE name=?', (canonical,)).fetchone(): abort(404)
    if (DATA / 'logo' / canonical).is_file():
        response = send_from_directory(DATA / 'logo', canonical, max_age=0)
    elif (DATA / 'logo' / filename).is_file():
        response = send_from_directory(DATA / 'logo', filename, max_age=0)
    else:
        abort(404)
    response.headers['Cache-Control'] = 'no-store'
    return response

def quoted(value): return value.replace('"', '&quot;')
def ordered(item):
    return [ch for group in item['groups'] for ch in item['channels'] if ch['group'] == group]

def generate(lists, epg, base, fmt):
    urls = list(dict.fromkeys(x for x in [epg] + [item['epg'] for item in lists] + [ch['epg'] for item in lists for ch in item['channels']] if x))
    if fmt == 'm3u':
        lines = ['#EXTM3U' + (' x-tvg-url="' + quoted(','.join(urls)) + '"' if urls else '')]
        for item in lists:
            for ch in ordered(item):
                logo = base + quote(ch['logo'], safe='/') if ch['logo'].startswith('/logo/') else ch['logo']
                attrs = {'tvg-id': ch['epg_id'], 'tvg-name': ch['name'], 'tvg-logo': logo, 'group-title': ch['group']}
                if ch['catchup_url']: attrs.update({'catchup': ch['catchup'], 'catchup-source': ch['catchup_url'], 'catchup-days': str(ch['days'])})
                lines.extend(['#EXTINF:-1 ' + ' '.join(f'{k}="{quoted(v)}"' for k,v in attrs.items()) + ',' + ch['name'], playback_url(ch)])
    else:
        lines = []
        # 合并列表相同分组聚合，保留列表顺序和组内频道顺序。
        groups = list(dict.fromkeys(g for item in lists for g in item['groups']))
        for group in groups:
            lines.append(group + ',#genre#')
            for item in lists:
                for ch in ordered(item):
                    if ch['group'] == group:
                        lines.append(ch['name'] + ',' + playback_url(ch) + (',' + ch['catchup_url'] if ch['catchup_url'] else ''))
    return '\n'.join(lines) + '\n'

@app.route('/tv.<fmt>')
@app.route('/lists/<ident>/tv.<fmt>')
@app.route('/<slug>.<fmt>')
def subscription(fmt, ident=None, slug=None):
    if fmt not in ('m3u', 'txt'): abort(404)
    state = read_state()
    if slug is not None:
        lists = [x for x in state['lists'] if x.get('slug') == slug]
    else:
        lists = [x for x in state['lists'] if x['id'] == ident] if ident else [x for x in state['lists'] if x['enabled']]
    if (ident or slug is not None) and not lists: abort(404)
    text = generate(lists, state['epg'], request.host_url.rstrip('/'), fmt)
    return Response(text, content_type='audio/x-mpegurl; charset=utf-8' if fmt == 'm3u' else 'text/plain; charset=utf-8')
