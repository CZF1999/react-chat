# Render 部署清单（react-node + GitHub Pages 前端）

> 目标：别人打开你的前端页面，能走通 AI 问答（SSE）流程。  
> 推荐组合：**后端 → Render（免费 Web Service）**，**前端 → GitHub Pages**。

---

## 0. 先搞清楚：哪些要改代码

当前代码**不能直接**上线演示，至少要处理这几点：

| # | 问题 | 现状 | 上线前要做 |
|---|------|------|------------|
| 1 | CORS | 已支持 `CORS_ORIGIN` 环境变量（默认含 localhost） | Render 上填入 Pages 域名 |
| 2 | 前端 API 走相对路径 | `src/api/chat.ts` 与 `useChatStore` 用 `/api/...` | 生产环境改为 Render 公网地址（如 `VITE_API_BASE`） |
| 3 | MySQL 写死 localhost | `react-node/src/db.ts` | **演示可跳过**：连不上会自动「无持久化」；刷新后会话可能丢 |
| 4 | DeepSeek 真模型 | 已接好双模式（见 `deepseekService.ts`） | Render 配置 `DEEPSEEK_API_KEY` |

鉴权/菜单：本地已有 `/sbsjjc` 静态路由；GitHub Pages 演示时仍需带 `?token=dev` 或写入 `localStorage.token`。

---

## 1. 上线前代码准备（勾选）

- [x] **CORS**：`CORS_ORIGIN` 已实现；本地默认放行 5173，上线时在 Render 填 Pages 源
- [x] **DeepSeek 双模式**：有 Key 走真模型；无 Key / `demo: true` / 演示关键词走 mock
- [ ] **监听地址**：Render 要求监听 `process.env.PORT`（你已支持，保持即可）
- [x] **前端 API 基址**：已支持 `VITE_API_BASE`（默认 `/api`）；生产构建例如：
  - `VITE_API_BASE=https://your-service.onrender.com/api`
- [ ] **（可选）MySQL**：免费演示可不开库；若要持久化，另接免费 MySQL，并用 `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` 等环境变量（需改 `db.ts` 读配置）
- [x] 确认仓库已推到 GitHub（Render / Pages 都从 GitHub 拉代码）  
  → 远程：`https://github.com/CZF1999/react-chat`（本地 remote 名：`github`）

---

## 2. Render 创建 Web Service

1. 打开 [https://dashboard.render.com](https://dashboard.render.com) → 登录（可用 GitHub）
2. **New → Web Service** → 连接并选中 **`CZF1999/react-chat`**
3. 按下面填写：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **Name** | `cms-chat-api`（随意） | 会生成 `https://cms-chat-api.onrender.com` |
| **Region** | Singapore / Oregon 等 | 离用户近即可 |
| **Root Directory** | `react-node` | 单体仓库里只部署后端目录 |
| **Runtime** | Node | |
| **Build Command** | `pnpm install && pnpm build` | 编译到 `dist/` |
| **Start Command** | `pnpm start` | 即 `node dist/index.js` |
| **Instance Type** | **Free** | 闲置会休眠，首次访问约 30–60s 冷启动 |

> 若 Build 报找不到 `pnpm`：在 Render 的 Environment 里加  
> `NODE_VERSION=20`，或把 Build/Start 改成：  
> `npm install && npm run build` / `npm start`  
> （需保证 `react-node` 有可用的 lockfile；当前项目用 pnpm 更稳。）

4. **Environment（环境变量）**

| Key | Value | 必须？ |
|-----|--------|--------|
| `NODE_ENV` | `production` | 建议 |
| `CORS_ORIGIN` | `https://CZF1999.github.io` | 必须（Pages 跨域；含路径时用完整源即可） |
| `DEEPSEEK_API_KEY` | DeepSeek 控制台的 API Key | 要用真模型时必填 |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat`，可改 `deepseek-reasoner` | 可选 |
| `DEEPSEEK_SYSTEM_PROMPT` | 覆盖默认 K12 学习助手 Prompt | 可选 |
| `MYSQL_PASSWORD` 等 | 仅当你接了远程 MySQL | 演示可空 |

> **双模式说明**：配置了 `DEEPSEEK_API_KEY` 后，普通问题走 DeepSeek 流式回复；未配置 Key，或消息命中演示关键词（如「分析销售数据」），或请求体 `demo: true`，仍走本地 mock（表格/图表 SSE 演示）。Key **只放 Render Environment**，不要提交到 Git。

5. **Health Check Path**：`/api/health`
6. 点 **Create Web Service**，等 Deploy 变绿
7. 浏览器打开：`https://<你的服务>.onrender.com/api/health`  
   应返回：`{"status":"ok","deepseek":true,...}`（配了 Key 时）

---

## 3. 前端打到 GitHub Pages

### 3.1 构建注意

- 生产 `base` / router `basename`：`/react-chat/`（本地开发仍为 `/`）
- `outDir`：`jat-case-dist`（Actions 已指向该目录）
- 构建前设置 API 地址，例如：

```powershell
# Windows PowerShell
$env:VITE_API_BASE="https://cms-chat-api.onrender.com/api"
pnpm build
```

### 3.2 GitHub Actions（已接入）

仓库已含 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)。你需要在 GitHub 上完成：

1. **Settings → Pages → Source: GitHub Actions**
2. **Settings → Secrets and variables → Actions → Variables** 新增：
   - Name: `VITE_API_BASE`
   - Value: `https://<你的 Render 服务>.onrender.com/api`（Render 部署成功后再填，然后 **Re-run** workflow）
3. 推送 `master` 或手动 **Actions → Deploy GitHub Pages → Run workflow**

### 3.3 Pages 访问路径

- GitHub 仓：`https://github.com/CZF1999/react-chat`
- 仓库 pages：`https://CZF1999.github.io/react-chat/`
- 聊天页：`https://CZF1999.github.io/react-chat/sbsjjc`
- 已配置：`vite.base` + router `basename` 均为 `/react-chat/`（生产构建）

### 3.4 演示入口（鉴权）

打开：

`https://CZF1999.github.io/react-chat/?token=dev`

再进：**AI 对话** / `/sbsjjc`。

---

## 4. 联调验收清单

代码侧已就绪（CORS / `VITE_API_BASE` / Pages workflow / `/react-chat` basename）。以下需你在 Render / GitHub 控制台完成后勾选：

- [ ] Render 选中 `CZF1999/react-chat`，Root=`react-node`，Deploy 变绿
- [ ] `GET https://xxx.onrender.com/api/health` → 200，且 `deepseek: true`（若已配 Key）
- [ ] GitHub Pages Source=Actions；变量 `VITE_API_BASE` 已填并成功 Deploy
- [ ] 打开 `https://CZF1999.github.io/react-chat/?token=dev`，控制台无 CORS 报错
- [ ] `/sbsjjc` 能打开会话侧栏
- [ ] 普通问题（如「你好，介绍一下你自己」）→ DeepSeek 流式文本
- [ ] 发送「分析销售数据」→ mock 演示（思考 / 表格 / 图表）
- [ ] 第一次访问若卡住 30s+：属于 Free 休眠，属正常；可先打开 health 预热

---

## 5. 常见坑

| 现象 | 原因 | 处理 |
|------|------|------|
| Pages 上请求发到 `github.io/api/...` 404 | 仍用相对路径 `/api` | 生产改用 `VITE_API_BASE` 指向 Render |
| CORS blocked | 后端未放行 Pages 源 | 设置 `CORS_ORIGIN` 并 Redeploy |
| Render Build 失败 | Root Directory 不对 / 没装依赖 | Root=`react-node`；Build 含 `pnpm install` |
| Start 失败 `Cannot find module` | 只装了 prod 却用 `tsx` 启动 | 用 `pnpm build` + `pnpm start`（跑 `dist`） |
| 聊天能用但刷新会话没了 | 无 MySQL / 无持久化模式 | 演示可接受；要持久化再接远程库 |
| 冷启动超时 | Free 休眠 | 先访问 `/api/health` 唤醒再聊天 |
| 一直是 mock 回复 | 未配 `DEEPSEEK_API_KEY`，或触发了演示关键词 | 检查 `/api/health` 的 `deepseek`；普通问题勿带「分析/数据/销售」等演示词 |
| DeepSeek 报错写进气泡 | Key 无效 / 额度不足 / 网络 | 查 Render Logs；在控制台核对 Key |

---

## 6. 建议的最小改动顺序（实施时）

1. ~~`react-node`：CORS + DeepSeek~~（已完成）
2. 前端：统一 API 前缀读 `import.meta.env.VITE_API_BASE ?? '/api'`
3. Render 部署后端 → 配置 `DEEPSEEK_API_KEY`、`CORS_ORIGIN` → 拿到 `*.onrender.com`
4. 用该地址构建前端 → 部署 GitHub Pages
5. 用 `?token=dev` 打开：普通问题测真模型，「分析销售数据」测 mock 演示

本地验证 DeepSeek：

```powershell
cd react-node
$env:DEEPSEEK_API_KEY="sk-..."
pnpm dev
```

---

## 7. 费用与限制（Free）

- Render Free Web Service：**会休眠**；不适合当 7×24 正式服务，够作品集演示
- DeepSeek：按 token 计费，Key 勿泄露；注意控制台额度
- 不配 MySQL：**零数据库费用**，够展示 SSE / 多会话 UI / Markdown 渲染流程
- 若以后要常驻：升 Render 付费档，或换 Railway / Fly.io

---

*文档对应仓库结构：根目录前端 Vite 应用 + `react-node/` Express SSE 后端。*
