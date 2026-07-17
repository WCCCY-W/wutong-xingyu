/* =========================================================================
 * 梧桐星语 · 解读引擎
 *  - local(chart): 本地 7 维度模板解读（兜底，永远可用，零费用）
 *  - llm(chart, messages, cb): LLM 增强（OpenAI 兼容接口，浏览器直连流式）
 * 知识框架整理自倪海夏《天纪》三合派体系（公共命理知识，重写适配）
 * ========================================================================= */
window.ZW = window.ZW || {};

ZW.interpret = (function () {
  const C = ZW.CONST;

  /* ---------- 辅助 ---------- */
  function getPalace(c, name) { return c.palaces.find((p) => p.name === name); }
  function mj(p) { return (p.majorStars || []).map((s) => s.name); }
  function all(p) { return (p.majorStars || []).concat(p.minorStars || [], p.adjectiveStars || []); }
  function allNames(p) { return all(p).map((s) => s.name + (s.mutagen ? ('化' + s.mutagen) : '')); }
  function hasMut(p, t) { return all(p).some((s) => s.mutagen === t); }
  function info(name) { return C.STAR_INFO[name] || null; }

  function currentDaXian(c) {
    const m = /^(\d{4})/.exec(c.meta.date || '');
    if (!m) return null;
    const age = new Date().getFullYear() - parseInt(m[1], 10);
    let hit = null;
    c.palaces.forEach((p) => {
      if (p.decadal && p.decadal.range && age >= p.decadal.range[0] && age <= p.decadal.range[1]) hit = p;
    });
    return hit ? { palace: hit, age } : null;
  }

  /* ---------- 各维度模板 ---------- */
  function buildFate(c, soul, soulMaj) {
    const fives = c.fiveElementsClass || '';
    const gz = soul.heavenlyStem + soul.earthlyBranch;
    let t = `命宫坐${gz}，五行局属${fives}。`;
    if (soulMaj.length) {
      const main = soulMaj[0];
      const si = info(main);
      t += `命宫主星为${soulMaj.join('、')}，${si ? si.keywords : ''}。`;
      t += si && /吉/.test(si.nature) ? '格局偏吉，先天根基尚佳。' : '格局中和，宜借后天运限发力。';
    } else {
      t += '命宫无主星（空宫），气质随对宫星曜流转，适应性较强，需借三方四正综合判断。';
    }
    // 四化
    const lu = all(soul).find((s) => s.mutagen === '禄');
    const ji = all(soul).find((s) => s.mutagen === '忌');
    if (lu) t += `${lu.name}在命宫化禄，主先天福泽、人缘顺遂。`;
    if (ji) t += `${ji.name}在命宫化忌，早年易有自我纠结，需修心化解。`;
    return t;
  }

  function buildCharacter(soul, soulMaj) {
    if (!soulMaj.length) return '命宫空宫，性格灵活善变，受对宫与三方四正星曜影响明显，外柔内刚或外冷内热皆有可能。';
    const main = soulMaj[0];
    const si = info(main);
    let t = `你自带${si ? si.keywords : main}的特质。`;
    t += si ? si.desc.replace(/。.*/, '。') : '';
    // 太阴/天同柔，七杀/破军刚
    if (soulMaj.includes('七杀') || soulMaj.includes('破军') || soulMaj.includes('廉贞'))
      t += '你果决有冲劲，敢开创，但需注意孤克与起伏。';
    else if (soulMaj.includes('太阴') || soulMaj.includes('天同') || soulMaj.includes('天相'))
      t += '你温和细腻、重情义，宜以柔克刚，贵人运不差。';
    else t += '你外显稳重、内藏主张，行事有章法，宜在稳定中谋发展。';
    return t;
  }

  function buildCareer(p) {
    const ms = mj(p);
    let t = p.name + '（事业宫）主星为' + (ms.length ? ms.join('、') : '空宫（借对宫）') + '。';
    if (ms.length) t += ms.map((n) => (info(n) ? info(n).keywords : n)).join('；') + '。';
    if (hasMut(p, '权')) t += '官禄宫见化权，宜掌权创业、担纲负责，越主动越有成。';
    else t += '事业宜稳扎稳打，积累专业口碑，不宜冒进。';
    if (ms.includes('太阴') || ms.includes('天同')) t += '利文教、服务、艺术等柔性行业。';
    if (ms.includes('武曲') || ms.includes('七杀') || ms.includes('破军')) t += '利金融、军警、工程、技术等刚性行业。';
    return t;
  }

  function buildWealth(p) {
    const ms = mj(p);
    let t = '财帛宫主星为' + (ms.length ? ms.join('、') : '空宫（借对宫）') + '。';
    if (ms.includes('武曲') || ms.includes('禄存') || hasMut(p, '禄')) t += '财星坐守或见化禄，财源稳健、有聚财能力。';
    else if (ms.includes('太阴')) t += '太阴主财，宜不动产、稳健理财。';
    else t += '财来财去较明显，宜量入为出、以专业生财。';
    if (hasMut(p, '禄')) t += '化禄照财，进财机会多，宜把握。';
    if (p.minorStars.some((s) => ['地空', '地劫'].includes(s.name))) t += '财帛见地空地劫，需防意外破耗、投资谨慎。';
    return t;
  }

  function buildMarriage(p, c) {
    const ms = mj(p);
    let t = '夫妻宫主星为' + (ms.length ? ms.join('、') : '空宫（借对宫）') + '。';
    if (ms.length) t += ms.map((n) => (info(n) ? info(n).keywords : n)).join('；') + '。';
    if (p.minorStars.some((s) => ['左辅', '右弼'].includes(s.name)) && ms.length <= 1)
      t += '夫妻宫单星逢左辅/右弼，感情中易有第三者或二度婚姻之象，需用心经营。';
    if (p.minorStars.some((s) => ['红鸾', '天喜'].includes(s.name))) t += '红鸾天喜照夫妻，桃花与婚恋机遇明显。';
    if (hasMut(p, '忌')) t += '夫妻宫化忌，感情易有摩擦是非，沟通为王。';
    else t += '感情整体平顺，宜择性格互补、能共担之人。';
    return t;
  }

  function buildHealth(p) {
    const ms = mj(p);
    let t = '疾厄宫主星为' + (ms.length ? ms.join('、') : '空宫（借对宫）') + '。';
    // 子午流注提示
    const map = { '太阳': '眼目心血管', '巨门': '口舌食道肠胃', '天机': '神经肝胆', '武曲': '呼吸系统手术', '太阴': '肾水妇科', '廉贞': '血液心脑血管' };
    ms.forEach((n) => { if (map[n]) t += `${n}所在，需留意${map[n]}。`; });
    if (p.minorStars.some((s) => ['擎羊', '陀罗', '火星', '铃星'].includes(s.name))) t += '疾厄见煞星，易有突发小伤小病或慢性炎症，定期体检。';
    else t += '先天体质尚稳，唯需顺应四时、规律作息以养身。';
    return t;
  }

  function buildDaXian(c) {
    const cur = currentDaXian(c);
    if (!cur) return '暂无明确大限信息，可结合流年细看运势起伏。';
    const p = cur.palace;
    const ms = mj(p);
    let t = `你当前约 ${cur.age} 岁，正行${p.name}大限（${p.decadal.range[0]}–${p.decadal.range[1]} 岁）。`;
    t += `该限主星为${ms.length ? ms.join('、') : '空宫借星'}，`;
    if (hasMut(p, '禄')) t += '化禄入限，此十年机遇与财福俱来；';
    else if (hasMut(p, '忌')) t += '化忌入限，此十年多阻滞，宜守不宜攻；';
    else t += '此限平稳中有进退，顺势而为即可；';
    t += `重点留意${p.name}所主之事（${C.PALACE_INFO[p.name] ? C.PALACE_INFO[p.name].focus : ''}）。`;
    return t;
  }

  /* ---------- 本地 7 维解读 ---------- */
  function local(c) {
    const soul = getPalace(c, '命宫') || c.palaces[0];
    const soulMaj = mj(soul);
    return [
      { icon: '🌟', title: '命格总览', stars: soulMaj.join('、') || '空宫借星', text: buildFate(c, soul, soulMaj) },
      { icon: '🧠', title: '性格特质', stars: soulMaj.join('、') || '空宫', text: buildCharacter(soul, soulMaj) },
      { icon: '💼', title: '事业官禄', stars: allNames(getPalace(c, '官禄宫')).join('、'), text: buildCareer(getPalace(c, '官禄宫')) },
      { icon: '💰', title: '财运财富', stars: allNames(getPalace(c, '财帛宫')).join('、'), text: buildWealth(getPalace(c, '财帛宫')) },
      { icon: '💞', title: '婚姻感情', stars: allNames(getPalace(c, '夫妻宫')).join('、'), text: buildMarriage(getPalace(c, '夫妻宫'), c) },
      { icon: '🩺', title: '健康疾厄', stars: allNames(getPalace(c, '疾厄宫')).join('、'), text: buildHealth(getPalace(c, '疾厄宫')) },
      { icon: '⏳', title: '大限流年', stars: '', text: buildDaXian(c) },
    ];
  }

  /* ---------- LLM 增强 ---------- */
  const SYSTEM_PROMPT = `你是「梧桐星语」紫微斗数 AI 命理师，精通倪海夏《天纪》三合派体系。

方法论：以命宫为本，看三方四正（命宫+财帛+官禄+迁移），对宫借星，四化（禄权科忌）为纲，大限定运，身宫看晚年。
十四主星：紫微(帝星尊贵)、天机(智慧机变)、太阳(阳刚官贵)、武曲(财富刚毅)、天同(温和享福)、廉贞(才艺桃花)、天府(财库稳重)、太阴(柔美财富)、贪狼(欲望桃花)、巨门(口舌是非)、天相(辅佐印绶)、天梁(荫护医药)、七杀(将星孤克)、破军(开创变动)。
六吉：左辅右弼文昌文曲天魁天钺；六煞：擎羊陀罗火星铃星地空地劫。化禄主财进、化权主掌控、化科主名声、化忌主阻滞。
吉格如紫府同宫、机月同梁、禄马交驰、火贪格、魁钺夹命；凶格如廉贞三凶、羊陀迭并、空劫夹命。

重要规则：
- 你拥有一个联网搜索工具 search_web，可在需要时主动调用以获取实时信息。当用户问赛事、新闻、比分、天气、股价等时效性问题，**应当调用 search_web 确认最新事实**，再结合命盘分析。
- 调用策略：用具体关键词搜索，如"2026 世俱杯 季军赛 比分"、"FIFA Club World Cup 2026 result"等。不要只搜笼统词如"世界杯"。
- 核实日期：搜索结果中的日期必须与"当前时间"吻合。若搜到的信息是未来或很久以前的赛事，说明搜错了，应换更精确的关键词重搜。
- **诚实原则**：如果 search_web 返回为空或搜索失败，请明确告诉用户"⚠ 未能获取到实时数据"，再基于已有知识做命理推断并标注"⚠ 非实时信息，仅供参考"。**绝对不要编造搜索结果或假装已经联网。**
- 回答中若引用了搜索到的信息，请标注具体来源或时间范围。

风格要求：
- 简体中文，亲切自然如师傅讲盘，不神秘玄乎
- 具体实用、引经据典、结合现代生活
- 客观诚实，好的说好，需注意的如实指出
- 每次回答 200-400 字，重点突出，适当分段
- 用户提问时先定位相关宫位，再看主星四化与三方四正，给出综合判断与建议`;

  function buildChartContext(c) {
    const lines = [];
    lines.push(`【基本信息】${c.meta.name}，${c.meta.gender}，生日${c.meta.date}${c.meta.isLunar ? '(农历)' : ''}，${c.meta.time}（${c.meta.timeRange}），生肖${c.meta.zodiac}，星座${c.meta.sign}，五行局${c.meta.fiveElementsClass}，出生地${c.meta.city || '未知'}。${c.meta.mindNum ? `灵感数字：${c.meta.mindNum}` : ''}`);
    lines.push(`【命宫】${c.soul || '未知'}（${c.soulBranch || ''}），【身宫】${c.body || '未知'}（${c.bodyBranch || ''}）`);
    c.palaces.forEach((p) => {
      const maj = (p.majorStars || []).map((s) => s.name + (s.mutagen ? '化' + s.mutagen : '') + (s.brightness ? '(' + s.brightness + ')' : '')).join(' ');
      const min = (p.minorStars || []).map((s) => s.name + (s.mutagen ? '化' + s.mutagen : '')).join(' ');
      lines.push(`${p.name}[${p.heavenlyStem}${p.earthlyBranch}] 主星:${maj || '空'} 辅星:${min || '无'}${p.decadal && p.decadal.range ? ' 大限' + p.decadal.range[0] + '-' + p.decadal.range[1] : ''}`);
    });
    return lines.join('\n');
  }

  // 默认服务商（baseurl / model 留空时回退到此）
  const DEFAULT_PROVIDER = { baseurl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-flash', label: 'DeepSeek' };

  // 联网搜索工具定义（OpenAI 兼容 Tool Calls 格式）
  const SEARCH_TOOL = {
    type: 'function',
    function: {
      name: 'search_web',
      description: '搜索实时信息：新闻、赛事比分、天气、股价、人物近期动态等。当用户问时效性事实、或你不确定某信息的真实性时调用。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '具体搜索关键词，务必精确，例如"2026 世俱杯 季军赛 比分"而非笼统的"世界杯"。' },
        },
        required: ['query'],
      },
    },
  };

  // 前端搜索代理（Cloudflare Worker）调用 —— 真正执行联网搜索的地方
  async function searchWeb(query) {
    const cfg = (ZW.app && ZW.app.getLLMConfig && ZW.app.getLLMConfig()) || {};
    const workerUrl = (cfg.searchUrl && cfg.searchUrl.trim()) || '';
    if (!workerUrl) throw new Error('未配置搜索代理 URL（设置里填 Cloudflare Worker 地址）');
    const r = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error('搜索代理返回 ' + r.status + ' ' + t.slice(0, 200));
    }
    const data = await r.json().catch(() => ({}));
    const results = Array.isArray(data.results) ? data.results : [];
    if (!results.length) return { text: '（联网搜索未检索到相关结果）', summary: '0 条' };
    const text = results
      .map((x, i) => `[${i + 1}] ${x.title || ''}\n${x.url || ''}\n${x.content || ''}`)
      .join('\n\n');
    return { text, summary: results.length + ' 条' };
  }

  // 流式调用 OpenAI 兼容接口（支持 Tool Calls 联网：模型决定搜索 → 代理执行 → 结果回灌）
  function llm(c, messages, cb) {
    const cfg = (ZW.app && ZW.app.getLLMConfig && ZW.app.getLLMConfig()) || null;
    if (!cfg || !cfg.apikey) { cb.onError && cb.onError('未配置 LLM（设置里填 Key 即启用增强）'); return; }
    const base = (cfg.baseurl && cfg.baseurl.trim()) || DEFAULT_PROVIDER.baseurl;
    const model = (cfg.model && cfg.model.trim()) || DEFAULT_PROVIDER.model;

    // 注入当前日期时间到系统提示词（LLM 不知道"现在"是哪年哪月）
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const sys = SYSTEM_PROMPT + `\n\n【当前时间】今天是 ${dateStr} ${timeStr}。回答中涉及"当前""今天""今年"等时间概念时，请以此为准。`
      + '\n\n以下是命主完整命盘数据，请基于此解读：\n' + buildChartContext(c);
    const url = base.replace(/\/+$/, '') + '/chat/completions';

    // 一轮对话：useTools=true 时附带 search_web 工具，让模型自行决定要不要联网
    function runTurn(msgs, useTools) {
      const body = {
        model: model,
        messages: [{ role: 'system', content: sys }].concat(msgs),
        stream: true, temperature: 0.8,
      };
      if (useTools) body.tools = [SEARCH_TOOL];

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apikey },
        body: JSON.stringify(body),
      }).then(async (r) => {
        if (!r.ok) {
          let errBody = '';
          try { errBody = await r.text(); } catch (e2) { /* ignore */ }
          const detail = errBody ? (' · ' + errBody.slice(0, 300)) : '';
          cb.onError && cb.onError('接口返回 ' + r.status + detail +
            (r.status === 404 ? '\n（可能原因：模型名不存在 / URL 错误 / 请检查设置）' : ''));
          return;
        }
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let fullContent = '';
        let toolCalls = [];
        const pump = () => reader.read().then(({ done, value }) => {
          if (done) { finishTurn(msgs, fullContent, toolCalls); return; }
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const d = line.slice(5).trim();
            if (d === '[DONE]') { finishTurn(msgs, fullContent, toolCalls); return; }
            try {
              const j = JSON.parse(d);
              const delta = j.choices && j.choices[0] && j.choices[0].delta;
              if (!delta) continue;
              if (delta.content) { fullContent += delta.content; cb.onDelta && cb.onDelta(delta.content); }
              if (delta.tool_calls) accumulateToolCalls(toolCalls, delta.tool_calls);
            } catch (e) { /* 忽略心跳 */ }
          }
          return pump();
        });
        pump();
      }).catch((e) => {
        const msg = e.message || String(e);
        const hint = (msg.indexOf('fetch') >= 0 || msg.indexOf('Failed') >= 0 || msg.indexOf('Network') >= 0 || msg.indexOf('CORS') >= 0)
          ? '\n（CORS 被浏览器拦截：file:// 页面无法调用外部 API。请将页面部署到 Web 服务器后使用 AI 增强功能）'
          : '';
        cb.onError && cb.onError(msg + hint);
      });
    }

    // 累积流式分片的 tool_calls（OpenAI 格式：arguments 是分片拼接的 JSON 字符串）
    function accumulateToolCalls(store, deltas) {
      for (const tc of deltas) {
        const idx = (tc.index != null) ? tc.index : store.length;
        if (idx >= store.length) store.push({ id: '', type: 'function', function: { name: '', arguments: '' } });
        const cur = store[idx];
        if (tc.id) cur.id = tc.id;
        if (tc.type) cur.type = tc.type;
        if (tc.function) {
          if (tc.function.name) cur.function.name += tc.function.name;
          if (tc.function.arguments) cur.function.arguments += tc.function.arguments;
        }
      }
    }

    // 一轮流结束：若模型触发了 search_web，则执行搜索并把结果回灌，再跑第二轮
    function finishTurn(msgs, fullContent, toolCalls) {
      const activeTc = toolCalls.filter((t) => t.function && t.function.name === 'search_web');
      if (!activeTc.length) { cb.onDone && cb.onDone(); return; }

      // 对所有 tool_calls 逐一回应（API 要求每个 tool_call_id 都有对应 tool 消息）
      const toolResponses = toolCalls.map((tc) => {
        if (tc.function && tc.function.name === 'search_web') {
          let q = '';
          try { q = (JSON.parse(tc.function.arguments || '{}').query) || ''; } catch (e) { q = ''; }
          // 只对第一个 search_web 触发 UI 回调（避免重复提示）
          if (tc === activeTc[0]) {
            cb.onToolUse && cb.onToolUse(q);
            cb.onSearch && cb.onSearch('pending');
          }
          return { call: tc, query: q, handled: true };
        }
        // 非搜索工具（未来扩展）：直接返回"不支持"
        return { call: tc, query: '', handled: false };
      });

      const searchPromises = toolResponses.map((tr) => {
        if (!tr.handled) return Promise.resolve({ text: '该工具暂不支持', summary: '0 条' });
        return tr.query ? searchWeb(tr.query) : Promise.resolve({ text: '（无查询关键词）', summary: '0 条' });
      });

      Promise.all(searchPromises).then((results) => {
        // UI 更新（只触发一次）
        if (results.length) cb.onSearch && cb.onSearch('done', results[0].summary);

        // 构建 assistant + tool 消息对
        // 关键：content 为空时必须传 null，不能传 ""，否则 DeepSeek V4 报错
        const assistMsg = {
          role: 'assistant',
          content: fullContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: tc.type || 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        };
        const toolMsgs = results.map((res, i) => ({
          role: 'tool',
          tool_call_id: toolResponses[i].call.id,
          content: res.text,
        }));

        const next = msgs.concat([assistMsg, ...toolMsgs]);
        runTurn(next, false); // 第二轮：不带工具，模型基于真实搜索结果作答
      }).catch((err) => {
        const em = (err && err.message) ? err.message : String(err);
        cb.onSearch && cb.onSearch('error', em);
        const assistMsg = {
          role: 'assistant',
          content: fullContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: tc.type || 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        };
        const toolMsgs = toolResponses.map((tr) => ({
          role: 'tool',
          tool_call_id: tr.call.id,
          content: tr.handled ? ('搜索失败：' + em) : '该工具暂不支持',
        }));
        const next = msgs.concat([assistMsg, ...toolMsgs]);
        runTurn(next, false);
      });
    }

    runTurn(messages, true);
  }

  return { local, llm, buildChartContext, SYSTEM_PROMPT, currentDaXian };
})();
