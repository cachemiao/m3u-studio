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
    const selected = new Set(ids);
    if (!selected.size) throw Error('请先选择频道');
    if (changes.group !== undefined && !list.groups.includes(changes.group)) throw Error('目标分组不存在');
    if (changes.replace && !changes.replace.from) throw Error('查找内容不能为空');
    let count = 0;
    list.channels.forEach(ch => {
      if (!selected.has(ch.id)) return;
      const before = JSON.stringify(ch);
      for (const key of ['group', 'epg', 'fcc_url']) if (changes[key] !== undefined) ch[key] = changes[key];
      if (changes.replace) {
        for (const key of changes.replace.fields) {
          if (!['url', 'catchup_url'].includes(key)) throw Error('不支持替换此字段');
          ch[key] = (ch[key] || '').split(changes.replace.from).join(changes.replace.to);
        }
      }
      if (JSON.stringify(ch) !== before) count++;
    });
    return {draft, count};
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
    return null;
  }
  return {clone, content, fingerprint, createHistory, batchEdit, logoName, normalizeName, matchLogo};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AliceEditorCore;
