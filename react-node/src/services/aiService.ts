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

export type SSEEvent =
  | SSEThinkingEvent
  | SSETextEvent
  | SSETableLoadingEvent
  | SSETableDataEvent
  | SSEChartLoadingEvent
  | SSEChartDataEvent
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
  // 阶段1: 分析问题
  yield { type: 'thinking', data: { stage: 'analyzing', message: '正在理解您的问题...' } };
  yield* generateTextEvents('好的，我来为您分析相关数据。');
  yield { type: 'thinking', data: { stage: 'done', message: '问题分析完成' } };

  // 阶段2: 检索数据
  yield { type: 'thinking', data: { stage: 'searching', message: '正在检索销售数据...' } };
  yield* generateTextEvents('\n\n首先，让我们看看各季度的销售情况：\n\n');
  yield { type: 'thinking', data: { stage: 'done', message: '数据检索完成' } };

  // 阶段3: 处理表格数据
  yield { type: 'thinking', data: { stage: 'processing', message: '正在整理表格数据...' } };
  yield { type: 'table_loading', data: { message: '正在生成销售数据表格...' } };
  yield { type: 'thinking', data: { stage: 'done', message: '表格数据整理完成' } };
  yield { type: 'table_data', data: mockSalesTable };

  // 阶段4: 生成图表
  yield* generateTextEvents('\n\n从数据趋势来看，营收和利润都在稳步增长。让我用图表更直观地展示：\n\n');
  yield { type: 'thinking', data: { stage: 'generating', message: '正在生成可视化图表...' } };
  yield { type: 'chart_loading', data: { message: '正在生成营收对比图表...' } };
  yield { type: 'thinking', data: { stage: 'done', message: '图表生成完成' } };
  yield { type: 'chart_data', data: { chartType: 'bar', title: '季度营收与利润对比', config: createBarChartConfig() } };

  yield* generateTextEvents('\n\n另外，还可以从用户增长的角度来看：\n\n');
  yield { type: 'chart_loading', data: { message: '正在生成用户增长趋势图...' } };
  yield { type: 'chart_data', data: { chartType: 'line', title: '用户增长趋势', config: createLineChartConfig() } };

  yield* generateTextEvents('\n\n以及用户来源的分布情况：\n\n');
  yield { type: 'chart_loading', data: { message: '正在生成用户来源分布图...' } };
  yield { type: 'chart_data', data: { chartType: 'pie', title: '用户来源分布', config: createPieChartConfig() } };

  yield* generateTextEvents('\n\n**总结**：从数据可以看出，公司业绩呈现良好的增长态势，Q4利润突破1000万元，同比增长31.2%。用户增长方面，月活用户已突破12万，留存率持续提升至78.4%。');
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

您可以尝试问我：
- **"分析销售数据"** — 查看表格和图表演示
- **"对比数据"** — 查看多维度数据分析
- 任何其他问题我也会尽力回答！`;
  } else if (/帮助|help/.test(lower)) {
    reply = `我是 AI 数据分析助手，支持以下功能：

1. **文本对话** — 流式输出，打字机效果
2. **思考过程** — 展示 AI 的分析步骤
3. **表格展示** — 从骨架屏平滑过渡到数据表格
4. **图表可视化** — 柱状图、折线图、饼图等

试试发送 **"分析销售数据"** 来看看完整演示！`;
  } else {
    reply = `收到您的问题："${message}"

我目前是演示模式，建议您尝试发送以下关键词来体验完整功能：

- **"分析销售数据"** 或 **"表格"** — 查看完整的数据分析演示（包含表格和图表）
- **"对比"** — 查看用户数据对比
- **"图表"** — 查看可视化图表

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
 * 根据用户消息匹配合适的流式响应
 * @returns SSE 事件生成器
 */
export function generateStream(message: string): SSEEvent[] {
  const lower = message.toLowerCase();

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
