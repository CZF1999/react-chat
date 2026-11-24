# react-web-case · AI 智能对话

独立实现的产品内 AI 问答：前端多会话 + SSE 流式输出，后端 DeepSeek / mock 双模式。支持思考过程、Markdown（含 LaTeX / 代码高亮）、表格、ECharts、Mermaid 流程图，以及暂停续传。

> 入口路径：`/sbsjjc?token=dev`  
> 仓库（示例）：https://github.com/CZF1999/react-chat

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 · TypeScript · Vite · Zustand · Ant Design · react-virtuoso |
| 渲染 | react-markdown · KaTeX · highlight.js · ECharts · mermaid |
| 后端 | Express · SSE · DeepSeek（OpenAI 兼容流）· 可选 MySQL |

---

## 本地启动

### 1. 前端

```bash
pnpm install
pnpm dev
```

浏览器打开：http://localhost:5173/sbsjjc?token=dev

### 2. 后端（另开终端）

```bash
cd react-node
pnpm install
pnpm dev
```

默认：http://localhost:3001（前端 `/api` 已代理到此后端）

### 3. 真模型（可选）

在 `react-node` 环境中配置：

```bash
# Windows PowerShell 示例
$env:DEEPSEEK_API_KEY="sk-..."
pnpm dev
```

- **有 Key**：普通问题走 DeepSeek 流式
- **无 Key** 或命中演示关键词：走本地 mock 结构化流

---

## 演示关键词（mock）

| 发送内容 | 效果 |
|----------|------|
| `分析销售数据` | 思考过程 + Markdown + 表格 + 图表 |
| `mermaid` / 点「演示流程图」 | Mermaid 架构图渲染 |
| `坏流程图` | Mermaid 语法错误回退源码 |
| 快捷按钮「讲解这道错题」等 | 教育向讲解 / 练习 mock 流 |

---

## 能力一览

- 多会话 CRUD、按会话草稿、历史分页
- SSE 流式：`thinking` / `text` / `table` / `chart` / `data_chunk`
- 每会话独立 `AbortController`；暂停 / 继续（`resumeFrom`）/ 停止
- ~33ms 节流刷 UI；Markdown 流式未闭合围栏修补
- Mermaid：流式中展示源码，结束后懒加载出图

---

## 文档索引（面试 / 自学）

| 文档 | 用途 |
|------|------|
| [发消息全链路-面试口述.md](./发消息全链路-面试口述.md) | 点发送之后代码怎么跑 |
| [useChatStore-面试讲解.md](./useChatStore-面试讲解.md) | Store 设计口述 |
| [AI对话功能-完整学习文档.md](./AI对话功能-完整学习文档.md) | 端到端全景 + 简历话术 |
| [AI对话功能-代码详解.md](./AI对话功能-代码详解.md) | 按功能点跟代码 |
| [岗位匹配度评估-AI问答.md](./岗位匹配度评估-AI问答.md) | 与 JD 红框对照 |
| [RENDER-部署清单.md](./RENDER-部署清单.md) | GitHub Pages + Render 上线 |

---

## 部署

推荐：**前端 GitHub Pages** + **后端 Render**。步骤与环境变量见 [RENDER-部署清单.md](./RENDER-部署清单.md)。

生产构建示例：

```bash
# 将 VITE_API_BASE 换成你的 Render 公网 API 前缀
VITE_API_BASE=https://your-service.onrender.com/api pnpm build
```

Render 免费实例首次访问可能有约 30s 冷启动，属正常现象。

---

## 说明

- API Key **只放服务端**，不要写入前端仓库
- MySQL 可选：连不上时自动降级为无持久化，仍可完整体验流式对话
- 本仓库还包含 CMS 学习案例等其他页面；AI 对话以 `/sbsjjc` 为准
