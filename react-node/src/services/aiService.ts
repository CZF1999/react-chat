/**
 * 模拟 AI 流式响应生成
 * 返回结构化 SSE 事件数组，支持：
 * - thinking: 思考过程阶段
 * - text: 流式文本
 * - table_loading / table_data: 表格数据
 * - chart_loading / chart_data: 图表数据
 * - done: 流结束
 */

export interface SSEThinkingEvent {
  type: 'thinking';
  data: { stage: 'analyzing' | 'searching' | 'processing' | 'generating' | 'done'; message: string };
}

export interface SSETextEvent {
  type: 'text';
  data: { content: string };
}

export interface SSETableLoadingEvent {
  type: 'table_loading';
  data: { message: string };
}

export interface SSETableDataEvent {
  type: 'table_data';
  data: {
    title?: string;
    columns: { key: string; title: string; dataIndex: string; width?: number }[];
    data: Record<string, any>[];
  };
}

export interface SSEChartLoadingEvent {
  type: 'chart_loading';
  data: { message: string };
}

export interface SSEChartDataEvent {
  type: 'chart_data';
  data: {
    chartType: 'bar' | 'line' | 'pie' | 'scatter';
    title?: string;
    config: Record<string, any>;
  };
}

export interface SSEDoneEvent {
  type: 'done';
  data: null;
}

export interface SSEDataChunkEvent {
  type: 'data_chunk';
  data: {
    chunkType: 'table' | 'chart';
    index: number;
    total?: number;
    columns?: { key: string; title: string; dataIndex: string; width?: number }[];
    title?: string;
    rows?: Record<string, any>[];
    chartType?: 'bar' | 'line' | 'pie' | 'scatter';
    /** 首 chunk 可携带完整 ECharts option（含 yAxis/tooltip/legend 等） */
    config?: Record<string, any>;
    series?: Record<string, any>[];
    xAxisData?: string[];
  };
}

export type SSEEvent =
  | SSEThinkingEvent
  | SSETextEvent
  | SSETableLoadingEvent
  | SSETableDataEvent
  | SSEChartLoadingEvent
  | SSEChartDataEvent
  | SSEDataChunkEvent
  | SSEDoneEvent;

// ==================== Mock 表格数据 ====================

const mockSalesTable = {
  title: '2025年各季度销售数据',
  columns: [
    { key: 'quarter', title: '季度', dataIndex: 'quarter', width: 100 },
    { key: 'revenue', title: '营收（万元）', dataIndex: 'revenue', width: 130 },
    { key: 'cost', title: '成本（万元）', dataIndex: 'cost', width: 130 },
    { key: 'profit', title: '利润（万元）', dataIndex: 'profit', width: 130 },
    { key: 'growth', title: '同比增长', dataIndex: 'growth', width: 100 },
  ],
  data: [
    { quarter: 'Q1', revenue: 1280, cost: 860, profit: 420, growth: '+12.5%' },
    { quarter: 'Q2', revenue: 1560, cost: 920, profit: 640, growth: '+18.3%' },
    { quarter: 'Q3', revenue: 1890, cost: 1050, profit: 840, growth: '+22.7%' },
    { quarter: 'Q4', revenue: 2340, cost: 1280, profit: 1060, growth: '+31.2%' },
  ],
};

const mockUserTable = {
  title: '用户活跃度统计',
  columns: [
    { key: 'month', title: '月份', dataIndex: 'month', width: 100 },
    { key: 'dau', title: '日活用户', dataIndex: 'dau', width: 110 },
    { key: 'mau', title: '月活用户', dataIndex: 'mau', width: 110 },
    { key: 'newUsers', title: '新增用户', dataIndex: 'newUsers', width: 110 },
    { key: 'retention', title: '留存率', dataIndex: 'retention', width: 100 },
  ],
  data: [
    { month: '1月', dau: '12,580', mau: '89,200', newUsers: '3,420', retention: '68.5%' },
    { month: '2月', dau: '13,100', mau: '92,500', newUsers: '4,150', retention: '71.2%' },
    { month: '3月', dau: '14,320', mau: '98,300', newUsers: '5,280', retention: '73.8%' },
    { month: '4月', dau: '15,890', mau: '105,600', newUsers: '6,100', retention: '75.1%' },
    { month: '5月', dau: '16,450', mau: '112,800', newUsers: '7,340', retention: '76.9%' },
    { month: '6月', dau: '18,200', mau: '121,500', newUsers: '8,920', retention: '78.4%' },
  ],
};

// ==================== Mock 图表配置 ====================

function createBarChartConfig(): Record<string, any> {
  return {
    title: { text: '季度营收与利润对比', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['营收', '成本', '利润'], bottom: 0 },
    xAxis: { type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'] },
    yAxis: { type: 'value', name: '万元' },
    series: [
      { name: '营收', type: 'bar', data: [1280, 1560, 1890, 2340], itemStyle: { color: '#1677ff' } },
      { name: '成本', type: 'bar', data: [860, 920, 1050, 1280], itemStyle: { color: '#ff7875' } },
      { name: '利润', type: 'bar', data: [420, 640, 840, 1060], itemStyle: { color: '#52c41a' } },
    ],
    animationDuration: 1500,
    animationEasing: 'elasticOut' as const,
  };
}

function createLineChartConfig(): Record<string, any> {
  return {
    title: { text: '用户增长趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['日活', '月活', '新增'], bottom: 0 },
    xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
    yAxis: { type: 'value', name: '用户数' },
    series: [
      { name: '日活', type: 'line', data: [12580, 13100, 14320, 15890, 16450, 18200], smooth: true, itemStyle: { color: '#1677ff' } },
      { name: '月活', type: 'line', data: [89200, 92500, 98300, 105600, 112800, 121500], smooth: true, itemStyle: { color: '#52c41a' } },
      { name: '新增', type: 'line', data: [3420, 4150, 5280, 6100, 7340, 8920], smooth: true, itemStyle: { color: '#faad14' } },
    ],
    animationDuration: 1500,
    animationEasing: 'cubicInOut' as const,
  };
}

function createPieChartConfig(): Record<string, any> {
  return {
    title: { text: '用户来源分布', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { data: ['搜索引擎', '社交媒体', '直接访问', '邮件营销', '其他'], bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      data: [
        { value: 4230, name: '搜索引擎' },
        { value: 3180, name: '社交媒体' },
        { value: 2560, name: '直接访问' },
        { value: 1520, name: '邮件营销' },
        { value: 890, name: '其他' },
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      animationType: 'scale',
      animationEasing: 'elasticOut',
    }],
    animationDuration: 1500,
  };
}

// ==================== 流式事件生成 ====================

/**
 * 将文本按分词拆分为 token 数组
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const regex = /([一-鿿])|([a-zA-Z0-9_]+)|(\s+)|(\n)|([^一-鿿\w\s])/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

/**
 * 从文本生成 text 事件流（token 级别，用于打字机效果）
 */
function* generateTextEvents(text: string): Generator<SSEEvent> {
  const tokens = tokenize(text);
  for (const token of tokens) {
    yield { type: 'text', data: { content: token } };
  }
}

/**
 * 生成完整的演示流（包含思考→文本→表格→图表）
 */
function* generateDemoFlow(): Generator<SSEEvent> {
  // ============ 阶段1: 分析问题 ============
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在理解您的问题...' } };
  yield* generateTextEvents(
    '好的，我来为您做一份全面的数据分析报告。本次分析涵盖销售数据、用户增长、技术架构建议等多个维度。\n\n' +
    '## 一、数据概览\n\n' +
    '在开始详细分析之前，先了解几个核心指标的计算方式：\n\n' +
    '**利润计算公式**（行内 LaTeX）：\n\n' +
    '$$P = R - C$$\n\n' +
    '其中 $P$ 为利润，$R$ 为营收，$C$ 为成本。\n\n' +
    '> 数据来源：2025年度财务与运营报表。所有金额单位均为人民币（万元），用户数据已脱敏处理。\n\n'
  );
  yield { type: 'thinking', data: { stage: 'done', message: '问题分析完成' } };

  // ============ 阶段2: 检索数据 ============
  yield { type: 'thinking', data: { stage: 'searching', message: '正在检索销售与用户数据...' } };
  yield* generateTextEvents(
    '## 二、销售数据详情\n\n' +
    '首先让我们看看各季度的销售情况。以下是用 **TypeScript** 编写的数据处理函数：\n\n' +
    '```typescript\n' +
    'interface QuarterData {\n' +
    '  quarter: string;\n' +
    '  revenue: number;   // 营收（万元）\n' +
    '  cost: number;      // 成本（万元）\n' +
    '  profit: number;    // 利润（万元）\n' +
    '}\n\n' +
    'function calcGrowthRate(data: QuarterData[]): number[] {\n' +
    '  return data.map((item, idx, arr) => {\n' +
    '    if (idx === 0) return 0;\n' +
    '    const prev = arr[idx - 1].profit;\n' +
    '    return ((item.profit - prev) / prev) * 100;\n' +
    '  });\n' +
    '}\n\n' +
    '// 计算结果：Q4 环比增长 26.2%\n' +
    'console.log(calcGrowthRate(quarterlyData));\n' +
    '```\n\n' +
    '以及对应的 **Python** 数据分析脚本：\n\n' +
    '```python\n' +
    'import pandas as pd\n' +
    'import numpy as np\n\n' +
    'def analyze_profit_margin(df: pd.DataFrame) -> dict:\n' +
    '    """计算各季度利润率及环比变化"""\n' +
    '    df["margin"] = (df["profit"] / df["revenue"]) * 100\n' +
    '    df["margin_change"] = df["margin"].diff()\n' +
    '    return {\n' +
    '        "avg_margin": df["margin"].mean(),\n' +
    '        "best_quarter": df.loc[df["margin"].idxmax(), "quarter"],\n' +
    '        "trend": "上升" if df["margin"].is_monotonic_increasing else "波动"\n' +
    '    }\n\n' +
    'result = analyze_profit_margin(sales_df)\n' +
    'print(f"平均利润率: {result[\'avg_margin\']:.1f}%")\n' +
    'print(f"最佳季度: {result[\'best_quarter\']}")\n' +
    '```\n\n' +
    '处理后的数据表格如下：\n\n'
  );
  yield { type: 'thinking', data: { stage: 'done', message: '数据检索完成' } };

  // ============ 阶段3: 表格渲染 ============
  yield { type: 'thinking', data: { stage: 'processing', message: '正在整理表格数据...' } };
  yield { type: 'table_loading', data: { message: '正在生成销售数据表格...' } };
  yield { type: 'thinking', data: { stage: 'done', message: '表格数据整理完成' } };
  yield { type: 'table_data', data: mockSalesTable };

  // ============ 阶段4: 图表可视化 ============
  yield* generateTextEvents(
    '\n\n## 三、可视化分析\n\n' +
    '从表格数据可以看出几个关键趋势：\n\n' +
    '1. **营收持续增长**：Q1 到 Q4 营收从 1,280 万增长至 2,340 万，增幅达 82.8%\n' +
    '2. **利润率稳定提升**：Q1 利润率约 32.8%，Q4 提升至 45.3%\n' +
    '3. **成本控制有效**：成本增速（48.8%）远低于营收增速（82.8%）\n\n' +
    '让我用图表来更直观地展示这些趋势。首先是营收与利润的柱状图对比：\n\n'
  );
  yield { type: 'thinking', data: { stage: 'generating', message: '正在生成可视化图表...' } };
  yield { type: 'chart_loading', data: { message: '正在生成营收对比图表...' } };
  yield { type: 'thinking', data: { stage: 'done', message: '营收图表生成完成' } };
  yield { type: 'chart_data', data: { chartType: 'bar', title: '季度营收与利润对比', config: createBarChartConfig() } };

  yield* generateTextEvents(
    '\n\n接下来看用户增长的趋势：\n\n' +
    '用户增长遵循经典的 **AARRR 模型**（海盗指标）：\n\n' +
    '| 阶段 | 指标 | 当前数据 |\n' +
    '|------|------|----------|\n' +
    '| Acquisition | 新增用户/月 | 8,920 |\n' +
    '| Activation | 日活用户 | 18,200 |\n' +
    '| Retention | 6月留存率 | 78.4% |\n' +
    '| Revenue | 月活 ARPU | ¥18.6 |\n' +
    '| Referral | 邀请率 | 12.3% |\n\n' +
    '下面是对应的折线趋势图：\n\n'
  );
  yield { type: 'chart_loading', data: { message: '正在生成用户增长趋势图...' } };
  yield { type: 'chart_data', data: { chartType: 'line', title: '用户增长趋势', config: createLineChartConfig() } };

  yield* generateTextEvents(
    '\n\n用户来源的分布情况如下，可以看出搜索引擎和社交媒体是主要流量入口：\n\n' +
    '渠道占比的 **基尼系数** 可以用来衡量流量集中度：\n\n' +
    '$$G = 1 - \\sum_{i=1}^{n} p_i^2$$\n\n' +
    '计算结果显示出流量来源相对多元化，风险可控。\n\n'
  );
  yield { type: 'chart_loading', data: { message: '正在生成用户来源分布图...' } };
  yield { type: 'chart_data', data: { chartType: 'pie', title: '用户来源分布', config: createPieChartConfig() } };

  // ============ 阶段5: 总结 ============
  yield* generateTextEvents(
    '\n\n## 四、总结与建议\n\n' +
    '综合以上分析，主要结论如下：\n\n' +
    '**✅ 优势方面：**\n\n' +
    '- 营收连续四个季度保持两位数增长，Q4 突破 2,340 万\n' +
    '- 利润率从 32.8% 提升至 45.3%，成本控制成效显著\n' +
    '- 用户留存率达到 78.4%，高于行业平均水平（约 60%）\n\n' +
    '**⚠️ 需要关注：**\n\n' +
    '- 社交媒体渠道占比下降，需加强社媒运营投入\n' +
    '- Q3→Q4 新增用户增速放缓（+21.5% vs Q2→Q3 +27.2%）\n\n' +
    '**📋 行动建议：**\n\n' +
    '1. 加大 Q4 旺季的市场投放预算\n' +
    '2. 优化新用户引导流程，目标将 Day-1 留存从 45% 提升至 55%\n' +
    '3. 启动 SEO 优化专项，提升搜索引擎渠道的转化率\n\n' +
    '> 💡 **提示**：以上数据为演示数据，实际生产环境中请接入真实数据源。如需定制化分析，可以继续向我提问。\n\n' +
    '以上就是完整的分析报告，如有疑问欢迎继续交流！'
  );
  yield { type: 'thinking', data: { stage: 'done', message: '全部内容生成完毕' } };
  yield { type: 'done', data: null };
}

/**
 * 生成简单回复流
 */
function* generateSimpleFlow(message: string): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在分析您的问题...' } };
  yield { type: 'thinking', data: { stage: 'done', message: '分析完成' } };

  yield { type: 'thinking', data: { stage: 'generating', message: '正在生成回复...' } };

  let reply: string;
  const lower = message.toLowerCase();

  if (/你好|hello|hi|嗨/.test(lower)) {
    reply = `你好！👋 很高兴为您服务。

我是 **AI 数据分析助手**，支持以下能力：

| 功能 | 说明 |
|------|------|
| 📝 Markdown 渲染 | GFM 表格、代码高亮、LaTeX 公式 |
| 🧠 思考过程 | 实时展示 AI 分析步骤 |
| 📊 数据表格 | 骨架屏 → 表格平滑过渡 |
| 📈 可视化图表 | 柱状图、折线图、饼图（ECharts） |
| ⚡ 流式输出 | SSE 实时推送，打字机效果 |

您可以尝试问我：
- **"分析销售数据"** — 查看完整的分析报告演示
- **"markdown 演示"** — 查看 Markdown 渲染能力
- 任何其他问题我也会尽力回答！`;
  } else if (/帮助|help/.test(lower)) {
    reply = `我是 AI 数据分析助手，支持以下功能：

## 核心能力

1. **文本对话** — 流式输出，打字机效果
2. **思考过程** — 展示 AI 的分析步骤（分析→检索→处理→生成）
3. **表格展示** — 从骨架屏平滑过渡到数据表格
4. **图表可视化** — 柱状图、折线图、饼图，带入场动画

## 使用方式

试试发送以下关键词来体验：

| 关键词 | 效果 |
|--------|------|
| **"分析销售数据"** | 完整报告（Markdown + 表格 + 图表） |
| **"markdown 演示"** | 测试 Markdown 渲染能力 |
| **"图表"** | 查看多种图表类型 |
| **"对比"** | 用户数据对比分析 |

> 💡 这是一个演示项目，后端使用 mock 数据模拟 AI 响应。`;
  } else if (/markdown|渲染/.test(lower)) {
    reply = `好的，让我展示一下支持的 Markdown 格式！

## 标题层级

### 三级标题

#### 四级标题

---

## 文本样式

**粗体文字**、*斜体文字*、~~删除线~~、\`行内代码\`

## 代码块

\`\`\`typescript
// TypeScript 泛型示例
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);
  return res.json();
}
\`\`\`

\`\`\`python
# Python 数据处理
from typing import List, Dict

def group_by_category(
    items: List[Dict], key: str
) -> Dict[str, List[Dict]]:
    result = {}
    for item in items:
        k = item.get(key, "other")
        result.setdefault(k, []).append(item)
    return result
\`\`\`

## 数学公式（LaTeX）

行内公式：勾股定理 $a^2 + b^2 = c^2$

块级公式：

$$
\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)
$$

矩阵表示：

$$
\\begin{pmatrix}
a_{11} & a_{12} & a_{13} \\\\
a_{21} & a_{22} & a_{23} \\\\
a_{31} & a_{32} & a_{33}
\\end{pmatrix}
$$

## 列表

### 有序列表

1. 安装依赖 \`pnpm install\`
2. 启动开发服务器 \`pnpm dev\`
3. 打开浏览器访问 \`http://localhost:5173\`

### 无序列表

- React 18 + TypeScript
- Ant Design 6.x 组件库
- ECharts 图表渲染
- Zustand 状态管理
- react-markdown 富文本渲染

### 任务列表

- [x] 项目初始化
- [x] SSE 流式输出
- [x] Markdown 渲染
- [x] 思考过程展示
- [x] 表格 / 图表过渡动画
- [ ] 接入真实 LLM API

## 引用

> 优秀的代码是写给人看的，顺便能被机器执行。
> — *Structure and Interpretation of Computer Programs*

## 表格

| 技术栈 | 版本 | 用途 |
|--------|------|------|
| React | 18.3 | UI 框架 |
| TypeScript | 6.0 | 类型系统 |
| Vite | 8.1 | 构建工具 |
| Ant Design | 6.5 | 组件库 |
| ECharts | 6.1 | 图表渲染 |

以上就是主要的 Markdown 渲染能力展示！`;
  } else {
    reply = `收到您的问题："${message}"

我目前是演示模式，以下是您可以尝试的关键词：

| 关键词 | 效果 |
|--------|------|
| **"分析销售数据"** | 完整数据分析报告 |
| **"markdown 演示"** | Markdown 渲染能力展示 |
| **"图表"** | 多种图表类型 |
| **"对比"** | 用户数据对比分析 |
| **"表格"** | 纯表格演示 |
| **"你好"** | 功能概览 |

> 💡 试试 **"分析销售数据"** 获得最佳体验！

您想了解哪方面的信息呢？`;
  }

  yield* generateTextEvents(reply);
  yield { type: 'thinking', data: { stage: 'done', message: '回复生成完毕' } };
  yield { type: 'done', data: null };
}

/**
 * 仅文本流（无表格/图表）
 */
function* generateTextOnlyFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在分析您的问题...' } };
  yield { type: 'thinking', data: { stage: 'done', message: '分析完成' } };
  yield { type: 'thinking', data: { stage: 'generating', message: '正在生成回复...' } };

  const text = `以下是相关技术分析：

## 技术选型建议

对于中大型项目，我推荐以下技术栈：

| 层级 | 推荐方案 | 备选方案 |
|------|----------|----------|
| 前端框架 | React 18+ | Vue 3 |
| 状态管理 | Zustand | Redux Toolkit |
| UI 组件库 | Ant Design 5 | shadcn/ui |
| 构建工具 | Vite | Turbopack |
| 类型系统 | TypeScript | — |

关键考量因素包括：团队熟悉度、社区生态、长期维护成本和性能需求。`;

  yield* generateTextEvents(text);
  yield { type: 'thinking', data: { stage: 'done', message: '回复生成完毕' } };
  yield { type: 'done', data: null };
}

/**
 * 逐块流式演示：表格逐行追加，图表逐系列构建。
 * 触发关键词：逐行, 追加, chunk, 分块, 逐条, 逐步
 */
function* generateChunkedFlow(): Generator<SSEEvent> {
  // --- Phase 1: 介绍 ---
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在处理您的请求（逐块模式）...' } };
  yield* generateTextEvents('好的，我将使用**逐块流式**模式展示数据。\n\n');
  yield* generateTextEvents('> 📦 表格将**逐行追加**，图表将**逐系列构建**——您可以观察数据逐步到达的过程。\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '准备就绪' } };

  // --- Phase 2: 逐行表格 ---
  yield { type: 'thinking', data: { stage: 'processing', message: '正在逐行加载表格数据...' } };
  yield* generateTextEvents('## 销售数据（逐行加载）\n\n');

  const tableRows = mockSalesTable.data;
  // Chunk 0: columns + 第一行
  yield {
    type: 'data_chunk',
    data: {
      chunkType: 'table',
      index: 0,
      total: tableRows.length,
      columns: mockSalesTable.columns,
      title: mockSalesTable.title,
      rows: [tableRows[0]],
    },
  };

  // Chunk 1..N-1: 每次追加一行
  for (let i = 1; i < tableRows.length; i++) {
    yield* generateTextEvents('.'); // 视觉反馈小点
    yield {
      type: 'data_chunk',
      data: {
        chunkType: 'table',
        index: i,
        total: tableRows.length,
        rows: [tableRows[i]],
      },
    };
  }

  yield* generateTextEvents(' 表格加载完成！✅\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '表格加载完成' } };

  // --- Phase 3: 逐系列图表 ---
  yield { type: 'thinking', data: { stage: 'generating', message: '正在逐步构建图表...' } };
  yield* generateTextEvents('## 营收对比图表（逐系列构建）\n\n');

  const barConfig = createBarChartConfig();
  const seriesArray = barConfig.series as Record<string, any>[];
  const seriesNames = ['营收', '成本', '利润'];
  const seriesIcons = ['📊', '📉', '💰'];

  // Chunk 0: 完整 ECharts option（只含首个 series，后续 chunk 追加）
  yield* generateTextEvents(`${seriesIcons[0]} 添加 **${seriesNames[0]}** 数据... `);
  yield {
    type: 'data_chunk',
    data: {
      chunkType: 'chart',
      index: 0,
      total: seriesArray.length,
      chartType: 'bar',
      title: '季度营收与利润对比（逐块模式）',
      // 下发完整 ECharts option（含 yAxis / tooltip / legend / animation）
      config: { ...barConfig, series: [seriesArray[0]] },
      xAxisData: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [seriesArray[0]],
    },
  };

  // Chunk 1..2: 追加后续 series
  for (let i = 1; i < seriesArray.length; i++) {
    yield* generateTextEvents(`${seriesIcons[i]} 添加 **${seriesNames[i]}** 数据... `);
    yield {
      type: 'data_chunk',
      data: {
        chunkType: 'chart',
        index: i,
        total: seriesArray.length,
        series: [seriesArray[i]],
      },
    };
  }

  yield* generateTextEvents(' 图表构建完成！✅\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '图表构建完成' } };

  // --- Phase 4: 总结 ---
  yield* generateTextEvents(
    '## 总结\n\n' +
    '以上就是**逐块流式加载**的完整演示：\n\n' +
    `- **表格**：${tableRows.length} 行数据分 ${tableRows.length} 个 chunk 逐行到达\n` +
    `- **图表**：${seriesArray.length} 个系列分 ${seriesArray.length} 个 chunk 逐步追加\n\n` +
    '> 💡 **对比一次性模式**：输入 `分析销售数据` 可以看到同样的数据以完整块方式一次性到达，' +
    '而逐块模式让用户在首块数据到达后即可开始浏览，无需等待所有数据就绪。\n'
  );

  yield { type: 'done', data: null };
}

/**
 * 根据用户消息匹配合适的流式响应
 * @returns SSE 事件生成器
 */
export function generateStream(message: string): SSEEvent[] {
  const lower = message.toLowerCase();

  // ===== 边界测试场景（优先匹配） =====

  // 测试1: 未闭合 Markdown 中断
  if (/中断.*markdown|markdown.*中断|未闭合|代码块.*中断/.test(lower)) {
    return [...generateInterruptedMarkdownFlow()];
  }

  // 测试2: 异常/残缺数据
  if (/异常.*数据|数据.*异常|残缺|损坏|bad.?data/.test(lower)) {
    return [...generateBadDataFlow()];
  }

  // 测试3: loading 后中断
  if (/加载.*中断|中断.*加载|表格.*中断|loading.*interrupt/.test(lower)) {
    return [...generateLoadingInterruptedFlow()];
  }

  // 测试4: JSON 容错（需要在 chat.ts 中配合注入原始文本）
  if (/json.*错误|容错|fallback/.test(lower)) {
    return [...generateJsonFallbackFlow()];
  }

  // 逐块流式演示（表格逐行 / 图表逐系列）
  if (/逐行|追加|chunk|分块|逐条|逐步/.test(lower)) {
    return [...generateChunkedFlow()];
  }

  // 匹配包含"markdown"、"渲染" → Markdown 演示
  if (/markdown|渲染/.test(lower)) {
    return [...generateSimpleFlow(message)];
  }

  // 匹配包含"分析"、"数据"、"销售"等关键词 → 完整演示
  if (/分析|数据|销售|报表|统计/.test(lower)) {
    return [...generateDemoFlow()];
  }

  // 匹配包含"图表"、"可视化" → 轻量图表演示
  if (/图表|可视化|chart|趋势|增长/.test(lower)) {
    return [...generateChartFlow()];
  }

  // 匹配包含"对比"、"用户" → 用户数据演示
  if (/对比|用户|活跃/.test(lower)) {
    return [...generateUserDataFlow()];
  }

  // 匹配包含"表格"、"table" → 表格+文本
  if (/表格|table/.test(lower)) {
    return [...generateTableFlow()];
  }

  return [...generateSimpleFlow(message)];
}

// ==================== 辅助流 ====================

function* generateChartFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在分析数据可视化需求...' } };
  yield* generateTextEvents('好的，让我为您生成数据可视化图表：\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '需求分析完成' } };

  yield { type: 'thinking', data: { stage: 'generating', message: '正在生成图表...' } };
  yield { type: 'chart_loading', data: { message: '正在生成营收对比图表...' } };
  yield { type: 'chart_data', data: { chartType: 'bar', title: '季度营收与利润对比', config: createBarChartConfig() } };
  yield* generateTextEvents('\n\n');
  yield { type: 'chart_loading', data: { message: '正在生成趋势图...' } };
  yield { type: 'chart_data', data: { chartType: 'line', title: '用户增长趋势', config: createLineChartConfig() } };
  yield* generateTextEvents('\n\n');
  yield { type: 'chart_loading', data: { message: '正在生成分布图...' } };
  yield { type: 'chart_data', data: { chartType: 'pie', title: '用户来源分布', config: createPieChartConfig() } };
  yield { type: 'thinking', data: { stage: 'done', message: '图表生成完毕' } };
  yield { type: 'done', data: null };
}

function* generateUserDataFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在理解数据需求...' } };
  yield { type: 'thinking', data: { stage: 'done', message: '需求理解完成' } };
  yield { type: 'thinking', data: { stage: 'searching', message: '正在检索用户数据...' } };
  yield* generateTextEvents('为您查询到以下用户活跃度数据：\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '数据检索完成' } };

  yield { type: 'table_loading', data: { message: '正在生成用户活跃度表格...' } };
  yield { type: 'table_data', data: mockUserTable };

  yield* generateTextEvents('\n\n对应的趋势图如下：\n\n');
  yield { type: 'chart_loading', data: { message: '正在生成趋势图...' } };
  yield { type: 'chart_data', data: { chartType: 'line', title: '用户增长趋势', config: createLineChartConfig() } };
  yield { type: 'thinking', data: { stage: 'done', message: '数据展示完毕' } };
  yield { type: 'done', data: null };
}

function* generateTableFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在分析请求...' } };
  yield* generateTextEvents('以下是为您整理的数据表格：\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '分析完成' } };

  yield { type: 'table_loading', data: { message: '正在生成销售数据表格...' } };
  yield { type: 'table_data', data: mockSalesTable };

  yield* generateTextEvents('\n\n');
  yield { type: 'table_loading', data: { message: '正在生成用户活跃度表格...' } };
  yield { type: 'table_data', data: mockUserTable };
  yield { type: 'thinking', data: { stage: 'done', message: '表格生成完毕' } };
  yield { type: 'done', data: null };
}

// ==================== 边界测试场景 ====================

/**
 * 测试场景1：未闭合 Markdown — 流式输出被中断
 * 模拟：代码块和公式写到一半突然 stop
 * 预期：sanitizeStreamingMarkdown 自动补全未闭合的围栏
 */
function* generateInterruptedMarkdownFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在分析问题...' } };
  yield* generateTextEvents(
    '下面是一段包含未闭合代码块的 Markdown：\n\n' +
    '## 中断测试\n\n' +
    '这段代码演示了异步数据获取：\n\n' +
    '```typescript\n' +
    'async function loadData() {\n' +
    '  const response = await fetch'  // 注意：故意在这里中断，代码块未闭合
  );
  yield { type: 'thinking', data: { stage: 'done', message: '分析完成' } };

  // 模拟 LaTeX 公式也写一半
  yield* generateTextEvents(
    '\n\n接下来是一个未完成的 LaTeX 公式：\n\n' +
    '$$\n' +
    '\\frac{\\partial f}{\\partial t} = '  // 公式未闭合
  );

  yield { type: 'thinking', data: { stage: 'generating', message: '正在生成更多内容...' } };
  yield* generateTextEvents(
    '\n\n再试一个行内公式 $E = mc'  // 行内 $ 未闭合
  );

  // 正常结束 — 用户点击停止也走 finally 同样的逻辑
  yield { type: 'done', data: null };
}

/**
 * 测试场景2：异常/残缺数据
 * 模拟：table_data 和 chart_data 缺失关键字段
 * 预期：DataTableRenderer / DataChartRenderer 显示错误提示而非崩溃
 */
function* generateBadDataFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在分析数据...' } };
  yield* generateTextEvents('以下是异常数据测试：\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '分析完成' } };

  // 场景2a: 表格 — columns 为 null
  yield { type: 'thinking', data: { stage: 'processing', message: '正在尝试获取表格数据...' } };
  yield* generateTextEvents('### 表格1：缺少 columns\n\n');
  yield {
    type: 'table_data',
    data: {
      title: '残缺表格（无 columns）',
      columns: null as any,
      data: [{ a: 1 }, { a: 2 }],
    },
  };

  // 场景2b: 表格 — data 为 null
  yield* generateTextEvents('\n\n### 表格2：缺少 data\n\n');
  yield {
    type: 'table_data',
    data: {
      title: '残缺表格（无 data）',
      columns: [{ key: 'x', title: 'X', dataIndex: 'x' }],
      data: null as any,
    },
  };

  // 场景2c: 表格 — 完全为空
  yield* generateTextEvents('\n\n### 表格3：空对象\n\n');
  yield {
    type: 'table_data',
    data: {} as any,
  };

  // 场景2d: 图表 — config 为 null
  yield* generateTextEvents('\n\n### 图表1：缺少 config\n\n');
  yield {
    type: 'chart_data',
    data: {
      chartType: 'bar' as const,
      title: '残缺图表（无 config）',
      config: null as any,
    },
  };

  // 场景2e: 正常表格（对比）
  yield* generateTextEvents('\n\n### 正常表格（对比）\n\n');
  yield {
    type: 'table_data',
    data: {
      title: '正常表格',
      columns: [{ key: 'ok', title: '状态', dataIndex: 'ok' }],
      data: [{ ok: '✅ 此表格正常' }],
    },
  };

  yield { type: 'thinking', data: { stage: 'done', message: '异常数据测试完毕' } };
  yield { type: 'done', data: null };
}

/**
 * 测试场景3：loading 后中断 — table_loading/chart_loading 后没有对应 data
 * 模拟：用户中途点击"停止"，table_loading 已发出但 data 没到达
 * 预期：页面不崩溃，不残留骨架屏
 */
function* generateLoadingInterruptedFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在准备加载数据...' } };
  yield* generateTextEvents('这个场景模拟加载中断：\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '准备完成' } };

  yield* generateTextEvents('正在请求表格数据...\n\n');

  // 发出 table_loading，但后面没有 table_data — 模拟中断
  yield { type: 'table_loading', data: { message: '正在加载销售数据...' } };

  yield* generateTextEvents('加载过程中用户点击了停止。\n\n');

  yield { type: 'thinking', data: { stage: 'generating', message: '尝试生成图表...' } };
  yield { type: 'chart_loading', data: { message: '正在加载趋势图...' } };

  // 同样发出 chart_loading 但不发 chart_data
  yield* generateTextEvents(
    '图表加载也被中断。以下是最后一段正常文本，演示中断后的状态：\n\n' +
    '> ⚠️ 以上 loading 事件没有对应的 data 事件，前端应优雅处理。\n\n' +
    '`pendingLoadingBlock` 是局部变量，不会被渲染。页面不应出现残留骨架屏或报错。'
  );

  yield { type: 'done', data: null };
}

/**
 * 测试场景4：JSON 解析容错 — 混合有效事件和非法数据
 * 模拟：SSE 流中混入了非 JSON 文本或其他异常
 * 预期：非法数据降级为纯文本显示，不中断后续解析
 */
function* generateJsonFallbackFlow(): Generator<SSEEvent> {
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在接收数据流...' } };

  // 正常文本
  yield* generateTextEvents('这是一条正常的 SSE 文本流。');

  // 直接 push 原始字符串（不是 JSON），会在解析时进入 catch 分支
  // 注意：generateStream 返回 SSEEvent[]，我们需要借助 chat.ts 的发送逻辑来模拟
  // 这里 trick：在 text content 中嵌入看起来像损坏 JSON 的内容
  yield* generateTextEvents(
    '\n\n下面模拟一段原始 SSE 输出（非 JSON 格式，兼容旧版）：\n\n' +
    '```\n' +
    'data: 这是一段原始文本（未包装为 JSON）\n' +
    'data: {"type":"text","data":{"content":"这是包装后的文本"}}\n' +
    '```\n\n'
  );

  // 正常 JSON 事件穿插
  yield { type: 'thinking', data: { stage: 'done', message: '数据流分析完成' } };

  yield* generateTextEvents(
    '以上模拟了 JSON 解析容错流程：\n\n' +
    '- 有效的 JSON 事件 → 正常解析为对应内容块\n' +
    '- 无效的 JSON → 降级为纯文本显示\n\n' +
    '> 💡 前端 catch 分支：`contentBlocks.push({ type: "text", text: payload })`'
  );

  yield { type: 'done', data: null };
}
