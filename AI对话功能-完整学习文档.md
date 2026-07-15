# AI 对话功能 — 完整学习文档

> React 18 + TypeScript + Express SSE，支持一次性与逐块两种数据推送模式

---

## 目录

1. [项目总览](#1-项目总览)
2. [架构全景图](#2-架构全景图)
3. [类型系统](#3-类型系统)
4. [SSE 协议设计](#4-sse-协议设计)
5. [后端实现](#5-后端实现)
6. [前端实现](#6-前端实现)
   - [6.1 页面层：sbsjjc/index.tsx](#61-页面层sbsjjcindextsx)
   - [6.2 消息气泡：ChatMessageItem.tsx](#62-消息气泡chatmessageitemtsx)
   - [6.3 思考过程：ThinkingProcess.tsx](#63-思考过程thinkingprocesstsx)
   - [6.4 表格渲染：DataTableRenderer.tsx](#64-表格渲染datatablerenderertsx)
   - [6.5 图表渲染：DataChartRenderer.tsx](#65-图表渲染datachartrenderertsx)
   - [6.6 Markdown 渲染管线](#66-markdown-渲染管线)
   - [6.7 流式安全修补](#67-流式安全修补)
7. [CSS 动画体系](#7-css-动画体系)
8. [性能优化策略](#8-性能优化策略)
9. [边界场景与容错](#9-边界场景与容错)
10. [扩展指南](#10-扩展指南)

---

## 1. 项目总览

### 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React | 18.3 |
| 类型系统 | TypeScript | 6.0 |
| 构建工具 | Vite | 8.1 |
| UI 组件库 | Ant Design | 6.5 |
| 状态管理 | Zustand + Redux Toolkit | 5.0 / 2.12 |
| Markdown 渲染 | react-markdown + remark-gfm + rehype-highlight + rehype-katex | — |
| 图表渲染 | ECharts（按需加载） | 6.1 |
| 虚拟滚动 | react-virtuoso | 4.18 |
| 后端框架 | Express | 5.2 |
| 运行时 | tsx（TypeScript 直接执行） | 4.23 |

### 文件清单

```
cms-react-ts/
│
├── src/
│   ├── types/
│   │   └── chat.ts                          # 所有类型定义（核心）
│   │
│   ├── pages/sbsjjc/
│   │   ├── index.tsx                         # 聊天页面（SSE 解析 + 状态管理）
│   │   └── index.css                         # 页面布局样式
│   │
│   ├── components/Chat/
│   │   ├── ChatMessageItem.tsx               # 消息气泡（内容分发）
│   │   ├── ThinkingProcess.tsx               # 思考过程面板
│   │   ├── DataTableRenderer.tsx             # 表格过渡渲染
│   │   ├── DataChartRenderer.tsx             # 图表过渡渲染
│   │   ├── MarkdownRenderer.tsx              # Markdown → React 渲染
│   │   ├── CodeBlock.tsx                     # 代码块（高亮 + 复制）
│   │   ├── ErrorBoundary.tsx                 # Markdown 渲染容错
│   │   ├── ScrollToBottomButton.tsx          # 回到底部按钮
│   │   └── ChatContainer.tsx                # 通用虚拟列表容器
│   │
│   ├── hooks/
│   │   └── useStreamMessage.ts              # 可复用 SSE Hook（当前未使用）
│   │
│   └── utils/
│       └── sanitizeStreamingMarkdown.ts      # 流式 Markdown 安全修补
│
├── react-node/
│   └── src/
│       ├── index.ts                          # Express 服务入口
│       ├── routes/
│       │   └── chat.ts                       # POST /api/chat SSE 路由
│       └── services/
│           └── aiService.ts                 # AI 模拟服务（事件生成引擎）
│
└── AI对话功能-完整学习文档.md                # 本文档
```

---

## 2. 架构全景图

```
┌─────────────────────────────────────────────────────────────┐
│                         浏览器                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  sbsjjc/index.tsx  (页面控制器)                       │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ 1. fetch('/api/chat', { body: { message } }) │    │   │
│  │  │ 2. response.body.getReader()                  │    │   │
│  │  │ 3. 解析 SSE → 构建 contentBlocks / thinkingStages │   │
│  │  │ 4. setMessages() 驱动重渲染                   │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │                          │                            │   │
│  │                          ▼                            │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │  Virtuoso 虚拟列表                              │   │
│  │  │  ┌──────────────────────────────────────┐    │    │   │
│  │  │  │  ChatMessageItem (React.memo)         │    │    │   │
│  │  │  │  ├─ ThinkingProcess  (思考面板)       │    │    │   │
│  │  │  │  └─ ContentBlockRenderer             │    │    │   │
│  │  │  │     ├─ type:text → MarkdownRenderer  │    │    │   │
│  │  │  │     ├─ type:table → DataTableRenderer│    │    │   │
│  │  │  │     └─ type:chart → DataChartRenderer│    │    │   │
│  │  │  └──────────────────────────────────────┘    │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ SSE (text/event-stream)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express Server (端口 3001)                   │
│                                                             │
│  chat.ts                          aiService.ts              │
│  ┌──────────────────┐            ┌──────────────────────┐   │
│  │ POST /api/chat    │──调用──▶  │ generateStream(msg)   │   │
│  │                   │            │                      │   │
│  │ 遍历 SSEEvent[]    │◀──返回──  │ 匹配关键词 → 选模板     │   │
│  │ JSON.stringify →   │            │ 生成器函数 → SSEEvent[] │   │
│  │ readable.push()    │            │                      │   │
│  │ sleep(delay) 调速  │            │ thinking / text /     │   │
│  └──────────────────┘            │ table_data / chart_data│   │
│                                  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 类型系统

> 文件：`src/types/chat.ts`

类型系统是理解整个功能的基础。按"从细到粗"的层次组织：

### 第一层：原子类型

```typescript
// 思考阶段的枚举（5 种状态）
type ThinkingStageType =
  | 'analyzing'    // 分析问题
  | 'searching'    // 检索数据
  | 'processing'   // 处理数据
  | 'generating'   // 生成内容
  | 'done';        // 完成

// 消息发送者
type MessageRole = 'user' | 'assistant';

// SSE 事件名枚举（8 种事件）
type SSEEventType =
  | 'thinking'
  | 'text'
  | 'table_loading' | 'table_data'
  | 'chart_loading' | 'chart_data'
  | 'data_chunk'   // 逐块追加（表格/图表）
  | 'done';
```

### 第二层：内容块类型（核心设计）

```typescript
// ──── 文本内容块 ────
interface TextContent {
  type: 'text';
  text: string;              // Markdown 格式文本
}

// ──── 表格内容块 ────
interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
}

interface TableContent {
  type: 'table';
  columns: TableColumn[];
  data: Record<string, any>[];
  title?: string;
}

// ──── 图表内容块 ────
interface ChartContent {
  type: 'chart';
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  title?: string;
  config: Record<string, any>;    // 完整的 ECharts 配置对象
}

// ──── 联合类型 ────
type MessageContent = TextContent | TableContent | ChartContent;
```

**设计意图**：用 `type` 字段作为判别键（discriminated union），前端渲染时通过 `switch (block.type)` 精准分发到对应组件，TypeScript 自动收窄类型。

### 第三层：消息模型

```typescript
interface ChatMessage {
  id: string;                           // 唯一标识，用于 Virtuoso 的 itemKey
  role: MessageRole;                    // 'user' | 'assistant'
  content: string;                      // [兼容字段] 所有 text 块的拼接
  contentBlocks?: MessageContent[];     // [新架构] 结构化内容块数组
  thinkingStages?: ThinkingStage[];     // 思考过程步骤
  isStreaming?: boolean;                // 是否正在流式接收
  createdAt?: number;                   // 创建时间戳
}
```

**兼容设计**：`content` 和 `contentBlocks` 并存。旧代码只读 `content`，新代码优先读 `contentBlocks`。

### 第四层：SSE 事件传输格式

```typescript
// 每个 SSE 事件的 shape
interface SSEEvent {
  type: SSEEventType;
  data: SSEThinkingData | SSETextData | SSETableData | SSEChartData | SSEDataChunkData | null;
}

// 各种 data 类型：
interface SSEThinkingData   { stage: ThinkingStageType; message: string; }
interface SSETextData       { content: string; }
interface SSETableData      { title?; columns; data; }
interface SSEChartData      { chartType; title?; config; }
```

### 第五层：逐块追加协议（data_chunk）

```typescript
type DataChunkType = 'table' | 'chart';

interface SSEDataChunkData {
  chunkType: DataChunkType;     // 区分表格/图表
  index: number;                 // 0-based chunk 序号
  total?: number;                // 总 chunk 数（用于进度指示）
  // 表格字段（首 chunk 携带 columns）
  columns?: TableColumn[];
  title?: string;
  rows?: Record<string, any>[];
  // 图表字段（首 chunk 携带完整 ECharts option）
  chartType?: ChartContent['chartType'];
  config?: Record<string, any>;  // 完整 ECharts option（含 yAxis/tooltip/legend）
  series?: Record<string, any>[];
  xAxisData?: string[];
}
```

**设计意图**：`data_chunk` 是 `table_data`/`chart_data` 的"流式版本"——将完整数据拆成多个块逐步推送。表格实现行级追加（逐行到达），图表实现系列级追加（逐系列构建）。两种模式通过不同关键词触发，协议层面完全独立，互不干扰。

### 类型关系图

```
SSEEvent (传输层)
   │
   │  type: 'thinking' | 'text' | 'table_data' | 'chart_data' | 'data_chunk' | 'done'
   │
   │  前端解析
   ▼
┌─────────────────────────────────────────────────────────┐
│  thinkingStages: ThinkingStage[]                         │  ← 思考过程
│  contentBlocks:  MessageContent[]                        │  ← 内容块
│       │                                                  │
│       ├─ TextContent   → MarkdownRenderer               │
│       ├─ TableContent  → DataTableRenderer               │
│       │   └─ 来源: table_data（一次性）或 data_chunk × N（逐行） │
│       └─ ChartContent  → DataChartRenderer               │
│           └─ 来源: chart_data（一次性）或 data_chunk × N（逐系列）│
│                                                          │
│  content: string  (兼容)                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 4. SSE 协议设计

### 请求

```
POST /api/chat
Content-Type: application/json

{
  "message": "用户输入的文本"
}
```

### 响应

```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no          ← 禁用 nginx 缓冲
```

### 事件格式

```
data: {"type":"thinking","data":{"stage":"analyzing","message":"正在分析问题..."}}

data: {"type":"text","data":{"content":"好"}}

data: {"type":"text","data":{"content":"的"}}

data: {"type":"table_loading","data":{"message":"正在生成表格..."}}

data: {"type":"table_data","data":{"title":"销售数据","columns":[...],"data":[...]}}

data: {"type":"chart_loading","data":{"message":"正在生成图表..."}}

data: {"type":"chart_data","data":{"chartType":"bar","title":"收入对比","config":{...}}}

data: {"type":"done","data":null}
```

### 事件语义

| 事件 | data | 含义 | 前端行为 |
|------|------|------|----------|
| `thinking` | `{ stage, message }` | 进入某个思考阶段 | push 到 `thinkingStages[]` |
| `text` | `{ content }` | 流式文本片段（逐字） | 追加到最后一个 text 块 |
| `table_loading` | `{ message }` | 即将输出表格（一次性模式） | 设置 pending 标记 |
| `table_data` | `{ columns, data, title? }` | 表格完整数据（一次性） | push 到 `contentBlocks[]` |
| `chart_loading` | `{ message }` | 即将输出图表（一次性模式） | 设置 pending 标记 |
| `chart_data` | `{ chartType, config, title? }` | 图表完整配置（一次性） | push 到 `contentBlocks[]` |
| `data_chunk` | `{ chunkType, index, total?, rows?, series?, config?, ... }` | 逐块追加（表格行/图表系列） | index===0 创建 block，后续替换追加 |
| `done` | `null` | 流结束 | `isStreaming = false` |

### 逐块模式示例

```
data: {"type":"data_chunk","data":{"chunkType":"table","index":0,"total":4,"columns":[...],"rows":[Q1行]}}

data: {"type":"data_chunk","data":{"chunkType":"table","index":1,"total":4,"rows":[Q2行]}}

data: {"type":"data_chunk","data":{"chunkType":"table","index":2,"total":4,"rows":[Q3行]}}

data: {"type":"data_chunk","data":{"chunkType":"chart","index":0,"total":3,"chartType":"bar","config":{完整ECharts option仅含1个series}}}

data: {"type":"data_chunk","data":{"chunkType":"chart","index":1,"total":3,"series":[{第2个series}]}}

data: {"type":"data_chunk","data":{"chunkType":"chart","index":2,"total":3,"series":[{第3个series}]}}
```

**一次性模式 vs 逐块模式**：两种模式在协议层面完全独立——一次性用 `table_data`/`chart_data`，逐块用 `data_chunk`。后端根据用户输入关键词选择用哪种模式，前端两种都能正确解析。

### 为什么用 JSON 而非纯文本 SSE？

纯文本 SSE 只能传输单一类型数据。JSON 格式允许在一条流中混合多种事件类型（8 种），让前端能区分"这是一行文字"、"这是一个图表配置"、"这是表格的一个数据块"，从而分层渲染或增量追加。

### 为什么 text 事件是逐字的？

不是技术限制，是**刻意设计**。逐字发送让前端实现"打字机效果"：`text` 事件逐字到达 → 逐字追加到 text 块 → MarkdownRenderer 逐步展示。如果一次性发整段，就没有流式感了。

---

## 5. 后端实现

### 5.1 Express 服务入口（`react-node/src/index.ts`）

```typescript
const app = express();
app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(express.json());
app.use('/api/chat', chatRouter);
app.listen(3001);
```

极简的 Express 服务。CORS 只允许 Vite 开发服务器跨域。

### 5.2 SSE 路由（`react-node/src/routes/chat.ts`）

**核心流程**：

```
1. 接收 POST body → 提取 message
2. 设置 SSE 响应头
3. 调用 generateStream(message) → 得到 SSEEvent[]
4. 创建 Readable 流并 pipe 到 res
5. 遍历 events：
   ├─ JSON.stringify(event) → `data: {...}\n\n`
   ├─ readable.push()
   └─ sleep(delay) 调速
6. 发送 done 事件
7. readable.push(null) 关闭流
```

**延迟策略（模拟真实 LLM）**：

```typescript
if (event.type === 'thinking')                  delay = 600ms;  // 思考停顿
else if (event.type === 'loading')              delay = 800ms;  // 加载停顿
else if (event.type === 'data_chunk')            delay = 400ms;  // 逐块间延迟
else if (event.type === 'text')                  delay = 50ms;   // 中文逐字（50ms/字）
else if (event.type === 'data')                  delay = 100ms;  // 数据快速推送
else if (event.type === 'done')                  delay = 10ms;
```

**中断处理**：

```typescript
req.on('aborted', () => {
  isAborted = true;
  readable.destroy();      // 销毁流
});
```

当用户点击"停止"触发 `AbortController.abort()`，浏览器关闭连接，服务端收到 `aborted` 事件后停止推送。

**JSON 容错测试注入**：

当消息包含 `"json错误"` 时，路由在正常事件流中额外注入非 JSON 的原始文本行，用于测试前端解析容错：

```typescript
if (isJsonFallbackTest && eventIndex === 3) {
  readable.push('data: 这是一段原始文本（未包装为 JSON）\n\n');
  readable.push('data: {"type":"unknown_event","data":{"x":1}\n\n'); // 故意不闭合
}
```

### 5.3 AI 模拟服务（`react-node/src/services/aiService.ts`）

这是后端的核心，负责根据用户消息生成对应的 SSE 事件序列。

#### 5.3.1 文本分词（tokenize）

```typescript
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const regex = /([一-鿿])|([a-zA-Z0-9_]+)|(\s+)|(\n)|([^一-鿿\w\s])/g;
  //           中文单字    英文单词          空白   换行   标点符号
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}
```

**设计要点**：中文字符逐字拆分（因为中文每个字独立表意），英文单词保持完整（因为英文按词阅读）。这是实现"打字机效果"的基础。

#### 5.3.2 事件生成器函数

所有 mock 流都是 **Generator 函数**，用 `yield` 逐个产出事件：

```typescript
function* generateDemoFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '...' } };
  yield* generateTextEvents('好的，我来为您分析...');
  yield { type: 'table_data', data: mockSalesTable };
  yield { type: 'chart_data', data: { chartType: 'bar', config: ... } };
  yield { type: 'done', data: null };
}
```

`yield* generateTextEvents(text)` 委托给另一个生成器，将文本分词后逐个产出 `{ type: 'text' }` 事件。

#### 5.3.3 关键词匹配路由

```typescript
export function generateStream(message: string): SSEEvent[] {
  const lower = message.toLowerCase();

  // 优先级从高到低匹配：
  if (/中断.*markdown|未闭合/.test(lower))     → 边界测试：未闭合 Markdown
  if (/异常.*数据|残缺/.test(lower))          → 边界测试：残缺数据
  if (/加载.*中断|表格.*中断/.test(lower))     → 边界测试：loading 中断
  if (/json.*错误|容错/.test(lower))          → 边界测试：JSON 容错
  if (/逐行|追加|chunk|分块/.test(lower))     → 逐块流式演示（表格逐行+图表逐系列）
  if (/markdown|渲染/.test(lower))            → Markdown 渲染演示
  if (/分析|数据|销售|报表/.test(lower))       → 完整分析报告（表格+图表+Markdown）
  if (/图表|可视化|chart/.test(lower))        → 纯图表演示
  if (/对比|用户|活跃/.test(lower))           → 用户数据演示
  if (/表格|table/.test(lower))               → 纯表格演示

  return [...generateSimpleFlow(message)];     // 兜底：简单回复
}
```

**设计要点**：
- 边界测试关键词优先级最高（独立匹配，不会误入业务流）
- 用 `[...generator]` 展开生成器为数组（因为 chat.ts 需要遍历两次：先计算长度，再逐个发送）
- 最后兜底到简单回复，保持对话连贯性

#### 5.3.4 Mock 数据设计

**表格 mock**（`mockSalesTable`）：
```typescript
{
  title: '2025年各季度销售数据',
  columns: [
    { key: 'quarter', title: '季度', dataIndex: 'quarter', width: 100 },
    { key: 'revenue', title: '营收（万元）', dataIndex: 'revenue', width: 130 },
    // ...
  ],
  data: [
    { quarter: 'Q1', revenue: 1280, cost: 860, profit: 420, growth: '+12.5%' },
    // ...
  ],
}
```

**图表 mock**（`createBarChartConfig()`）：
```typescript
{
  title: { text: '季度营收与利润对比' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['Q1','Q2','Q3','Q4'] },
  yAxis: { type: 'value' },
  series: [
    { name: '营收', type: 'bar', data: [1280,1560,1890,2340] },
    { name: '成本', type: 'bar', data: [860,920,1050,1280] },
    { name: '利润', type: 'bar', data: [420,640,840,1060] },
  ],
  animationDuration: 1500,
  animationEasing: 'elasticOut',
}
```

ECharts 的 `animationDuration` + `animationEasing` 配置与前端 CSS 入场动画叠加，形成双重动效。

#### 5.3.5 逐块流式生成器（generateChunkedFlow）

这是 `data_chunk` 协议的演示实现，展示表格逐行到达、图表逐系列构建的过程：

```typescript
function* generateChunkedFlow(): Generator<SSEEvent> {
  // 1. 介绍
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在处理（逐块模式）...' } };
  yield* generateTextEvents('好的，我将使用**逐块流式**模式展示数据。\n\n');

  // 2. 逐行表格
  const tableRows = mockSalesTable.data;
  yield { type: 'data_chunk', data: { chunkType: 'table', index: 0, total: 4,
    columns: mockSalesTable.columns, rows: [tableRows[0]] } };
  for (let i = 1; i < tableRows.length; i++) {
    yield { type: 'data_chunk', data: { chunkType: 'table', index: i, rows: [tableRows[i]] } };
  }

  // 3. 逐系列图表
  const barConfig = createBarChartConfig();
  // chunk 0 携带完整 ECharts option（含 yAxis/tooltip/legend），仅含首个 series
  yield { type: 'data_chunk', data: { chunkType: 'chart', index: 0, total: 3,
    chartType: 'bar', config: { ...barConfig, series: [barConfig.series[0]] } } };
  for (let i = 1; i < 3; i++) {
    yield { type: 'data_chunk', data: { chunkType: 'chart', index: i, series: [barConfig.series[i]] } };
  }

  yield* generateTextEvents('## 总结\n\n表格 4 行分 4 chunk，图表 3 系列分 3 chunk...');
  yield { type: 'done', data: null };
}
```

**为什么图表 chunk 0 要发完整 ECharts option？** 图表不仅需要 `series` 数据，还需要 `yAxis`（纵轴）、`tooltip`（提示框）、`legend`（图例）、`animationDuration` 等结构配置。如果 chunk 0 只发 `series`，图表缺少这些组件将无法渲染。所以 chunk 0 携带完整 option（仅含首个 series），后续 chunk 只追加 series 到已有 option 中。

---

## 6. 前端实现

### 6.1 页面层：sbsjjc/index.tsx

这是整个功能的大脑。负责：

1. 消息列表状态管理
2. SSE 流解析
3. 内容块 / 思考步骤的增量构建
4. 中断控制
5. 虚拟滚动集成

#### 6.1.1 状态定义

```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
const [atBottom, setAtBottom] = useState(true);
const inputRef = useRef<HTMLInputElement>(null);
const abortRef = useRef<AbortController | null>(null);
const virtuosoRef = useRef<VirtuosoHandle>(null);
```

三个 ref 的用途：
- `inputRef`：发送后清空输入框
- `abortRef`：保存当前请求的 AbortController，供"停止"按钮使用
- `virtuosoRef`：发送消息后强制滚动到底部

#### 6.1.2 发送流程（handleSend）

整个 `handleSend` 用 `useCallback` 包裹，依赖 `[isStreaming]`。核心流程分 4 步：

```
Step 1: 创建消息
  ├─ userMsg = { id, role:'user', content:input }
  ├─ assistantMsg = { id, role:'assistant', content:'', contentBlocks:[], thinkingStages:[], isStreaming:true }
  └─ setMessages(prev => [...prev, userMsg, assistantMsg])

Step 2: 发起 SSE 请求
  ├─ controller = new AbortController()
  ├─ abortRef.current = controller
  ├─ setIsStreaming(true)
  └─ fetch('/api/chat', { method:'POST', body: JSON.stringify({message:input}), signal: controller.signal })

Step 3: 流式解析循环
  └─ while (true) {
       ├─ reader.read() → chunk
       ├─ 拼接 lineBuffer
       ├─ 按 \n\n 分割事件
       ├─ JSON.parse(data:) → switch event.type：
       │   ├─ 'thinking'     → thinkingStages.push({...})
       │   ├─ 'text'         → 新建/追加 TextContent（新建对象，非原地修改）
       │   ├─ 'table_data'   → handleDataChunk({ chunkType:'table', index:0, ... })
       │   ├─ 'chart_data'   → handleDataChunk({ chunkType:'chart', index:0, ... })
       │   ├─ 'data_chunk'   → handleDataChunk(event.data)
       │   └─ 'done'         → break
       ├─ 如果 hasUpdates → setMessages(更新 assistantMsg)
       └─ }
     }

Step 4: finally 清理
  ├─ setIsStreaming(false)
  ├─ abortRef.current = null
  └─ setMessages(最终更新，isStreaming: false)
```

#### 6.1.3 SSE 解析器的关键细节

**行缓冲（Line Buffer）**：

```typescript
let lineBuffer = '';

while (true) {
  const { done, value } = await reader.read();
  const chunk = decoder.decode(value, { stream: true });
  lineBuffer += chunk;

  const events = lineBuffer.split('\n\n');   // SSE 事件以双换行分隔
  lineBuffer = events.pop() || '';           // 最后一段可能不完整，留到下次

  for (const rawEvent of events) { /* 处理 */ }
}
```

这是 SSE 客户端解析的标准模式。`events.pop()` 是关键——网络数据包可能在任意位置切割，最后一个 `\n\n` 之后的内容可能不完整，必须留到下一个 chunk 再拼接。

**text 块累积——为什么必须新建对象**：

```typescript
// ✅ 正确做法：新建对象
case 'text': {
  const textContent = event.data.content as string;
  const lastBlock = contentBlocks[contentBlocks.length - 1];
  if (lastBlock && lastBlock.type === 'text') {
    contentBlocks[contentBlocks.length - 1] = {
      type: 'text',
      text: (lastBlock as TextContent).text + textContent,  // 新对象
    };
  } else {
    contentBlocks.push({ type: 'text', text: textContent });
  }
}
```

```typescript
// ❌ 错误做法：原地修改（曾导致 bug）
(lastBlock as TextContent).text += textContent;  // 对象引用不变
```

**为什么必须新建？** 下游的 `ChatMessageItem` 使用 `React.memo` 做浅比较（现已升级为深度比较，见 6.2.3 节）。如果原地修改，React 看到同一个对象引用，认为 props 没变，就跳过了重渲染。结果：只有第一个字显示，后续更新全部丢失。

**一次性与逐块模式的统一入口——handleDataChunk**：

```typescript
/**
 * 统一的数据块处理函数
 * 将一次性 table_data / chart_data 和逐块 data_chunk 合并为同一流程
 */
const handleDataChunk = (chunk: SSEDataChunkData) => {
  if (pendingLoadingBlock) pendingLoadingBlock = null;

  if (chunk.chunkType === "table") {
    if (chunk.index === 0) {
      // 首 chunk（或一次性 table_data）：创建 TableContent
      contentBlocks.push({
        type: "table", columns: chunk.columns!, data: chunk.rows || [], title: chunk.title,
      } as TableContent);
    } else {
      // 后续 chunk：从尾部向前找到最后一个 table block，替换为新对象（追加行）
      for (let i = contentBlocks.length - 1; i >= 0; i--) {
        if (contentBlocks[i].type === "table") {
          contentBlocks[i] = {
            ...contentBlocks[i],
            data: [...(contentBlocks[i] as TableContent).data, ...(chunk.rows || [])],
          } as TableContent;
          break;
        }
      }
    }
  } else if (chunk.chunkType === "chart") {
    if (chunk.index === 0) {
      // 首 chunk：优先使用 chunk.config（完整 option），否则从 xAxisData + series 组装
      const baseConfig = chunk.config || (chunk.xAxisData
        ? { xAxis: { type: "category", data: chunk.xAxisData }, series: chunk.series || [] }
        : { series: chunk.series || [] });
      contentBlocks.push({
        type: "chart", chartType: chunk.chartType!, title: chunk.title, config: baseConfig,
      } as ChartContent);
    } else {
      // 后续 chunk：合并 series 到已有 config（新建对象替换）
      for (let i = contentBlocks.length - 1; i >= 0; i--) {
        if (contentBlocks[i].type === "chart") {
          const existing = contentBlocks[i] as ChartContent;
          contentBlocks[i] = {
            ...existing,
            config: {
              ...existing.config,
              series: [...existing.config.series, ...(chunk.series || [])],
            },
          } as ChartContent;
          break;
        }
      }
    }
  }
};
```

**三个 case 统一委托**：

```typescript
// 一次性表格 → 转化为"单 chunk"
case "table_data":
  handleDataChunk({ chunkType: "table", index: 0, columns: event.data.columns,
                    rows: event.data.data, title: event.data.title });
  break;

// 一次性图表 → 转化为"单 chunk"
case "chart_data":
  handleDataChunk({ chunkType: "chart", index: 0, chartType: event.data.chartType,
                    config: event.data.config, title: event.data.title });
  break;

// 逐块模式 → 直接透传
case "data_chunk":
  handleDataChunk(event.data as SSEDataChunkData);
  break;
```

**设计意图**：一次性模式和逐块模式在协议层不同（`table_data` vs `data_chunk`），但在数据层等价——都是"把数据推入 contentBlocks"。将两者在 SSE 解析器的 switch 中转化为统一调用 `handleDataChunk`，消除重复逻辑，保证行为一致。

**批量更新**：

```typescript
let hasUpdates = false;
// ... 处理事件 ...
if (hasUpdates) {
  setMessages(prev => {
    // 函数式更新，基于最新 state
    const idx = prev.findIndex(m => m.id === assistantId);
    updated[idx] = {
      ...updated[idx],
      contentBlocks: [...contentBlocks],    // 浅拷贝数组
      thinkingStages: [...thinkingStages],
      content: contentBlocks                // 拼接兼容字段
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join(''),
    };
  });
}
```

设计要点：
- 用 `hasUpdates` 标记减少不必要的 `setMessages` 调用
- 函数式更新 `prev => {...}` 确保基于最新 state（非闭包旧值）
- `[...contentBlocks]` 创建新数组引用（React 才能检测到变化）

#### 6.1.4 停止处理

```typescript
const handleStop = useCallback(() => {
  abortRef.current?.abort();    // 中断 fetch 请求
  setIsStreaming(false);        // 解除输入框禁用
}, []);
```

`abort()` 触发后，fetch 抛出 `AbortError`，在 catch 中被静默吞掉（`if (err.name !== 'AbortError')`），不显示错误提示。finally 中正常保存已接收的部分内容。

#### 6.1.5 虚拟滚动集成

```typescript
<Virtuoso
  ref={virtuosoRef}
  data={messages}
  followOutput={atBottom ? 'smooth' : false}   // 用户主动上滚后不自动跟随
  atBottomStateChange={setAtBottom}              // 实时得知用户是否在底部
  itemKey={(msg) => msg.id}                      // 稳定 key
  itemContent={(_index, msg) => <ChatMessageItem message={msg} />}
  increaseViewportBy={{ top: 400, bottom: 400 }}  // 预渲染上下 400px
/>
```

`followOutput` 的关键行为：只有当用户处于底部时，新消息才自动滚动。如果用户往上翻看历史，新内容不会打断。

---

### 6.2 消息气泡：ChatMessageItem.tsx

#### 6.2.1 职责

单个消息气泡组件，负责：
1. 区分用户/AI 消息样式
2. AI 消息的内容分发（思考过程 → 内容块 → 兼容旧版纯文本）
3. 性能优化（React.memo）

#### 6.2.2 渲染分发逻辑

```
message.role === 'user'
  → <p> 纯文本

message.role === 'assistant'
  → thinkingStages 不为空 → <ThinkingProcess>
  → contentBlocks 不为空  → 遍历 ContentBlockRenderer
                               ├─ type:text   → <MarkdownRenderer>
                               ├─ type:table  → <DataTableRenderer>
                               └─ type:chart  → <DataChartRenderer>
  → 否则（兼容旧版）         → <MarkdownRenderer content={message.content}>
```

#### 6.2.3 React.memo 优化

```typescript
export const ChatMessageItem = React.memo(
  ({ message }) => { /* render */ },
  (prev, next) => {
    // 返回 true = props 相等 = 跳过渲染
    // 返回 false = props 不同 = 需要渲染
    const pm = prev.message, nm = next.message;
    if (pm.content !== nm.content) return false;
    if (pm.isStreaming !== nm.isStreaming) return false;
    if (pm.thinkingStages?.length !== nm.thinkingStages?.length) return false;
    if (pm.contentBlocks?.length !== nm.contentBlocks?.length) return false;

    // 深度检查 contentBlocks 内部数据（chunked streaming 必需）
    // data_chunk 追加行/系列时，block 数量不变但内部 data.length 变了
    if (pm.contentBlocks && nm.contentBlocks) {
      for (let i = 0; i < pm.contentBlocks.length; i++) {
        const pb = pm.contentBlocks[i], nb = nm.contentBlocks[i];
        if (pb.type !== nb.type) return false;
        if (pb.type === 'table') {
          if ((pb as TableContent).data?.length !== (nb as TableContent).data?.length)
            return false;
        }
        if (pb.type === 'chart') {
          if (((pb as ChartContent).config?.series as any[])?.length !==
              ((nb as ChartContent).config?.series as any[])?.length) return false;
        }
      }
    }
    return true;  // 所有检查通过，跳过渲染
  }
);
```

**为什么在 length 检查之外还要深度检查 data/series 数量？**
- `data_chunk` 事件追加表格行时，`contentBlocks.length` 不变（同一个 table block 被替换），但 `data.length` 增加了
- `data_chunk` 事件追加图表系列时，`contentBlocks.length` 不变，但 `config.series.length` 增加了
- `content` 字段只拼接 text 块，不反映表格/图表数据变化
- 深度检查只比较 `data.length` 和 `series.length`（O(N) 级别，N=block 数量），不递归比较每个数据行，性能可接受

#### 6.2.4 ContentBlockRenderer

```typescript
const ContentBlockRenderer: React.FC<{ block: MessageContent; isLoading?: boolean }> = ({
  block, isLoading
}) => {
  switch (block.type) {
    case "text":   return <MarkdownRenderer content={block.text} isStreaming={isLoading} />;
    case "table":  return <DataTableRenderer data={block} isLoading={isLoading} />;
    case "chart":  return <DataChartRenderer data={block} isLoading={isLoading} />;
  }
};

// 调用处传入 message.isStreaming：
<ContentBlockRenderer block={block} isLoading={message.isStreaming} />;
```

**`isLoading` 的作用**：将 `isStreaming` 状态透传给表/图渲染器。在 chunk 模式下，block 创建后 `isStreaming` 仍为 `true`，渲染器据此决定是否显示骨架屏或启用逐行动画。在一性模式中 `isLoading` 始终为 `false`（block 创建时流已接近结束），不影响原有行为。

---

### 6.3 思考过程：ThinkingProcess.tsx

#### 6.3.1 组件接口

```typescript
interface ThinkingProcessProps {
  stages: ThinkingStage[];   // 思考步骤列表
  isStreaming?: boolean;     // 是否仍在流式传输中
}
```

#### 6.3.2 阶段配置映射

```typescript
const stageConfig = {
  analyzing:   { icon: SearchOutlined,      label: '分析问题', color: '#1677ff' },
  searching:   { icon: SearchOutlined,      label: '检索数据', color: '#722ed1' },
  processing:  { icon: ThunderboltOutlined, label: '处理数据', color: '#fa8c16' },
  generating:  { icon: BarChartOutlined,    label: '生成内容', color: '#52c41a' },
  done:        { icon: CheckCircleOutlined, label: '完成',     color: '#52c41a' },
};
```

用配置对象驱动渲染，而非硬编码 switch-case。新增阶段只需加一行配置。

#### 6.3.3 状态计算

```typescript
// 当前活跃阶段：从后往前找第一个非 done 的阶段
const activeStage = [...stages].reverse().find(s => s.type !== 'done');

// 是否全部完成：最后一个阶段是 done 且流已停止
const isAllDone = stages[stages.length - 1]?.type === 'done' && !isStreaming;
```

#### 6.3.4 UI 结构

```
┌──────────────────────────────────────────────────────────┐
│  ▶   🔄 处理数据  正在整理表格数据...                      │  ← 折叠头部
├──────────────────────────────────────────────────────────┤
│  ●───  分析问题  正在理解您的问题...             14:30:01  │
│  │                                                        │
│  ●───  检索数据  正在检索销售数据...            14:30:02  │  ← 展开的步骤列表
│  │                                                        │
│  ◉───  处理数据  正在整理表格数据...            14:30:03  │  ← 当前活跃（脉冲动画）
│  │                                                        │
│  ○     生成内容  (pending)                                │
└──────────────────────────────────────────────────────────┘
```

每个步骤三部分：**指示器**（圆点 + 连线）+ **内容**（标签 + 消息）+ **时间戳**。

#### 6.3.5 动画细节

| 元素 | 动画 | 实现 |
|------|------|------|
| 活跃步骤圆点 | 呼吸脉冲 | `@keyframes pulse-dot { box-shadow 周期性变化 }` |
| 已完成连线 | 变绿色 | `.thinking-process__line.is-done { background: #52c41a }` |
| 步骤透明度 | 活跃=1, 已完=0.8, 待定=0.6 | `transition: opacity 0.3s` |
| 折叠/展开 | 图标切换 + 高度变化 | `collapsed` state + `overflow: hidden` |

---

### 6.4 表格渲染：DataTableRenderer.tsx

#### 6.4.1 三阶段状态机

```
 skeleton ──────────→ expanding ──────────→ ready
(骨架屏占位)   50ms   (交叉过渡)   450ms    (表格展示)
```

#### 6.4.2 阶段切换逻辑

```typescript
const [phase, setPhase] = useState<'skeleton' | 'expanding' | 'ready'>(
  // chunk 模式：首次渲染就有数据 → 直接 ready
  // 一次性模式（无 loading 骨架屏机制）：直接 ready
  isLoading && (!data?.data || data.data.length === 0) ? 'skeleton' : 'ready'
);

useEffect(() => {
  if (!isLoading && phase === 'skeleton') {
    // 一次性模式过渡：骨架屏 → expanding → ready
    setTimeout(() => setPhase('expanding'), 100);
    setTimeout(() => { setPhase('ready'); onReady?.(); }, 500);
  }
  // chunk 模式：有数据且正在加载 → 直接显示表格（跳过骨架屏）
  if (isLoading && data?.data && data.data.length > 0 && phase === 'skeleton') {
    setPhase('ready');
  }
}, [isLoading, phase, onReady, data]);
```

**两种模式的 phase 路径**：
- **一次性模式**：`isLoading` 始终为 `false`，phase 初始为 `ready`，骨架屏从不触发
- **Chunk 模式**：组件挂载时 `isLoading=true` 且已有数据 → phase 直接 `ready`，后续每次 chunk 到达时 `data.data.length` 增加 → React 重渲染 → 新行滑入

#### 6.4.3 双层渲染结构

```jsx
<div className={`data-table-renderer phase-${phase}`}>

  {/* 层1: 骨架屏 — opacity 从 1→0，translateY 从 0→-10px */}
  <div className={`skeleton ${!isSkeleton ? 'is-hidden' : ''}`}>
    <Skeleton active paragraph={{ rows: rowCount + 1 }} />
  </div>

  {/* 层2: 真实表格 — opacity 从 0→1，translateY 从 8px→0 */}
  <div className={`table ${isSkeleton ? 'is-hidden' : ''}`}>
    {isValid ? <Table /> : <ErrorPlaceholder />}
  </div>

</div>
```

**为什么用两层 div 而非条件渲染？** 条件渲染会导致 DOM 挂载/卸载，无法做过渡动画。两层同时存在于 DOM 中，仅通过 opacity 控制可见性，CSS transition 才能生效。

#### 6.4.5 逐行追加上动画（chunk 模式专属）

```css
.data-table-renderer .ant-table-tbody > tr {
  animation: rowSlideIn 0.35s ease-out both;
}

@keyframes rowSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**为什么只对新增行触发动画？** Ant Design `<Table>` 使用 `rowKey="_key"`（数组索引），chunk 模式严格追加行（不删除不重排），React reconciliation 保留已有 `<tr>` DOM 节点。CSS `animation-fill-mode: both` 确保已播放过的动画停留在终态。新挂载的 `<tr>` 元素自动播放 `rowSlideIn` 动画。

#### 6.4.4 防御性渲染

```typescript
const columns = data?.columns;
const rows = data?.data;
const isValid = columns && columns.length > 0 && rows;

// JSX 中：
{isValid ? (
  <Table columns={columns.map(...)} dataSource={rows.map(...)} />
) : (
  <div className="error">
    ⚠️ 表格数据不完整
    {!columns && <p>缺少列定义 (columns)</p>}
    {!rows && <p>缺少行数据 (data)</p>}
  </div>
)}
```

防止后端发送残缺数据时页面崩溃。

---

### 6.5 图表渲染：DataChartRenderer.tsx

#### 6.5.1 阶段逻辑（与表格相同模式）

```typescript
const [phase, setPhase] = useState<'skeleton' | 'expanding' | 'ready'>(
  // chunk 模式：首 chunk 就有 series 数据 → 直接 ready
  isLoading && (!data?.config?.series || (data.config.series as any[]).length === 0)
    ? 'skeleton' : 'ready'
);

useEffect(() => {
  if (!isLoading && phase === 'skeleton') {
    // 一次性模式过渡
    setTimeout(() => setPhase('expanding'), 80);
    setTimeout(() => setPhase('ready'), 550);
  }
  // chunk 模式：有 series 且正在加载 → 直接显示
  if (isLoading && hasSeries && phase === 'skeleton') {
    setPhase('ready');
  }
}, [isLoading, phase, data]);
```

#### 6.5.2 notMerge — 增量图表更新的关键

```tsx
<ReactECharts
  echarts={echarts}
  option={data.config}
  notMerge={false}   // ← 关键：false = 合并模式
  lazyUpdate
/>
```

**`notMerge={false}` 的含义**：当 `option` prop 变化时，ECharts 调用 `setOption(newOption, { notMerge: false })`，将新配置**合并**到已有图表实例中，而非全量替换。chunk 模式下，后续 chunk 只追加新 series，ECharts 识别到新增 series 后以动画形式入场，已有 series 保持不变。

> ⚠️ 此前的代码使用 `notMerge`（即 `notMerge={true}`），导致每次 option 变化时图表卸载后重建，chunk 模式无法实现增量效果。

#### 6.5.3 ECharts 按需加载

```typescript
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent,
         ToolboxComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, PieChart, ScatterChart,
             GridComponent, TooltipComponent, LegendComponent, TitleComponent,
             ToolboxComponent, DataZoomComponent, CanvasRenderer]);
```

**为什么要按需加载？** 全量 ECharts 约 1MB（gzip 后 ~300KB），按需注册后约 600KB（gzip 后 ~180KB）。只引入当前用到的图表类型和组件。

#### 6.5.4 与 DataTableRenderer 的区别

两者都是三阶段状态机，但图表多了一个**缩放 + 弹性入场**：

```css
/* 图表层隐藏态 */
.data-chart-renderer__chart {
  opacity: 0;
  transform: translateY(12px) scale(0.97);   /* 缩小 + 下沉 */
  transition: opacity 0.6s ease, transform 0.6s ease;
}

/* 图表层展示态 */
.data-chart-renderer__chart.is-ready {
  opacity: 1;
  transform: translateY(0) scale(1);         /* 回到原位 */
}
```

此外，ECharts 自身的 `animationDuration: 1500` + `animationEasing: 'elasticOut'` 与 CSS 入场叠加，形成"弹出来"的视觉感受。

#### 6.5.5 ECharts 渲染就绪回调

```typescript
const [chartReady, setChartReady] = useState(false);

const handleChartReady = () => {
  setChartReady(true);     // 图表完全渲染后添加 is-ready class
  onReady?.();
};
```

`onChartReady` 是 ECharts 的回调，在动画完全结束后触发。这确保 CSS 过渡在图表内部动画完成后才标记为就绪。

---

### 6.6 Markdown 渲染管线

```
流式文本（string）
   │
   ├─ sanitizeStreamingMarkdown()   ← 修补未闭合的标记
   │
   ▼
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}      ← 解析 GFM 表格 + LaTeX
  rehypePlugins={[rehypeKatex, rehypeHighlight]} ← KaTeX 渲染 + 代码高亮
  components={{
    pre: ({ children }) => <>{children}</>,     ← 透传 pre（样式交给 CodeBlock）
    code: CodeBlock,                              ← 自定义代码块
    a: ({ href }) => <a target="_blank">,         ← 链接新窗口打开
    img: ({ src }) => <img loading="lazy">,       ← 图片懒加载
  }}
>
  {sanitizedContent}
</ReactMarkdown>
```

**插件职责**：
- `remark-gfm`：解析 GitHub Flavored Markdown（表格、任务列表、删除线）
- `remark-math`：解析 `$...$` 和 `$$...$$` LaTeX 公式
- `rehype-katex`：将 LaTeX AST 渲染为 HTML + CSS
- `rehype-highlight`：代码块语法高亮

**流式光标**：
```tsx
{isStreaming && (
  <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse" />
)}
```

一个 2px 宽的蓝色竖条，CSS `animate-pulse` 闪烁，模拟终端光标。

---

### 6.7 流式安全修补

> 文件：`src/utils/sanitizeStreamingMarkdown.ts`

```typescript
export function sanitizeStreamingMarkdown(text: string): string {
  let safe = text;

  // 1. 未闭合代码块: ``` 出现奇数次 → 补一个 ```
  const fenceMatches = safe.match(/(```+)/g);
  if (fenceMatches?.filter(f => f.length >= 3).length % 2 !== 0) {
    safe += '\n```';
  }

  // 2. 未闭合块级公式: $$ 出现奇数次 → 补一个 $$
  if ((safe.match(/\$\$/g) || []).length % 2 !== 0) {
    safe += '$$';
  }

  // 3. 未闭合行内公式: $ 出现奇数次（排除 $$）→ 补一个 $
  const inlineDollar = safe.match(/(?<!\$)\$(?!\$)/g);
  if (inlineDollar?.length % 2 !== 0) {
    safe += '$';
  }

  return safe;
}
```

**为什么需要？** 流式过程中，Markdown 语法结构可能不完整。例如后端正在输出一个代码块，但流被中断了，`react-markdown` 解析到未闭合的 ` ``` ` 可能崩溃。这个函数在每次渲染前运行，自动补全不完整的标记。

---

## 7. CSS 动画体系

### 整体策略

全部使用 **CSS transition + keyframes**，零 JS 动画。原因：
- GPU 加速（transform + opacity 触发合成层）
- 不阻塞 JS 主线程
- 声明式，与 React 渲染周期自然契合

### 动画清单

| 组件 | 动画 | 技术 | 时长 |
|------|------|------|------|
| ThinkingProcess 圆点 | 呼吸脉冲 | `@keyframes pulse-dot` | 1.5s 循环 |
| ThinkingProcess 步骤 | 透明度过渡 | `transition: opacity 0.3s` | 0.3s |
| ThinkingProcess 折叠 | 高度变化 | `overflow: hidden` | 瞬间 |
| DataTableRenderer 骨架→表格 | 交叉淡入淡出 + 位移 | `transition: opacity 0.5s, transform 0.5s` | 0.5s |
| DataTableRenderer 新增行 | 上滑淡入 | `@keyframes rowSlideIn` | 0.35s |
| DataChartRenderer 骨架→图表 | 淡入 + 缩放 + 位移 | `transition: opacity 0.6s, transform 0.6s` | 0.6s |
| ECharts 图表内部 | 数据动画（弹性缓出） + 逐系列合并 | `animationDuration: 1500` + `notMerge: false` | 1.5s |
| MarkdownRenderer 光标 | 闪烁 | `animate-pulse` | 循环 |

### 过渡阶段详解

```
skeleton 阶段：
  骨架屏: opacity: 1, transform: translateY(0)
  内容:   opacity: 0, transform: translateY(8px/12px)

expanding 阶段（50ms 后）：
  骨架屏: opacity: 0.5
  内容:   opacity: 0.5~0.6

ready 阶段（500ms 后）：
  骨架屏: opacity: 0, pointer-events: none, position: absolute
  内容:   opacity: 1, transform: translateY(0)
```

`position: absolute` + `pointer-events: none` 确保隐藏的骨架屏不占空间、不拦截点击。

---

## 8. 性能优化策略

### 8.1 虚拟滚动（react-virtuoso）

消息列表使用虚拟列表，只渲染可视区域内的消息。`increaseViewportBy: { top: 400, bottom: 400 }` 预渲染上下 400px，减少快速滚动时的白屏。

### 8.2 React.memo 精准控制

| 组件 | 策略 |
|------|------|
| `ChatMessageItem` | `React.memo` + 自定义比较函数（比较 content、isStreaming、length） |
| `ContentBlockRenderer` | **不加 memo**（避免引用相等导致的跳过渲染 bug） |
| `MarkdownRenderer` | `React.memo` + `useMemo` 缓存 sanitizedContent |

### 8.3 批量状态更新

SSE 解析循环中：多个事件处理完 → `hasUpdates = true` → 一次 `setMessages`。不会每个 token 都触发渲染。

### 8.4 函数式 setState

```typescript
setMessages(prev => { /* 基于 prev 计算 */ });
```

在异步循环中使用函数式更新，始终基于最新 state，不会因闭包拿到过期值。

### 8.5 ECharts 按需加载

见 [6.5.1 节](#651-echarts-按需加载)。

### 8.6 CSS 合成层

动画只使用 `transform` 和 `opacity`，不触发 layout/paint，全部走合成器线程。

---

## 9. 边界场景与容错

### 9.1 容错矩阵

| 场景 | 问题 | 处理层 | 处理方式 |
|------|------|--------|----------|
| 用户点击"停止" | fetch 中断 | `handleStop` → `AbortController.abort()` | 静默吞掉 AbortError，保存已接收内容 |
| 未闭合代码块 | ` ``` ` 奇数个 | `sanitizeStreamingMarkdown` | 自动补 ` ``` ` |
| 未闭合 LaTeX | `$$` 奇数个 | `sanitizeStreamingMarkdown` | 自动补 `$$` |
| Markdown 渲染异常 | react-markdown 崩溃 | `MarkdownErrorBoundary` | 降级为 `<pre>` 显示原文 |
| table_data 缺 columns | `columns` 为 null | `handleDataChunk` → `DataTableRenderer` | columns=undefined → `isValid=false` → ⚠️ 错误提示 |
| table_data 缺 data | `data` 为 null | `handleDataChunk` → `DataTableRenderer` | rows=null → `isValid=false` → ⚠️ 错误提示 |
| chunk 只到达部分（表格） | 只收到 index=0~1，缺 2~3 | `DataTableRenderer` | 显示已收到的行（部分数据），无崩溃 |
| chunk 只到达部分（图表） | 只收到 index=0，缺 1~2 | `DataChartRenderer` + `notMerge=false` | 显示已有 series 的图表，无崩溃 |
| chunk 缺 columns（表格） | index=0 的 columns=null | `DataTableRenderer` | `isValid=false` → ⚠️ "缺少列定义" |
| chunk 缺 config（图表） | index=0 的 config=null，但有 xAxisData | `handleDataChunk` fallback | 自动组装 `{ xAxis, series }` 兜底 |
| chunk 缺 chartType（图表） | index=0 的 chartType=undefined | `DataChartRenderer` | chartType 仅用于 badge 标签，chart 仍可渲染 |
| chart_data 缺 config | `config` 为 null | `DataChartRenderer` | 显示 ⚠️ 错误提示 |
| SSE JSON 解析失败 | 收到非 JSON 文本 | `sbsjjc/index.tsx` catch | 降级为纯文本显示 |
| table_loading 后无 data | 用户中断或连接断开 | `pendingLoadingBlock`（局部变量） | 不渲染，自然丢弃 |
| HTTP 错误 | 4xx/5xx | catch 块 | 显示 `❌ 请求失败：HTTP xxx` |
| 网络断开 | fetch 失败 | catch 块 | 显示 `❌ 请求失败：网络错误` |
| 空消息 | input.trim() 为空 | `handleSend` 入口 | `return` 直接拒绝 |

### 9.2 测试关键词（后端已实现）

| 关键词 | 模拟场景 |
|--------|----------|
| `中断markdown` / `未闭合` | Markdown 语法结构不完整 |
| `异常数据` / `残缺` | 后端发送缺少字段的表格和图表数据 |
| `表格中断` / `加载中断` | loading 事件发出后没有对应 data |
| `json错误` / `容错` | SSE 流中混入非 JSON 文本 |
| `逐行` / `追加` / `chunk` | **逐块流式模式**（表格逐行 + 图表逐系列） |
| `分析销售数据` | 完整分析报告（一次性模式，表格+图表+Markdown） |
| `图表` | 一次性图表演示（三种图表类型） |
| `表格` | 一次性纯表格演示 |

### 9.3 两种推送模式对比

| 维度 | 一次性模式 | 逐块模式（新增） |
|------|-----------|-----------------|
| 触发词 | `分析销售数据`、`图表`、`表格` | `逐行`、`追加`、`chunk` |
| 表格事件 | `table_data` ×1 | `data_chunk` ×N |
| 图表事件 | `chart_data` ×1 | `data_chunk` ×N |
| 表格效果 | 完整表格直接出现 | 行逐条滑入（`rowSlideIn` 动画） |
| 图表效果 | ECharts 整体入场动画 | ECharts 逐系列合并动画（`notMerge: false`） |
| 协议兼容 | 不变 | 新增 `data_chunk` 事件类型，互不干扰 |
| 适用场景 | 数据量小、生成快 | 数据量大、逐行/逐系列生成 |

---

## 10. 扩展指南

### 10.1 接入真实 LLM API

1. 修改 `aiService.ts` 的 `generateStream`：
   ```typescript
   export async function* generateStreamReal(message: string): AsyncGenerator<SSEEvent> {
     yield { type: 'thinking', data: { stage: 'analyzing', message: '正在分析...' } };
     
     const response = await fetch('https://api.openai.com/v1/chat/completions', {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${API_KEY}` },
       body: JSON.stringify({ model: 'gpt-4', messages: [...], stream: true }),
     });
     
     for await (const chunk of parseSSE(response.body)) {
       const content = chunk.choices[0]?.delta?.content;
       if (content) yield { type: 'text', data: { content } };
     }
     
     yield { type: 'done', data: null };
   }
   ```

2. 如果 LLM 支持 function calling，可以在 function 返回时插入 `table_data` 或 `chart_data` 事件。

### 10.2 添加新的内容块类型

1. 在 `chat.ts` 添加类型：
   ```typescript
   interface ImageContent {
     type: 'image';
     src: string;
     alt?: string;
   }
   type MessageContent = TextContent | TableContent | ChartContent | ImageContent;
   ```

2. 在 `ChatMessageItem.tsx` 的 `ContentBlockRenderer` 添加分支：
   ```typescript
   case "image": return <ImageRenderer data={block as ImageContent} isLoading={isLoading} />;
   ```

3. 创建 `ImageRenderer.tsx` 组件。

4. 如需支持逐块加载（流式生成），在 `SSEEventType` 添加对应事件类型（如 `image_chunk`），并在 `aiService.ts` 中编写生成器。

### 10.5 扩展逐块模式到其他场景

`data_chunk` 协议的通用性允许它扩展到任何需要逐步推送的数据类型。扩展步骤：
1. 后端：在 `SSEDataChunkEvent.data` 中添加新字段（如 `imageUrl`）
2. 前端 `handleDataChunk`：添加新的 `chunkType` 分支，遵循 replace-with-new-object 模式
3. 渲染器：支持增量数据更新（类似 DataTableRenderer 的逐行追加）
4. SSE 解析器的 switch：如需新的一次性事件类型，转化为 `handleDataChunk` 调用即可

### 10.3 支持历史消息加载

```typescript
// sbsjjc/index.tsx 中添加：
const [hasMore, setHasMore] = useState(true);

const loadMore = useCallback(async () => {
  const olderMessages = await fetchHistoryMessages(cursor);
  setMessages(prev => [...olderMessages, ...prev]);
}, []);

// Virtuoso 添加：
<Virtuoso
  firstItemIndex={olderCount}
  startReached={loadMore}
/>
```

### 10.4 国际化

`stageConfig` 中的 `label` 是目前唯一的中文硬编码。抽取为 i18n key 即可支持多语言。

---

## 附录：关键代码片段索引

| 想了解的内容 | 看哪个文件 | 关键位置 |
|-------------|-----------|----------|
| 所有类型定义 | `src/types/chat.ts` | 全文 136 行 |
| SSE 解析器整体流程 | `src/pages/sbsjjc/index.tsx` | `handleSend` 函数 |
| 一次性+逐块统一入口 | `src/pages/sbsjjc/index.tsx` | `handleDataChunk` 函数 |
| text 块累积为什么新建对象 | `src/pages/sbsjjc/index.tsx` | `case "text"` |
| 一次性事件如何转化为 chunk | `src/pages/sbsjjc/index.tsx` | `case "table_data"` / `case "chart_data"` |
| 行缓冲模式 | `src/pages/sbsjjc/index.tsx` | lineBuffer 相关 |
| React.memo 自定义比较（含深度检查） | `src/components/Chat/ChatMessageItem.tsx` | comparator 函数 |
| ContentBlockRenderer + isLoading | `src/components/Chat/ChatMessageItem.tsx` | `ContentBlockRenderer` |
| 思考过程状态计算 | `src/components/Chat/ThinkingProcess.tsx` | activeStage 计算 |
| 三阶段状态机 + chunk 兼容 | `src/components/Chat/DataTableRenderer.tsx` | `phase` + `useEffect` |
| 逐行 slide-in 动画 | `src/components/Chat/DataTableRenderer.tsx` | `@keyframes rowSlideIn` |
| chunk 残缺数据兜底 | `src/components/Chat/DataTableRenderer.tsx` | `isValid` 检查 |
| ECharts 按需加载 | `src/components/Chat/DataChartRenderer.tsx` | `echarts.use([...])` |
| notMerge=false 增量更新 | `src/components/Chat/DataChartRenderer.tsx` | `<ReactECharts notMerge={false}>` |
| chart config 缺 loss 兜底 | `src/pages/sbsjjc/index.tsx` | `handleDataChunk` chart 分支的 `chunk.config \|\| ...` |
| CSS 过渡双层结构 | `src/components/Chat/DataTableRenderer.tsx` | skeleton + table 层 |
| Markdown 安全修补 | `src/utils/sanitizeStreamingMarkdown.ts` | 全文 |
| 后端事件生成器（一次性） | `react-node/src/services/aiService.ts` | `generateDemoFlow` 等 |
| 后端逐块生成器 | `react-node/src/services/aiService.ts` | `generateChunkedFlow` |
| 后端延迟策略 | `react-node/src/routes/chat.ts` | delay switch |
| JSON 容错注入 | `react-node/src/routes/chat.ts` | `isJsonFallbackTest` |
