'use strict';
// Pure draft operations, shared by the UI and regression tests.
const AliceEditorCore = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const content = state => clone({lists: state.lists, epg: state.epg || ''});
  const orderedKeys = value => Array.isArray(value) ? value.map(orderedKeys)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, orderedKeys(value[key])])) : value;
  const fingerprint = state => JSON.stringify(orderedKeys(content(state)));
  function createHistory(limit = 50, maxBytes = 16 * 1024 * 1024) {
    let baseline, back = [], forward = [];
    const trim = stack => {
      let bytes = stack.reduce((sum, entry) => sum + entry.length * 2, 0);
      while (stack.length > limit || (bytes > maxBytes && stack.length > 1)) bytes -= stack.shift().length * 2;
    };
    return {
      reset(state) { baseline = fingerprint(state); back = []; forward = []; },
      record(state) {
        const next = fingerprint(state);
        if (next === baseline) return false;
        if (baseline !== undefined) back.push(baseline);
        trim(back); forward = []; baseline = next; return true;
      },
      undo() {
        if (!back.length) return null;
        forward.push(baseline); trim(forward); baseline = back.pop(); return JSON.parse(baseline);
      },
      redo() {
        if (!forward.length) return null;
        back.push(baseline); trim(back); baseline = forward.pop(); return JSON.parse(baseline);
      },
      get canUndo() { return back.length > 0; },
      get canRedo() { return forward.length > 0; }
    };
  }
  function batchEdit(state, listId, ids, changes) {
    const draft = content(state), list = draft.lists.find(item => item.id === listId);
    if (!list) throw Error('列表已不存在');
    const transfer = changes.transfer;
    const target = transfer && draft.lists.find(item => item.id === transfer.listId);
    if (transfer && (!target || target === list)) throw Error('请选择其他目标列表');
    if (transfer && !['move', 'copy'].includes(transfer.mode)) throw Error('请选择移动或复制');
    if (transfer?.group !== undefined && (typeof transfer.group !== 'string' || !transfer.group.trim() || transfer.group.length > 200 || /[,\"\r\n]/.test(transfer.group))) throw Error('目标分组名称无效');
    const transfers = [], usedIds = new Set(target?.channels.map(ch => ch.id)), targetGroups = new Set(target?.groups);
    const selected = new Set(ids);
    if (!selected.size) throw Error('请先选择频道');
    if (changes.group !== undefined && !list.groups.includes(changes.group)) throw Error('目标分组不存在');
    if (changes.replace && !changes.replace.from) throw Error('查找内容不能为空');
    let count = 0;
    list.channels.forEach(original => {
      if (!selected.has(original.id)) return;
      const ch = transfer?.mode === 'copy' ? clone(original) : original;
      const before = JSON.stringify(ch);
      for (const key of ['group', 'epg', 'fcc_url']) if (changes[key] !== undefined) ch[key] = changes[key];
      if (changes.replace) {
        for (const key of changes.replace.fields) {
          if (!['url', 'catchup_url'].includes(key)) throw Error('不支持替换此字段');
          ch[key] = (ch[key] || '').split(changes.replace.from).join(changes.replace.to);
        }
      }
      if (transfer) {
        const copied = clone(ch);
        if (transfer.group !== undefined) copied.group = transfer.group.trim();
        let suffix = 1;
        do { copied.id = `${ch.id.slice(0, 50)}_transfer_${suffix++}`; } while (usedIds.has(copied.id));
        usedIds.add(copied.id);
        if (!targetGroups.has(copied.group)) { target.groups.push(copied.group); targetGroups.add(copied.group); }
        target.channels.push(copied);
        transfers.push({sourceId: ch.id, targetId: copied.id});
      }
      if (transfer || JSON.stringify(ch) !== before) count++;
    });
    if (transfer?.mode === 'move') list.channels = list.channels.filter(ch => !selected.has(ch.id));
    return {draft, count, total: selected.size, skipped: selected.size - count, transfers};
  }
  function importChannels(state, parsed, options) {
    const draft = content(state);
    if (!parsed.channels.length) return {draft, listId: options.listId, count: 0};
    let list;
    if (options.create) {
      const name = options.name.trim();
      if (!name || name.length > 200) throw Error('列表名称不能为空');
      if (!options.id || draft.lists.some(l => l.id === options.id)) throw Error('列表 ID 必须唯一');
      list = {id: options.id, name, enabled: true, epg: '', groups: [], channels: []};
      draft.lists.push(list);
    } else {
      list = draft.lists.find(l => l.id === options.listId);
      if (!list) throw Error('列表已不存在');
    }
    const used = new Set(list.channels.map(ch => ch.id));
    for (const original of parsed.channels) {
      const ch = clone(original), base = ch.id; let suffix = 1;
      while (used.has(ch.id)) ch.id = `${base.slice(0, 50)}_import_${suffix++}`;
      used.add(ch.id); list.channels.push(ch);
    }
    list.groups = [...new Set([...list.groups, ...parsed.groups])];
    if (parsed.epg) list.epg = parsed.epg;
    return {draft, listId: list.id, count: parsed.channels.length};
  }
  const logoName = path => {
    const name = path.split('?')[0].split('#')[0].split('/').pop();
    try { return decodeURIComponent(name).replace(/\.(?:png|jpe?g|webp|gif|svg)$/i, ''); }
    catch { return name.replace(/\.(?:png|jpe?g|webp|gif|svg)$/i, ''); }
  };
  const normalizeName = name => name.normalize('NFKC').toLowerCase()
    .replace(/[\s_\-()（）]/g, '').replace(/(?:高清|超清|标清|hd|sd)$/i, '');
  function matchLogo(channel, paths, aliases = {}) {
    const names = [channel.name, channel.epg_id].filter(Boolean).map(normalizeName);
    const resolution = normalizeName(channel.name).match(/(?:4k|8k)/)?.[0];
    // Never match a UHD channel to an ordinary logo via a shared EPG ID.
    if (resolution) paths = paths.filter(path => normalizeName(logoName(path)).includes(resolution));
    // A channel-name match takes precedence over EPG ID. Ambiguous matches stay manual.
    for (const name of names) {
      const exact = paths.filter(path => normalizeName(logoName(path)) === name);
      if (exact.length === 1) return exact[0];
      if (exact.length > 1) return null;
      const targets = new Set(Object.entries(aliases).filter(([alias]) => normalizeName(alias.replace(/\.(?:png|jpe?g|webp|gif|svg)$/i, '')) === name)
        .map(([, target]) => normalizeName(logoName(target))));
      const matches = paths.filter(path => targets.has(normalizeName(logoName(path))));
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) return null;
    }
    // Fuzzy fallback: require a clear winner and preserve channel numbers / resolution.
    const name = names[0];
    if (!name || name.length < 4) return null;
    const numberKey = value => (value.match(/\d+|\+/g) || []).join('|');
    const distance = (a, b) => {
      let row = Array.from({length: b.length + 1}, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j-1]+1, row[j]+1, row[j-1]+(a[i-1]===b[j-1]?0:1));
        row = next;
      }
      return row[b.length];
    };
    const ranked = paths.map(path => {
      const candidate = normalizeName(logoName(path));
      if (numberKey(name) !== numberKey(candidate) || /4k|8k/.test(name) !== /4k|8k/.test(candidate)) return {path, score: 0};
      return {path, score: 1-distance(name,candidate)/Math.max(name.length,candidate.length)};
    }).sort((a,b)=>b.score-a.score);
    return ranked[0]?.score >= 0.8 && (!ranked[1] || ranked[0].score-ranked[1].score >= 0.12) ? ranked[0].path : null;
  }
  function createDraftStore(storage, key) {
    return {
      save(state, baseline) { storage.setItem(key, JSON.stringify({version:1, baseline, content:content(state), savedAt:Date.now()})); },
      read() {
        const value = storage.getItem(key);
        if (!value) return null;
        const draft = JSON.parse(value);
        if (draft.version !== 1 || typeof draft.baseline !== 'string' || !Array.isArray(draft.content?.lists)) throw Error('Invalid draft');
        return draft;
      },
      clear() { storage.removeItem(key); }
    };
  }
  return {createDraftStore, clone, content, fingerprint, createHistory, batchEdit, importChannels, logoName, normalizeName, matchLogo};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AliceEditorCore;
