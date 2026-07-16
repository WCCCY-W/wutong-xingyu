/* =========================================================================
 * 梧桐星语 · 紫微斗数 · 常量与知识库（全局命名空间 ZW.CONST）
 * 知识框架整理自倪海夏《天纪》三合派体系（公共命理知识，重写适配）
 * ========================================================================= */
window.ZW = window.ZW || {};

// 取单宫星曜集合（主星+辅星+杂曜）
function _palaceSet(p) {
  return ZW.CONST.makeStarSet((p.majorStars || []).concat(p.minorStars || [], p.adjectiveStars || []));
}

ZW.CONST = {
  /* 地支 → 4×4 棋盘坐标（中宫 2×2 留空放☯信息）
   * 传统地支方盘：子午卯酉居四正中线，其余填四角，地支逆时针环列 */
  BRANCH_LAYOUT: {
    '子': [0, 1], '丑': [0, 0], '寅': [1, 0], '卯': [2, 0],
    '辰': [3, 0], '巳': [3, 1], '午': [3, 2], '未': [3, 3],
    '申': [2, 3], '酉': [1, 3], '戌': [0, 3], '亥': [0, 2],
  },
  BRANCHES: ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'],
  STEMS: ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],
  SHICHEN: ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'],

  /* 亮度 → 显示等级（配色：庙旺最亮，陷最弱） */
  BRIGHTNESS_LEVEL: {
    '庙':'bright','旺':'bright','得':'good','利':'normal',
    '平':'normal','陷':'dim','不':'dim',
  },
  BRIGHTNESS_DESC: {
    '庙':'庙旺（最强）','旺':'旺相','得':'得地','利':'利益',
    '平':'平和','陷':'落陷（弱）','不':'不得地',
  },

  /* 四化含义 */
  SIHUA_INFO: {
    '禄': { name:'化禄', color:'#3ad29f', desc:'财禄增旺、顺遂，主进财得福' },
    '权': { name:'化权', color:'#4a9eff', desc:'权势掌控、掌权，宜创业主导' },
    '科': { name:'化科', color:'#f5c542', desc:'名声文书、贵人，专业技术显' },
    '忌': { name:'化忌', color:'#ff5d6c', desc:'阻滞破坏、是非，该宫事项多碍' },
  },

  /* 星曜分类（配色） */
  STAR_TYPE: {
    major:{ label:'主星', cls:'star-major' },
    soft:{ label:'吉星', cls:'star-lucky' },
    tough:{ label:'煞星', cls:'star-sha' },
    lucun:{ label:'禄存', cls:'star-lucky' },
    tianma:{ label:'天马', cls:'star-lucky' },
    flower:{ label:'桃花', cls:'star-flower' },
    helper:{ label:'杂曜', cls:'star-minor' },
    adjective:{ label:'杂曜', cls:'star-minor' },
  },

  /* 十四主星 + 重要辅星 性质 */
  STAR_INFO: {
    '紫微': { elem:'土', nature:'中性偏吉', keywords:'帝王·尊贵·独立·主观', desc:'北斗帝星，化气为官贵，众星拱卫可解煞。自尊心强、领导欲旺、主观固执，晚婚倾向。' },
    '天机': { elem:'木', nature:'吉', keywords:'智慧·机变·谋略·宗教', desc:'化气为善，主兄弟，善策划变动。聪明机智、心思细腻，宜参谋顾问宗教教育。' },
    '太阳': { elem:'火', nature:'吉', keywords:'阳刚·官贵·慷慨', desc:'化气为贵，男星父星。入庙大吉，落陷劳而无获。女命代表丈夫儿子。' },
    '武曲': { elem:'金', nature:'中性', keywords:'财富·刚毅·果断', desc:'化气为财，财星之王。刚毅果断、重义气，化禄大富，化忌主刑克官司。' },
    '天同': { elem:'水', nature:'吉', keywords:'温和·享福·随缘', desc:'化气为福，福德之星。温和善良、乐观随和、享乐主义，多桃花。' },
    '廉贞': { elem:'火', nature:'凶中带吉', keywords:'才艺·刑囚·桃花', desc:'次桃花星，武官带。迷迷眼、清秀。廉贞+七杀/破军/贪狼为三大凶格。' },
    '天府': { elem:'土', nature:'吉', keywords:'财库·稳重·保守', desc:'南斗第一星，财库守成。方脸唇红、鼻高。守财而非生财，现代代表银行机关。' },
    '太阴': { elem:'水', nature:'吉', keywords:'柔美·财富·阴柔', desc:'化富，母星妻星田宅主。女命最吉，男命易受女性影响，化忌婆媳不和。' },
    '贪狼': { elem:'水', nature:'中性', keywords:'欲望·桃花·多才', desc:'桃花星之首，亦主酒色财气赌。午宫为武官星。欲望旺盛，晚年成就。' },
    '巨门': { elem:'水', nature:'凶中带吉', keywords:'口舌·是非·善辩', desc:'化气为暗，口舌是非星。宜律师教师传媒。化禄口才生财，化忌官非口舌。' },
    '天相': { elem:'水', nature:'吉', keywords:'辅佐·行政·印绶', desc:'印星，佐才星。位高无权，宜秘书行政法务。厚道瘦高。' },
    '天梁': { elem:'土', nature:'吉', keywords:'荫护·医药·长辈', desc:'食神，文武双全。午宫入庙主一品武官。化科名声远播，逢凶化吉强。' },
    '七杀': { elem:'金', nature:'凶', keywords:'将星·果决·孤克', desc:'将帅之星，孤独果决。目大性急多疑。七杀朝斗格主武职大贵。' },
    '破军': { elem:'水', nature:'凶', keywords:'开创·变动·破坏', desc:'破坏与创新并存，叛逆，六亲缘薄。瘦瘦孤芳自赏。化禄破而后立。' },
    '文昌': { elem:'金', nature:'吉', keywords:'才华·文采·功名', desc:'文魁星，主科甲文章。化科名声，化忌考试文书受挫。' },
    '文曲': { elem:'水', nature:'吉', keywords:'口才·才艺·桃花', desc:'舌辩星，主才智技艺。与文昌同宫相辅相成，化忌口舌感情纠纷。' },
    '左辅': { elem:'土', nature:'吉', keywords:'贵人·助力·忠厚', desc:'佐助之星，主贵人。独守夫妻宫主二婚。' },
    '右弼': { elem:'水', nature:'吉', keywords:'助力·暗贵·随和', desc:'助力之星，阴贵。与左辅同为主星之辅。' },
    '天魁': { elem:'火', nature:'吉', keywords:'日贵·功名·逢凶化吉', desc:'天魁（昼贵），主功名机遇，逢凶化吉。' },
    '天钺': { elem:'火', nature:'吉', keywords:'夜贵·机遇·解厄', desc:'天钺（夜贵），主暗中求谋、机遇解厄。' },
    '禄存': { elem:'土', nature:'吉', keywords:'财旺·孤性', desc:'财星，主富。前后必有擎羊陀罗夹持，财旺而孤。' },
    '天马': { elem:'火', nature:'中', keywords:'驿马·变动·奔波', desc:'驿马星。逢禄为禄马交驰大吉，逢忌马逢忌折徒劳。' },
    '擎羊': { elem:'金', nature:'凶', keywords:'刑伤·冲动·手术', desc:'化气为刑，主刑伤手术意外官非。' },
    '陀罗': { elem:'金', nature:'凶', keywords:'拖延·暗害·纠缠', desc:'化气为忌，主暗中不快、慢性阻害。' },
    '火星': { elem:'火', nature:'凶', keywords:'急发·急凶·暴烈', desc:'火铃之星，急发急凶。遇贪狼化为火贪格，主暴发。' },
    '铃星': { elem:'火', nature:'凶', keywords:'暗火·纠缠·暴发', desc:'火星之伴，暗火。铃贪格亦主武贵暴发。' },
    '地空': { elem:'火', nature:'凶', keywords:'空耗·虚幻·破财', desc:'空亡之星，主虚耗、理想主义、难以聚财。' },
    '地劫': { elem:'火', nature:'凶', keywords:'劫耗·破损·波折', desc:'劫煞之星，主破耗波折、财物不聚。' },
    '红鸾': { elem:'水', nature:'吉', keywords:'婚恋·喜庆·桃花', desc:'主婚恋喜庆。流年逢红鸾主该年婚恋有动。' },
    '天喜': { elem:'水', nature:'吉', keywords:'喜庆·添丁·欢乐', desc:'主喜庆欢乐、婚姻添丁之喜。' },
  },

  /* 十二宫位解读要点 */
  PALACE_INFO: {
    '命宫':   { focus:'先天格局·性格外貌', tip:'解盘第一要素，必看三方四正。' },
    '兄弟宫': { focus:'兄弟·合伙人·平辈', tip:'化忌主兄弟不和或合伙破财。' },
    '夫妻宫': { focus:'婚姻·配偶特质', tip:'必配福德宫同看；左辅右弼独守主二婚。' },
    '子女宫': { focus:'子女缘分·桃花', tip:'空宫看对宫；化忌+空劫主冲突或无子。' },
    '财帛宫': { focus:'财运来源去向', tip:'权禄相逢主自己做老板。' },
    '疾厄宫': { focus:'健康·疾病', tip:'结合子午流注；太阳主眼、巨门主口食道。' },
    '迁移宫': { focus:'外出·人际·迁动', tip:'化忌冲命宫最凶；紫微在迁移主外地逢贵。' },
    '交友宫': { focus:'朋友·下属·合伙', tip:'吉星合伙大赚；巨门主朋友变仇人。' },
    '官禄宫': { focus:'事业·职业', tip:'化权入主创业掌权；宜公家则考公。' },
    '田宅宫': { focus:'不动产·家宅', tip:'财帛为出入之门，田宅为锁纳之库。' },
    '福德宫': { focus:'精神·福分·寿元', tip:'化忌主死别（夫妻未见生离必死别）。' },
    '父母宫': { focus:'父母·长辈·文书', tip:'亦主上司、契约文书。' },
  },

  /* 吉格 / 凶格判定（按宫位 / 三方四正评估，非全盘混判）
   * test(P, h)：P 为 12 宫数组；h.sames(names)=存在同宫含全部星；
   *             h.triSet=命宫三方四正(命/财帛/官禄/迁移)合并星集 */
  PATTERNS: [
    { name:'紫府同宫格', type:'吉', test:(P,h)=> h.sames(['紫微','天府']), desc:'紫微天府同宫（丑未），福禄双全，终身福厚。' },
    { name:'七杀朝斗格', type:'吉', test:(P,h)=>{ const m=P.find(p=>p.name==='命宫'); return m && m.majorStars.some(s=>s.name==='紫微') && ['申','寅'].includes(m.earthlyBranch); }, desc:'紫微在寅申坐命，七杀朝斗，爵禄荣昌，主武职大贵。' },
    { name:'机月同梁格', type:'吉', test:(P,h)=> h.triSet.hasAll(['天机','太阴','天同','天梁']), desc:'机月同梁作吏人，宜公教、传播、文化事业。' },
    { name:'禄马交驰格', type:'吉', test:(P,h)=> h.sames(['禄存','天马']), desc:'禄存与天马同宫，财随奔波而来，越动越旺。' },
    { name:'火贪格', type:'吉', test:(P,h)=> P.some(p=>{const s=_palaceSet(p); return s.has(['贪狼']) && s.hasAny(['火星','铃星']);}), desc:'贪狼逢火铃，偏财暴发，出将入相，武贵之路。' },
    { name:'魁钺夹命格', type:'吉', test:(P,h)=> h.triSet.hasAll(['天魁','天钺']), desc:'魁钺夹命或照命，逢凶化吉，贵人多助。' },
    { name:'日月并明格', type:'吉', test:(P,h)=> h.triSet.hasAll(['太阳','太阴']), desc:'日月并明，做事左右逢源，荣华可期。' },
    { name:'半空折翅', type:'凶', test:(P,h)=>{ const m=P.find(p=>p.name==='命宫'); const s=m?_palaceSet(m):null; return s && s.has(['廉贞','贪狼']) && s.dim(['廉贞','贪狼']); }, desc:'廉贞贪狼同宫落陷，约三十岁前后重大挫折。' },
    { name:'廉贞三凶', type:'凶', test:(P,h)=> P.some(p=>{const s=_palaceSet(p); return s.has(['廉贞']) && s.hasAny(['七杀','破军','贪狼']);}), desc:'廉贞+七杀/破军/贪狼为三大凶格，主血光刑伤。' },
    { name:'羊陀迭并', type:'凶', test:(P,h)=> h.sames(['擎羊','陀罗']), desc:'擎羊陀罗同宫夹制，诸事受阻，最为凶险。' },
    { name:'空劫夹命', type:'凶', test:(P,h)=> h.sames(['地空','地劫']) || (h.triSet.has(['地空']) && h.triSet.has(['地劫'])), desc:'地空地劫夹命或照命，一生虚耗，难以积累。' },
  ],

  /* 评估全部格局，返回命中列表 [{name,type,desc}] */
  evaluatePatterns(palaces){
    const sames = (names)=> palaces.find((p)=>{ const s=_palaceSet(p); return names.every((n)=>s.names.includes(n)); });
    const tri = ['命宫','财帛宫','官禄宫','迁移宫'];
    const triStars = palaces.filter((p)=>tri.includes(p.name))
      .flatMap((p)=>(p.majorStars||[]).concat(p.minorStars||[],p.adjectiveStars||[]));
    const triSet = ZW.CONST.makeStarSet(triStars);
    const h = { sames, triSet };
    const hits = [];
    this.PATTERNS.forEach((pat)=>{ try { if (pat.test(palaces, h)) hits.push(pat); } catch(e){} });
    return hits;
  },

  /* PATTERNS.test 所需的星曜集合辅助 */
  makeStarSet(stars){
    const names = stars.map(s=>s.name);
    return {
      has:(arr)=> arr.every(n=>names.includes(n)),
      hasAll:(arr)=> arr.every(n=>names.includes(n)),
      hasAny:(arr)=> arr.some(n=>names.includes(n)),
      in:()=>true,
      dim:(arr)=> stars.some(s=> arr.includes(s.name) && (s.brightness==='陷'||s.brightness==='不')),
      names,
    };
  },
};
