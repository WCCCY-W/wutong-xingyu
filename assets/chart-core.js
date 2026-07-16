/* =========================================================================
 * 梧桐星语 · 排盘内核（封装 iztro 专业紫微库 → 标准化 ZiweiChart）
 * 依赖：全局 iztro（assets/iztro.js）、ZW.CONST
 * ========================================================================= */
window.ZW = window.ZW || {};

(function () {
  const C = ZW.CONST;

  // iztro 宫名（多不带"宫"后缀，交友宫称"仆役"）→ 规范为带"宫"名，沿用 constants/interpret 的命名
  const PALACE_NORM = {
    '兄弟': '兄弟宫', '夫妻': '夫妻宫', '子女': '子女宫', '财帛': '财帛宫',
    '疾厄': '疾厄宫', '迁移': '迁移宫', '仆役': '交友宫', '官禄': '官禄宫',
    '田宅': '田宅宫', '福德': '福德宫', '父母': '父母宫', '命宫': '命宫',
  };
  function normName(n) { return PALACE_NORM[n] || n; }

  function normStar(s) {
    return {
      name: s.name,
      type: s.type || 'minor',
      brightness: s.brightness || '',
      mutagen: s.mutagen || '',
    };
  }

  function normPalace(p) {
    return {
      name: normName(p.name),
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars: (p.majorStars || []).map(normStar),
      minorStars: (p.minorStars || []).map(normStar),
      adjectiveStars: (p.adjectiveStars || []).map(normStar),
      isBody: false,
      isSoul: false,
      decadal: p.decadal,   // 大限年龄段 {range:[起,止], heavenlyStem, earthlyBranch}
      ages: p.ages,
    };
  }

  function generate(input) {
    const gender = input.gender === 'male' ? '男'
      : (input.gender === 'female' ? '女' : (input.gender || '男'));
    const t = (typeof input.timeIndex === 'number') ? input.timeIndex : 0;

    let astro;
    if (input.isLunar) {
      astro = iztro.astro.byLunar(input.date, t, gender, !!input.fixLeap, 'zh-CN');
    } else {
      astro = iztro.astro.bySolar(input.date, t, gender, false, 'zh-CN');
    }

    // 身宫是叠加标记，用 earthlyBranchOfBodyPalace 定位所在宫
    const bodyBranchRaw = astro.earthlyBranchOfBodyPalace;
    const palaces = (astro.palaces || []).map((p) => {
      const np = normPalace(p);
      if (np.name === '命宫') np.isSoul = true;
      if (bodyBranchRaw && np.earthlyBranch === bodyBranchRaw) np.isBody = true;
      return np;
    });

    const soulP = palaces.find((p) => p.name === '命宫');
    const bodyP = palaces.find((p) => p.isBody);

    const chart = {
      meta: {
        name: input.name || '匿名',
        gender,
        date: input.date,
        isLunar: !!input.isLunar,
        timeIndex: t,
        time: astro.time,
        timeRange: astro.timeRange,
        solarDate: astro.solarDate,
        lunarDate: astro.lunarDate,
        chineseDate: astro.chineseDate,
        zodiac: astro.zodiac,
        sign: astro.sign,
        fiveElementsClass: astro.fiveElementsClass,
        province: input.province,
        city: input.city,
        longitude: input.longitude,
        mindNum: input.mindNum || null,
      },
      // 命宫/身宫 存「地支位置」(如 午宫)，而非宫名"命宫"，供中宫与历史展示
      soul: soulP ? (soulP.earthlyBranch + '宫') : undefined,
      body: bodyP ? (bodyP.earthlyBranch + '宫') : undefined,
      soulBranch: astro.earthlyBranchOfSoulPalace || (soulP && soulP.earthlyBranch),
      bodyBranch: astro.earthlyBranchOfBodyPalace || (bodyP && bodyP.earthlyBranch),
      fiveElementsClass: astro.fiveElementsClass,
      palaces,
    };
    return chart;
  }

  /* 流年命宫（离线算法，不依赖 iztro horoscope）
   * 原理：流年地支（太岁）所在宫即该年流年命宫；
   * 相对本命盘逆时针位移 = (目标年地支 - 出生年地支) 步。 */
  function flowYear(c, year) {
    const birthYear = parseInt(String(c.meta.date || '').slice(0, 4), 10) || year;
    const yb = ((year - 4) % 12 + 12) % 12;
    const bb = ((birthYear - 4) % 12 + 12) % 12;
    const soulBi = C.BRANCHES.indexOf(c.soulBranch);
    if (soulBi < 0) return null;
    const offset = (yb - bb + 12) % 12;
    const fyBranch = C.BRANCHES[(soulBi + offset) % 12];
    const palace = c.palaces.find((p) => p.earthlyBranch === fyBranch);
    return { branch: fyBranch, palaceName: palace ? palace.name : null, age: year - birthYear, year };
  }

  ZW.chart = { generate, normStar, normPalace, flowYear };
})();
