# AI 对话功能 — 完整学习文档

> React 18 + TypeScript + Express SSE，从架构到每一行代码的逐层解析

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

// SSE 事件名枚举（7 种事件）
type SSEEventType =
  | 'thinking'
  | 'text'
  | 'table_loading' | 'table_data'
  | 'chart_loading' | 'chart_data'
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
  data: SSEThinkingData | SSETextData | SSETableData | SSEChartData | null;
}

// 各种 data 类型：
interface SSEThinkingData   { stage: ThinkingStageType; message: string; }
interface SSETextData       { content: string; }
interface SSETableData      { title?; columns; data; }
interface SSEChartData      { chartType; title?; config; }
```

### 类型关系图

```
SSEEvent (传输层)
   │
   │  前端解析
   ▼
┌─────────────────────────────────────────┐
│  thinkingStages: ThinkingStage[]         │  ← 思考过程
│  contentBlocks:  MessageContent[]        │  ← 内容块
│       │                                  │
│       ├─ TextContent   → MarkdownRenderer
│       ├─ TableContent  → DataTableRenderer
│       └─ ChartContent  → DataChartRenderer
│                                          │
│  content: string  (兼容)                 │
└─────────────────────────────────────────┘
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
| `table_loading` | `{ message }` | 即将输出表格 | 设置 pending 标记 |
| `table_data` | `{ columns, data, title? }` | 表格完整数据 | push 到 `contentBlocks[]` |
| `chart_loading` | `{ message }` | 即将输出图表 | 设置 pending 标记 |
| `chart_data` | `{ chartType, config, title? }` | 图表配置 | push 到 `contentBlocks[]` |
| `done` | `null` | 流结束 | `isStreaming = false` |

### 为什么用 JSON 而非纯文本 SSE？

纯文本 SSE 只能传输单一类型数据。JSON 格式允许在一条流中混合多种事件类型，让前端能区分"这是一行文字"和"这是一个图表配置"，从而分层渲染。

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
if (event.type === 'thinking')       delay = 600ms;  // 思考停顿
else if (event.type === 'loading')   delay = 800ms;  // 加载停顿
else if (event.type === 'text')      delay = 50ms;   // 中文逐字（50ms/字）
else if (event.type === 'data')      delay = 100ms;  // 数据快速推送
else if (event.type === 'done')      delay = 10ms;
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
       │   ├─ 'text'         → 新建/追加 TextContent
       │   ├─ 'table_data'   → contentBlocks.push(TableContent)
       │   ├─ 'chart_data'   → contentBlocks.push(ChartContent)
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

**为什么必须新建？** 下游的 `ChatMessageItem` 使用 `React.memo` 做浅比较。如果原地修改，React 看到同一个对象引用，认为 props 没变，就跳过了重渲染。结果：只有第一个字显示，后续更新全部丢失。

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
    if (prev.message.content !== next.message.content) return false;
    if (prev.message.isStreaming !== next.message.isStreaming) return false;
    if (prev.message.thinkingStages?.length !== next.message.thinkingStages?.length) return false;
    if (prev.message.contentBlocks?.length !== next.message.contentBlocks?.length) return false;
    return true;  // 所有检查通过，跳过渲染
  }
);
```

**为什么只比较 length 而不是深度比较？**
- `content` 字段每次更新都会重新计算（text 块拼接），字符级变化会触发不等
- `thinkingStages` 和 `contentBlocks` 只在长度变化时触发渲染（新增步骤/新增块），因为现有元素的内容变化已通过 `content` 捕获
- 深度比较 N 个内容块成本高，length 比较足够覆盖大多数场景

#### 6.2.4 ContentBlockRenderer

```typescript
const ContentBlockRenderer: React.FC<{ block: MessageContent }> = ({ block }) => {
  switch (block.type) {
    case "text":   return <MarkdownRenderer content={block.text} />;
    case "table":  return <DataTableRenderer data={block} />;
    case "chart":  return <DataChartRenderer data={block} />;
  }
};
```

**故意不加 React.memo**：此前的 bug（只显示一个字）正是因为它加了 memo，而传入的 text 块引用不变（原地修改）。去掉 memo 后每次父组件重渲染都重新执行，渲染正确。

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
  isLoading ? 'skeleton' : 'ready'
);

// Effect 1: isLoading 从 true 变为 false 时触发过渡
useEffect(() => {
  if (!isLoading && phase === 'skeleton') {
    setTimeout(() => setPhase('expanding'), 50);
    setTimeout(() => {
      setPhase('ready');
      onReady?.();
    }, 500);
  }
}, [isLoading, phase]);

// Effect 2: data 到达时且 phase 为 skeleton 时触发过渡
useEffect(() => {
  if (data && !isLoading && phase === 'skeleton') {
    setTimeout(() => setPhase('expanding'), 50);
    setTimeout(() => setPhase('ready'), 500);
  }
}, [data, isLoading]);
```

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

#### 6.5.1 ECharts 按需加载

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

#### 6.5.2 与 DataTableRenderer 的区别

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

#### 6.5.3 ECharts 渲染就绪回调

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
| DataChartRenderer 骨架→图表 | 淡入 + 缩放 + 位移 | `transition: opacity 0.6s, transform 0.6s` | 0.6s |
| ECharts 图表内部 | 数据动画（弹性缓出） | `animationDuration: 1500, animationEasing: elasticOut` | 1.5s |
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
| table_data 缺 columns | `columns` 为 null | `DataTableRenderer` | 显示 ⚠️ 错误提示 |
| table_data 缺 data | `data` 为 null | `DataTableRenderer` | 显示 ⚠️ 错误提示 |
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
   case "image": return <ImageRenderer data={block as ImageContent} />;
   ```

3. 创建 `ImageRenderer.tsx` 组件。

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

| 想了解的内容 | 看哪个文件 | 关键行 |
|-------------|-----------|--------|
| 所有类型定义 | `src/types/chat.ts` | 全文 114 行 |
| SSE 解析器怎么写 | `src/pages/sbsjjc/index.tsx` | `handleSend` 函数 (L26-L261) |
| text 块累积为什么新建对象 | `src/pages/sbsjjc/index.tsx` | L117-L131 |
| 行缓冲模式 | `src/pages/sbsjjc/index.tsx` | L76-L88 |
| React.memo 自定义比较 | `src/components/Chat/ChatMessageItem.tsx` | L93-L104 |
| 思考过程状态计算 | `src/components/Chat/ThinkingProcess.tsx` | L46-L53 |
| 三阶段状态机 | `src/components/Chat/DataTableRenderer.tsx` | L18-L54 |
| ECharts 按需加载 | `src/components/Chat/DataChartRenderer.tsx` | L3-L30 |
| CSS 过渡双层结构 | `src/components/Chat/DataTableRenderer.tsx` | L65-L100 |
| Markdown 安全修补 | `src/utils/sanitizeStreamingMarkdown.ts` | 全文 31 行 |
| 后端事件生成器 | `react-node/src/services/aiService.ts` | `generateDemoFlow` 等函数 |
| 后端延迟策略 | `react-node/src/routes/chat.ts` | L61-L76 |
| JSON 容错注入 | `react-node/src/routes/chat.ts` | L44-L52 |
