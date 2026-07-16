/* =========================================================================
 * 梧桐星语 · 渲染层（ZW.render）
 * 依赖：ZW.CONST / ZW.chart / ZW.interpret / ZW.history
 * 负责把标准化 ZiweiChart 画成：4×4 棋盘 / 格局 / 7维解读 / 历史 / 星曜弹窗
 * ========================================================================= */
window.ZW = window.ZW || {};

ZW.render = (function () {
  const C = ZW.CONST;

  /* ---------- 通用工具 ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // 给 chart-core 暴露的小工具（流年计算复用）
  function branchIndexOf(b) { return C.BRANCHES.indexOf(b); }

  /* ---------- 单颗星曜 ---------- */
  function starSpan(s) {
    const typeCls = (C.STAR_TYPE[s.type] && C.STAR_TYPE[s.type].cls) || 'star-minor';
    let brightness = '';
    if (s.brightness) {
      const lv = C.BRIGHTNESS_LEVEL[s.brightness];
      if (lv === 'dim') brightness = `<span class="bright-dim">${escapeHtml(s.brightness)}</span>`;
      else if (lv === 'bright' || lv === 'good') brightness = `<span class="bright-good"></span>`;
    }
    const sihua = s.mutagen
      ? `<span class="sihua sihua-${s.mutagen}">${s.mutagen}</span>` : '';
    return `<span class="star ${typeCls}" data-star="${escapeHtml(s.name)}" ` +
      `onclick="ZW.app.openStar('${escapeHtml(s.name)}');event.stopPropagation()">` +
      `${escapeHtml(s.name)}${brightness}${sihua}</span>`;
  }

  /* ---------- 宫格 ---------- */
  function palaceCell(p, row, col, focusName) {
    const isSoul = !!p.isSoul, isBody = !!p.isBody;
    let cls = 'cell clickable';
    if (isSoul) cls += ' is-soul';
    if (isBody) cls += ' is-body';
    let style = `grid-row:${row + 1};grid-column:${col + 1};`;
    if (focusName && focusName === p.name) style += 'box-shadow:inset 0 0 0 2px var(--gold-2);';

    let tag = '';
    if (isSoul) tag += '<span class="palace-tag tag-soul">命</span>';
    if (isBody) tag += '<span class="palace-tag tag-body">身</span>';

    const decadal = (p.decadal && p.decadal.range)
      ? `<div class="decadal-age">${p.decadal.range[0]}–${p.decadal.range[1]}岁</div>` : '';

    const stars = (p.majorStars || []).concat(p.minorStars || [], p.adjectiveStars || [])
      .map(starSpan).join('');

    return `<div class="${cls}" style="${style}" onclick="ZW.app.openPalace('${escapeHtml(p.name)}')">` +
      `<div class="palace-name">${escapeHtml(p.name)}<span class="gz">${escapeHtml(p.heavenlyStem)}${escapeHtml(p.earthlyBranch)}${tag}</span></div>` +
      decadal +
      `<div class="star-list">${stars || '<span class="star star-minor">（空）</span>'}</div>` +
      `</div>`;
  }

  /* ---------- 中宫 ☯ ---------- */
  function centerCell(c) {
    const m = c.meta || {};
    const soulP = c.palaces.find((p) => p.isSoul) || c.palaces.find((p) => p.name === '命宫');
    const soulMaj = (soulP && soulP.majorStars) || [];
    const soulMajHtml = soulMaj.length
      ? soulMaj.map((s) => {
          let b = '';
          if (s.brightness) {
            const lv = C.BRIGHTNESS_LEVEL[s.brightness];
            const cls = lv === 'dim' ? 'bright-dim' : (lv === 'bright' || lv === 'good' ? 'bright-good' : '');
            b = ` <span class="${cls}">${escapeHtml(s.brightness)}</span>`;
          }
          return `<span class="soul-star">${escapeHtml(s.name)}${b}</span>`;
        }).join(' ')
      : '<span class="soul-star">（空宫借星）</span>';
    return `<div class="cell center" style="grid-area:2/2/4/4;">` +
      `<div class="center-info">` +
      `<div class="big">☯</div>` +
      `<div class="ziwei-mark">紫 微 斗 数</div>` +
      `<div class="row">命宫 <b>${escapeHtml(c.soul || '—')}</b> · 身宫 <b>${escapeHtml(c.body || '—')}</b></div>` +
      `<div class="row">命宫主星 <span class="soul-stars">${soulMajHtml}</span></div>` +
      `<div class="row">五行局 <b>${escapeHtml(c.fiveElementsClass || '—')}</b></div>` +
      `<div class="row">${escapeHtml(m.zodiac || '')} ${escapeHtml(m.sign || '')}</div>` +
      `</div></div>`;
  }

  /* ---------- 棋盘主入口 ---------- */
  function board(container, c, view) {
    if (!container || !c) return;
    let focusName = null;
    if (view === 'decadal') {
      const cur = ZW.interpret.currentDaXian(c);
      if (cur) focusName = cur.palace.name;
    } else if (view === 'year') {
      const fy = ZW.chart.flowYear(c, new Date().getFullYear());
      if (fy) focusName = fy.palaceName;
    }
    let html = centerCell(c);
    c.palaces.forEach((p) => {
      const coord = C.BRANCH_LAYOUT[p.earthlyBranch];
      if (!coord) return;
      html += palaceCell(p, coord[0], coord[1], focusName);
    });
    container.innerHTML = html;
  }

  /* ---------- 格局判定 ---------- */
  function patterns(container, c) {
    if (!container || !c) return;
    let hits = [];
    try { hits = C.evaluatePatterns(c.palaces); } catch (e) { hits = []; }
    if (!hits.length) {
      container.innerHTML = '<div class="empty-tip" style="padding:24px 0;">未见明显特殊格局，星曜组合以平和观之。</div>';
      return;
    }
    container.innerHTML = hits.map((h) =>
      `<div class="pattern-item ${h.type === '吉' ? 'good' : 'bad'}">` +
      `<div class="pn">${h.type === '吉' ? '✦ ' : '⚠ '}${escapeHtml(h.name)}</div>` +
      `<div class="pd">${escapeHtml(h.desc)}</div></div>`
    ).join('');
  }

  /* ---------- 7 维解读 ---------- */
  function insights(container, c) {
    if (!container || !c) return;
    const items = ZW.interpret.local(c);
    container.innerHTML = items.map((it) => {
      const stars = (it.stars || '').split('、').filter(Boolean)
        .map((n) => `<span class="tag">${escapeHtml(n)}</span>`).join('');
      return `<div class="insight-card">` +
        `<h4><span class="ic">${it.icon}</span>${escapeHtml(it.title)}</h4>` +
        (stars ? `<div class="stars-line">${stars}</div>` : '') +
        `<p>${escapeHtml(it.text)}</p></div>`;
    }).join('');
  }

  /* ---------- 历史列表 ---------- */
  function history(container) {
    if (!container) return;
    const list = ZW.history.list();
    if (!list.length) {
      container.innerHTML = '<div class="empty-tip">还没有占卜记录，去测算一卦吧 🌳</div>';
      return;
    }
    container.innerHTML = list.map((e) => {
      const c = e.chart || {};
      const m = c.meta || {};
      return `<div class="history-card" onclick="ZW.app.viewHistory('${escapeHtml(e.id)}')">` +
        `<button class="hc-del" onclick="event.stopPropagation();ZW.app.delHistory('${escapeHtml(e.id)}')" title="删除">✕</button>` +
        `<div class="hc-title">${escapeHtml(e.name || '匿名')}</div>` +
        `<div class="hc-meta">${escapeHtml(m.gender || '')} · ${escapeHtml(m.date || '')}${m.isLunar ? '(农历)' : ''} · ${escapeHtml(m.time || '')}</div>` +
        `<div class="hc-meta">命宫 ${escapeHtml(c.soul || '—')} · 五行局 ${escapeHtml(m.fiveElementsClass || '—')}</div>` +
        `<div class="hc-time">${fmtTime(e.savedAt)}</div>` +
        `</div>`;
    }).join('');
  }

  /* ---------- 星曜详情弹窗 ---------- */
  function starDetail(container, name) {
    if (!container) return;
    const info = C.STAR_INFO[name];
    if (!info) { container.innerHTML = '<p>暂无该星曜资料。</p>'; return; }
    container.innerHTML =
      `<div class="star-detail-head"><div class="sd-name">${escapeHtml(name)}</div>` +
      `<div class="sd-elem">五行属${escapeHtml(info.elem)} · ${escapeHtml(info.nature)}</div></div>` +
      `<div class="sd-row"><span class="k">核心特质</span><span class="sd-keywords">${escapeHtml(info.keywords)}</span></div>` +
      `<div class="sd-desc">${escapeHtml(info.desc)}</div>`;
  }

  /* ---------- 宫位详情弹窗（复用 star-detail 容器） ---------- */
  function palaceDetail(container, c, palaceName) {
    if (!container || !c) return;
    const p = c.palaces.find((x) => x.name === palaceName);
    if (!p) { container.innerHTML = '<p>未找到该宫位。</p>'; return; }
    const pi = C.PALACE_INFO[palaceName] || {};
    const stars = (p.majorStars || []).concat(p.minorStars || [], p.adjectiveStars || [])
      .map((s) => {
        const si = C.STAR_INFO[s.name];
        const sihua = s.mutagen ? `<span class="sihua sihua-${s.mutagen}">${s.mutagen}</span>` : '';
        const bright = s.brightness ? `（${escapeHtml(s.brightness)}）` : '';
        return `<span class="tag" style="cursor:pointer;" onclick="ZW.app.openStar('${escapeHtml(s.name)}');event.stopPropagation()">${escapeHtml(s.name)}${bright}${sihua}${si ? ' · ' + escapeHtml(si.nature) : ''}</span>`;
      }).join(' ');
    container.innerHTML =
      `<div class="star-detail-head"><div class="sd-name">${escapeHtml(palaceName)}</div>` +
      `<div class="sd-elem">${escapeHtml(p.heavenlyStem)}${escapeHtml(p.earthlyBranch)}${p.isSoul ? ' · 命宫' : ''}${p.isBody ? ' · 身宫' : ''}</div></div>` +
      (pi.focus ? `<div class="sd-row"><span class="k">看盘要点</span>${escapeHtml(pi.focus)}</div>` : '') +
      (pi.tip ? `<div class="sd-row"><span class="k">师傅提醒</span>${escapeHtml(pi.tip)}</div>` : '') +
      `<div class="sd-row"><span class="k">宫内星曜</span></div>` +
      `<div class="sd-desc">${stars || '空宫（借对宫星曜论之）'}</div>`;
  }

  return { board, patterns, insights, history, starDetail, palaceDetail, escapeHtml, fmtTime, branchIndexOf };
})();
