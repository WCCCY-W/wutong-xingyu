/* =========================================================================
 * 梧桐星语 · 主控制器（ZW.app）
 * 串联：输入表单 → 排盘 → 渲染 → 双轨 AI 对话 → 历史记录
 * 纯前端 file:// 双击即用；LLM 默认增强，无 Key 降级本地模板
 * ========================================================================= */
window.ZW = window.ZW || {};

ZW.app = (function () {
  const LLM_KEY = 'wutong_llm_v1';
  const DEFAULT_QUESTIONS = '性格,事业,财运';

  // 免费 LLM 服务商预设（选完自动填 baseurl+model，用户只需填自己的 Key）
  // 注册地址见设置弹窗提示
  const PROVIDERS = {
    deepseek:   { label: 'DeepSeek（推荐·国内直连）', baseurl: 'https://api.deepseek.com/v1', model: 'deepseek-chat',
                  signup: 'https://platform.deepseek.com', note: '注册即送 500 万 token 免费额度，填 sk- 开头 Key 即可' },
    gemini:     { label: 'Google Gemini（免费 tier）', baseurl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash',
                  signup: 'https://aistudio.google.com/apikey', note: 'Google AI Studio 免费申请 Key，每月有免费额度' },
    siliconflow:{ label: '硅基流动 SiliconFlow', baseurl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3',
                  signup: 'https://cloud.siliconflow.cn', note: '注册送额度，多款免费模型可选' },
    qwen:       { label: '通义千问 DashScope', baseurl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus',
                  signup: 'https://dashscope.console.aliyun.com', note: '阿里云百炼平台，有免费额度' },
    volcano:    { label: '火山方舟（字节）', baseurl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-1.6-250615',
                  signup: 'https://console.volcengine.com/ark', note: '字节方舟，doubao 模型有免费试用' },
  };

  const state = {
    cal: 'solar',          // solar | lunar
    gender: 'male',        // male | female
    view: 'born',          // born | decadal | year
    chart: null,           // 当前 ZiweiChart
    chat: [],              // 对话历史 {role,content}
    unknownTime: false,
  };

  const $ = (id) => document.getElementById(id);

  /* ===================== 初始化 ===================== */
  function init() {
    buildSelects();
    loadSettings();
    ZW.render.history($('history-list'));
    // 进入即停留在输入页
  }

  function buildSelects() {
    const y = $('f-year'), m = $('f-month'), d = $('f-day'), t = $('f-time');
    const curY = new Date().getFullYear();
    for (let yy = curY; yy >= 1920; yy--) y.appendChild(opt(yy, yy));
    for (let mm = 1; mm <= 12; mm++) m.appendChild(opt(mm, mm));
    for (let dd = 1; dd <= 31; dd++) d.appendChild(opt(dd, dd));
    const shichen = ['子时(23-1)','丑时(1-3)','寅时(3-5)','卯时(5-7)','辰时(7-9)','巳时(9-11)',
      '午时(11-13)','未时(13-15)','申时(15-17)','酉时(17-19)','戌时(19-21)','亥时(21-23)'];
    shichen.forEach((lab, i) => t.appendChild(opt(i, lab)));
    // 城市
    const city = $('f-city');
    ZW.CITIES.forEach((c) => city.appendChild(opt(c.name, c.name)));
    // 默认杭州
    city.value = '杭州';
  }
  function opt(v, label) { const o = document.createElement('option'); o.value = v; o.textContent = label; return o; }

  /* ===================== 屏幕切换 ===================== */
  function switchScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const el = $('screen-' + name);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-btn[data-screen]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-screen') === name);
    });
    if (name === 'history') ZW.render.history($('history-list'));
  }
  function goInput() { switchScreen('input'); }

  /* ===================== 输入页交互 ===================== */
  function toggleCal(type) {
    state.cal = type;
    document.querySelectorAll('.cal-opt').forEach((b) =>
      b.classList.toggle('active', b.getAttribute('data-cal') === type));
  }
  function toggleGender(g) {
    state.gender = g;
    document.querySelectorAll('.gender-opt').forEach((b) =>
      b.classList.toggle('active', b.getAttribute('data-gender') === g));
  }
  function onUnknownTime(chk) {
    state.unknownTime = chk.checked;
    $('f-time').disabled = chk.checked;
    $('f-time').style.opacity = chk.checked ? '.5' : '1';
  }

  /* ===================== 真太阳时校正（近似） ===================== */
  function solarTimeCorrection(cityName, timeIndex) {
    const city = ZW.CITIES.find((c) => c.name === cityName);
    if (!city) return { timeIndex, offset: 0 };
    // 近似时差（小时）≈ (经度 - 120) / 15，忽略均时差
    const offset = (city.lng - 120) / 15;
    const shift = Math.round(offset / 2); // 每时辰 2 小时
    let ti = ((timeIndex + shift) % 12 + 12) % 12;
    return { timeIndex: ti, offset: Number(offset.toFixed(2)), longitude: city.lng };
  }

  /* ===================== 提交排盘 ===================== */
  function submit() {
    const name = $('f-name').value.trim();
    const year = $('f-year').value;
    const month = parseInt($('f-month').value, 10);
    const day = parseInt($('f-day').value, 10);
    const rawTime = parseInt($('f-time').value, 10) || 0;
    const city = $('f-city').value;
    const mindNum = parseInt($('f-mindnum').value, 10);
    const date = `${year}-${month}-${day}`;

    const corr = solarTimeCorrection(city, rawTime);
    const timeIndex = state.unknownTime ? 0 : corr.timeIndex;

    const input = {
      name, gender: state.gender, date, isLunar: state.cal === 'lunar',
      timeIndex, fixLeap: false, province: '', city, longitude: corr.longitude,
      mindNum: (mindNum >= 1 && mindNum <= 100) ? mindNum : null,
    };

    let chart;
    try {
      chart = ZW.chart.generate(input);
    } catch (e) {
      toast('排盘失败：' + (e && e.message ? e.message : '日期可能无效，请检查后重试'));
      return;
    }
    state.chart = chart;
    state.view = 'born';

    // 历史记录（存完整命盘，免重排）
    ZW.history.save({
      name: chart.meta.name, gender: chart.meta.gender, date: chart.meta.date,
      isLunar: chart.meta.isLunar, timeIndex, city, chart,
    });

    // 跳到命盘页并渲染
    switchScreen('chart');
    renderChart();

    let hint = `已按${state.cal === 'lunar' ? '农历' : '公历'} ${date} 排出命盘`;
    if (input.mindNum) hint += ` · 灵感数字 ${input.mindNum}`;
    if (corr.offset && !state.unknownTime && corr.timeIndex !== rawTime)
      hint += `（真太阳时校正约 ${corr.offset > 0 ? '+' : ''}${corr.offset}h，时辰已调整）`;
    if (state.unknownTime)
      hint += '（时辰未知，暂按子时排盘，仅作参考）';
    toast(hint);
  }

  /* ===================== 命盘渲染 ===================== */
  function renderChart() {
    const c = state.chart;
    if (!c) return;
    $('chart-name').textContent = (c.meta.name || '匿名') + ' 的命盘';
    renderBoardAndMeta();
    ZW.render.patterns($('pattern-list'), c);
    ZW.render.insights($('insight-list'), c);
    // 重置对话
    state.chat = [];
    $('chat-box').innerHTML = '';
    $('chat-box').scrollTop = 0; // 初始滚动到顶部，与右侧顶部对齐
    renderChatQuick();
  }

  function renderBoardAndMeta() {
    const c = state.chart;
    ZW.render.board($('chart-board'), c, state.view);
    // 时间视图 tab 高亮
    document.querySelectorAll('.time-tab').forEach((b) =>
      b.classList.toggle('active', b.getAttribute('data-view') === state.view));
    // meta 文本
    const m = c.meta;
    let base = `${m.gender} · ${m.date}${m.isLunar ? '(农历)' : ''} · ${m.time || ''} · ${m.city || '未知地'} · 五行局${m.fiveElementsClass || '—'}`;
    let extra = '';
    if (state.view === 'decadal') {
      const cur = ZW.interpret.currentDaXian(c);
      extra = cur ? ` ｜ 当前大限：${cur.palace.name}（${cur.palace.decadal.range[0]}–${cur.palace.decadal.range[1]}岁）` : '';
    } else if (state.view === 'year') {
      const fy = ZW.chart.flowYear(c, new Date().getFullYear());
      extra = fy && fy.palaceName ? ` ｜ ${fy.year}流年命宫：${fy.palaceName}（${fy.age}岁）` : '';
    }
    $('chart-meta').textContent = base + extra;
  }

  function setView(view) {
    state.view = view;
    renderBoardAndMeta();
  }

  /* ===================== 弹窗 ===================== */
  function openStar(name) {
    ZW.render.starDetail($('star-detail'), name);
    openModal('modal-star');
  }
  function openPalace(name) {
    ZW.render.palaceDetail($('star-detail'), state.chart, name);
    openModal('modal-star');
  }
  function openModal(id) { $(id).classList.add('active'); }
  function closeModal(id) { $(id).classList.remove('active'); }

  /* ===================== AI 对话（双轨） ===================== */

  /* ---- 轻量 Markdown 渲染（无依赖） ---- */
  const STAR_NAMES = '紫微|天府|太阳|太阴|贪狼|天机|天同|天梁|七杀|破军|廉贞|武曲|巨门|天相';
  const PALACE_NAMES = '命宫|兄弟宫|夫妻宫|子女宫|财帛宫|疾厄宫|迁移宫|交友宫|官禄宫|田宅宫|福德宫|父母宫';
  const MUTAGEN_WORDS = '(?:化)?[禄权科忌]';

  function renderMarkdown(raw) {
    if (!raw) return '';
    let html = raw;
    // 转义 HTML 特殊字符（先做，再做 MD 解析）
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // 代码块 ```...``` → <pre><code>
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // 行内代码 `...` → <code>
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // 标题 ### / ##
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    // 加粗 + 斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // 引用 >
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // 无序列表
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // 段落拆分：连续换行 → <p>
    let lines = html.split('\n');
    let paras = [], buf = [];
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t || t.match(/^<(h[34]|ul|ol|pre|blockquote|li)/)) {
        if (buf.length) { paras.push('<p>' + buf.join(' ') + '</p>'); buf = []; }
        if (t) paras.push(t);
      } else {
        buf.push(t);
      }
    }
    if (buf.length) paras.push('<p>' + buf.join(' ') + '</p>');
    html = paras.join('\n');

    // 关键字高亮（在安全转义后、返回前）
    // 星曜名
    html = html.replace(new RegExp('(' + STAR_NAMES + ')', 'g'), '<span class="kw-star">$1</span>');
    // 四化组合（如"化禄""化忌"）
    html = html.replace(/(化(?:禄|权|科|忌))/g, '<span class="kw-mutagen">$1</span>');
    // 宫位名
    html = html.replace(new RegExp('(' + PALACE_NAMES + ')', 'g'), '<span class="kw-palace">$1</span>');
    // 吉凶词
    html = html.replace(/(大吉|大贵|主贵|主富|亨通|顺遂|吉祥)/g, '<span class="kw-good">$1</span>');
    html = html.replace(/(凶险|刑伤|破败|不利|克损|灾厄|血光|波折)/g, '<span class="kw-bad">$1</span>');

    return html;
  }

  function renderChatQuick() {
    const panel = document.querySelector('.main-chat-panel');
    if (!panel) return;
    let box = panel.querySelector('.chat-quick');
    if (box) box.remove();
    box = document.createElement('div');
    box.className = 'chat-quick';
    const qs = (getLLMConfig().questions || DEFAULT_QUESTIONS).split(',').map((s) => s.trim()).filter(Boolean);
    qs.forEach((q) => {
      const b = document.createElement('button');
      b.textContent = q;
      b.onclick = () => { $('chat-input').value = q; sendChat(); };
      box.appendChild(b);
    });
    panel.insertBefore(box, panel.querySelector('.chat-input-row'));
  }

  function appendMsg(role, text) {
    const box = $('chat-box');
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (role === 'user' ? 'user' : 'ai');
    if (role === 'user') div.textContent = text || '';
    else div.innerHTML = text ? renderMarkdown(text) : '<span class="loading">…</span>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  }

  function sendChat() {
    const input = $('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendMsg('user', text);
    state.chat.push({ role: 'user', content: text });

    // 无 Key → 本地模板降级
    const cfg = getLLMConfig();
    if (!cfg || !cfg.apikey) {
      const ans = localAnswer(text);
      appendMsg('ai', ans);
      state.chat.push({ role: 'assistant', content: ans });
      return;
    }

    const aiDiv = appendMsg('ai', '');
    let buf = '';
    ZW.interpret.llm(state.chart, state.chat.slice(0, -1).concat([{ role: 'user', content: text }]), {
      onDelta: (d) => { buf += d; aiDiv.innerHTML = renderMarkdown(buf); $('chat-box').scrollTop = $('chat-box').scrollHeight; },
      onDone: () => { state.chat.push({ role: 'assistant', content: buf }); },
      onError: (msg) => {
        const fallback = '⚠ ' + msg + '\n\n（已切换本地模板解读）\n' + localAnswer(text);
        aiDiv.innerHTML = renderMarkdown(fallback);
        state.chat.push({ role: 'assistant', content: fallback });
      },
    });
  }

  // 本地关键词匹配 7 维解读
  function localAnswer(q) {
    const map = [
      ['事业', '事业官禄'], ['工作', '事业官禄'], ['职业', '事业官禄'],
      ['财', '财运财富'], ['钱', '财运财富'], ['收入', '财运财富'],
      ['婚', '婚姻感情'], ['感情', '婚姻感情'], ['夫妻', '婚姻感情'], ['恋爱', '婚姻感情'],
      ['健康', '健康疾厄'], ['身体', '健康疾厄'], ['病', '健康疾厄'],
      ['性格', '性格特质'], ['脾气', '性格特质'], ['为人', '性格特质'],
      ['大限', '大限流年'], ['流年', '大限流年'], ['运势', '大限流年'],
      ['命', '命格总览'], ['格局', '命格总览'], ['命宫', '命格总览'],
    ];
    const items = ZW.interpret.local(state.chart);
    let title = '命格总览';
    for (const [k, t] of map) { if (q.indexOf(k) >= 0) { title = t; break; } }
    const it = items.find((x) => x.title === title) || items[0];
    return `（本地模板解读 · 配置 LLM Key 可获更个性化推演）\n\n${it.text}`;
  }

  /* ===================== 设置（LLM） ===================== */
  function loadSettings() {
    try {
      const cfg = JSON.parse(localStorage.getItem(LLM_KEY) || '{}');
      $('set-provider').value = cfg.provider || 'deepseek';
      $('set-baseurl').value = cfg.baseurl || '';
      $('set-apikey').value = cfg.apikey || '';
      $('set-model').value = cfg.model || '';
      $('set-questions').value = cfg.questions || DEFAULT_QUESTIONS;
      updateProviderNote();
    } catch (e) { /* ignore */ }
  }
  function getLLMConfig() {
    try {
      return JSON.parse(localStorage.getItem(LLM_KEY) || '{}');
    } catch (e) { return {}; }
  }
  function openSettings() {
    loadSettings();
    $('settings-hint').textContent = '';
    openModal('modal-settings');
  }
  // 选服务商 → 自动填充 baseurl + model
  function onProviderChange() {
    const p = PROVIDERS[$('set-provider').value];
    if (!p) return;
    $('set-baseurl').value = p.baseurl;
    $('set-model').value = p.model;
    updateProviderNote();
  }
  function updateProviderNote() {
    const p = PROVIDERS[$('set-provider').value];
    const hint = $('settings-hint');
    if (!p || !hint) return;
    hint.innerHTML = `${p.note}　<a href="${p.signup}" target="_blank" rel="noopener">前往注册 ↗</a>`;
  }
  function saveSettings() {
    const provider = $('set-provider').value;
    const cfg = {
      provider,
      baseurl: $('set-baseurl').value.trim(),
      apikey: $('set-apikey').value.trim(),
      model: $('set-model').value.trim(),
      questions: $('set-questions').value.trim() || DEFAULT_QUESTIONS,
    };
    try { localStorage.setItem(LLM_KEY, JSON.stringify(cfg)); } catch (e) { }
    $('settings-hint').textContent = cfg.apikey ? '已保存，AI 增强已启用 ✅' : '已保存（未填 Key，将使用本地模板解读）';
    setTimeout(() => closeModal('modal-settings'), 700);
  }
  function resetSettings() {
    $('set-provider').value = 'deepseek';
    $('set-baseurl').value = 'https://api.deepseek.com/v1';
    $('set-apikey').value = '';
    $('set-model').value = 'deepseek-chat';
    $('set-questions').value = DEFAULT_QUESTIONS;
    updateProviderNote();
  }

  /* ===================== 历史 ===================== */
  function viewHistory(id) {
    const rec = ZW.history.get(id);
    if (!rec || !rec.chart) { toast('记录已损坏或不存在'); return; }
    state.chart = rec.chart;
    state.view = 'born';
    switchScreen('chart');
    renderChart();
  }
  function delHistory(id) {
    ZW.history.remove(id);
    ZW.render.history($('history-list'));
    toast('已删除该记录');
  }

  /* ===================== Toast ===================== */
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // 暴露接口（HTML 内联 onclick 调用）
  return {
    init, switchScreen, goInput, toggleCal, toggleGender, onUnknownTime, submit,
    setView, openStar, openPalace, openModal, closeModal, sendChat,
    openSettings, saveSettings, resetSettings, getLLMConfig, onProviderChange,
    viewHistory, delHistory, renderHistory: () => ZW.render.history($('history-list')),
  };
})();

// 启动
document.addEventListener('DOMContentLoaded', ZW.app.init);
