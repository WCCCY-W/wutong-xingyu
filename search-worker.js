/**
 * 梧桐星语 · 搜索代理（Cloudflare Worker）
 * -------------------------------------------------------------
 * 作用：让纯前端网页（GitHub Pages）具备「真正联网搜索」能力。
 *   - 浏览器 → 本 Worker（解决 CORS，搜索 API Key 藏在服务端，不暴露给用户）
 *   - 本 Worker → Tavily 搜索 API（对 LLM 友好的搜索服务，返回干净的内容片段）
 *   - 返回 { results: [{ title, url, content }] }
 *
 * 为什么需要它：
 *   DeepSeek V4 官方 API 没有内置联网搜索，联网靠 Tool Calls 机制 ——
 *   模型说"我要搜 xxx"，由本 Worker 真正去执行搜索并把结果喂回模型。
 *
 * 部署步骤（免费）：
 *   1. 注册 Cloudflare 账号（free 套餐即可）：https://dash.cloudflare.com
 *   2. 左侧 Workers & Pages → Create → 取名（如 wutong-search）→ Create Worker
 *   3. 把本文件内容全部粘贴进编辑器，点 Deploy
 *   4. 顶部 Settings → Variables → 新增环境变量 TAVILY_KEY = 你的 Tavily key
 *   5. 去 https://tavily.com 注册（免费 1000 次/月），复制 API Key 填到上一步
 *   6. 部署后 Worker 地址形如 https://wutong-search.<你的子域>.workers.dev
 *   7. 把这个地址填到网页「设置 → 搜索代理 URL」
 *
 * 想换其他搜索源（如 Brave）：把下方 callSearch() 里的请求换成对应接口即可。
 */
export default {
  async fetch(request, env) {
    // CORS：允许任意前端（含 GitHub Pages）调用本 Worker
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    let query = '';
    try {
      const body = await request.json();
      query = (body.query || '').toString().trim();
    } catch (e) {
      return json({ results: [], error: 'invalid body' }, 400, cors);
    }
    if (!query) {
      return json({ results: [] }, 200, cors);
    }

    try {
      const results = await callSearch(query, env);
      return json({ results }, 200, cors);
    } catch (e) {
      return json({ results: [], error: String(e && e.message ? e.message : e) }, 502, cors);
    }
  },
};

/**
 * 调用 Tavily 搜索 API。
 * 文档：https://docs.tavily.com  —— 返回 results: [{ title, url, content, score }]
 */
async function callSearch(query, env) {
  const apiKey = env.TAVILY_KEY;
  if (!apiKey) {
    throw new Error('Worker 未配置 TAVILY_KEY 环境变量');
  }
  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_depth: 'advanced',
      include_answer: false,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error('Tavily ' + resp.status + ' ' + txt.slice(0, 200));
  }
  const data = await resp.json();
  const list = Array.isArray(data.results) ? data.results : [];
  // 只保留前端需要的字段，缩短传输
  return list
    .filter((r) => r && r.content)
    .slice(0, 5)
    .map((r) => ({
      title: r.title || '',
      url: r.url || '',
      content: (r.content || '').slice(0, 1200),
    }));
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors),
  });
}
