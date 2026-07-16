/* =========================================================================
 * 梧桐星语 · 历史记录（localStorage，最多 20 条，按生日+性别+时辰去重）
 * ========================================================================= */
window.ZW = window.ZW || {};

ZW.history = (function () {
  const KEY = 'wutong_history_v1';
  const MAX = 20;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function write(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); }
    catch (e) { /* 隐私模式等忽略 */ }
  }

  function save(rec) {
    const entry = {
      id: Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: rec.name || '匿名',
      gender: rec.gender,
      date: rec.date,
      isLunar: !!rec.isLunar,
      timeIndex: rec.timeIndex,
      city: rec.city || '',
      savedAt: Date.now(),
      chart: rec.chart, // 存完整命盘，回看免重排
    };
    let list = read();
    // 去重：同名同日同时辰同性别视为同一人
    list = list.filter((e) => !(e.date === entry.date && e.gender === entry.gender
      && e.timeIndex === entry.timeIndex && e.name === entry.name));
    list.unshift(entry);
    list = list.slice(0, MAX);
    write(list);
    return list;
  }

  function list() { return read(); }
  function remove(id) { const l = read().filter((e) => e.id !== id); write(l); return l; }
  function get(id) { return read().find((e) => e.id === id); }
  function clearAll() { write([]); return []; }

  return { save, list, remove, get, clearAll };
})();
