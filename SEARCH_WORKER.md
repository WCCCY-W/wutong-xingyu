# 联网搜索代理部署指南（Cloudflare Worker + Tavily）

梧桐星语网页本身纯前端、部署在 GitHub Pages，无法直接调用搜索引擎 API（CORS 限制 + 密钥不能暴露在前端）。
因此用 **Cloudflare Worker** 做一层「搜索代理」：浏览器 → Worker（隐藏搜索 Key、解决 CORS）→ Tavily 搜索 API。

> 为什么不用 DeepSeek 自带的 `enable_search`？
> DeepSeek **V4 官方 API 没有 `enable_search` 这个参数**，联网必须靠 **Tool Calls（函数调用）** 机制：
> 模型说「我要搜 xxx」→ 由本 Worker 真正去执行搜索 → 结果喂回模型。这正是 Claude Code 联网的同款原理。

---

## 步骤一：注册 Tavily（搜索源，免费 1000 次/月）

1. 打开 https://tavily.com ，用邮箱注册
2. 进入 Dashboard 复制 **API Key**（形如 `tvly-xxxx`）

## 步骤二：创建 Cloudflare Worker

1. 打开 https://dash.cloudflare.com （免费账号即可）
2. 左侧 **Workers & Pages** → **Create** → 取名（如 `wutong-search`）→ **Create Worker**
3. 把仓库根目录 `search-worker.js` 的**全部内容**粘贴进代码编辑器，点 **Deploy**
4. 顶部 **Settings** → **Variables** → 新增环境变量：
   - 名称 `TAVILY_KEY`，值 = 你刚复制的 Tavily Key
   - 保存
5. 部署地址形如：`https://wutong-search.<你的子域>.workers.dev`

> 想换其他搜索源（如 Brave Search）：改 `search-worker.js` 里的 `callSearch()` 即可，前端无需改动。

## 步骤三：填入网页设置

1. 打开「梧桐星语」网页 → 右上角 **AI 增强设置**
2. 在「搜索代理 URL」里粘贴上面的 Worker 地址
3. 保存

完成后，问模型「世界杯季军赛谁打谁」「今天杭州天气」等时效性问题，模型会：
`🔍 正在搜索：xxx` → `🔍 已检索 N 条资料` → 基于真实搜索结果作答并标注来源。

---

## 常见问题

- **搜索块一直转/报错**：检查 Worker 地址是否填对、Tavily Key 是否配到环境变量、Cloudflare Worker 是否已 Deploy。
- **返回 0 条**：Tavily 免费额度可能用尽，或搜索词太模糊。
- **不填搜索代理 URL**：AI 仍可正常对话，只是**无法联网**，只能基于命盘与训练知识作答（已在提示词里约束「搜不到就直说，不编造」）。
- **CORS 报错**：Worker 已设置 `Access-Control-Allow-Origin: *`，正常情况下不会。若仍报错，确认调用的是 Worker 地址而非直接调 Tavily。
