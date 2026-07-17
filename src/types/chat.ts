// ==================== 思考阶段 ====================

export type ThinkingStageType =
  | 'analyzing'    // 分析问题
  | 'searching'    // 检索数据
  | 'processing'   // 处理数据
  | 'generating'   // 生成内容
  | 'done';        // 完成

export interface ThinkingStage {
  type: ThinkingStageType;
  message: string;
  timestamp: number;
}

// ==================== 消息内容块 ====================

/** 文本内容块 */
export interface TextContent {
  type: 'text';
  text: string;
}

/** 表格列定义 */
export interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
}

/** 表格内容块 */
export interface TableContent {
  type: 'table';
  columns: TableColumn[];
  data: Record<string, any>[];
  title?: string;
}

/** 图表内容块 */
export interface ChartContent {
  type: 'chart';
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  title?: string;
  /** ECharts 配置对象 */
  config: Record<string, any>;
}

/** 消息内容联合类型 */
export type MessageContent =
  | TextContent
  | TableContent
  | ChartContent;

// ==================== 消息模型 ====================

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  /** 结构化内容块数组（assistant 消息使用） */
  content: string; // 兼容旧版纯文本
  contentBlocks?: MessageContent[]; // 新版结构化内容
  isStreaming?: boolean;
  /** 思考过程阶段列表 */
  thinkingStages?: ThinkingStage[];
  createdAt?: number;
}

// ==================== SSE 事件类型 ====================

export type SSEEventType =
  | 'thinking'
  | 'text'
  | 'table_loading'
  | 'table_data'
  | 'chart_loading'
  | 'chart_data'
  | 'data_chunk'
  | 'done';

export interface SSEThinkingData {
  stage: ThinkingStageType;
  message: string;
}

export interface SSETextData {
  content: string;
}

export interface SSETableLoadingData {
  message: string;
}

export interface SSETableData {
  title?: string;
  columns: TableColumn[];
  data: Record<string, any>[];
}

export interface SSEChartLoadingData {
  message: string;
}

export interface SSEChartData {
  chartType: ChartContent['chartType'];
  title?: string;
  config: Record<string, any>;
}

/** 逐块追加事件（表格逐行 / 图表逐系列） */
export type DataChunkType = 'table' | 'chart';

export interface SSEDataChunkData {
  /** 区分表格还是图表的 chunk */
  chunkType: DataChunkType;
  /** 同一数据块的 chunk 共享一个 blockId，用于乱序匹配 */
  blockId: string;
  /** 0-based chunk 序号 */
  index: number;
  /** 可选：总 chunk 数，用于进度指示 */
  total?: number;
  // ---- 表格字段（首 chunk index===0 携带 columns） ----
  columns?: TableColumn[];
  title?: string;
  rows?: Record<string, any>[];
  // ---- 图表字段（首 chunk index===0 携带 chartType + xAxisData） ----
  chartType?: ChartContent['chartType'];
  /** 首 chunk 可携带完整 ECharts option（含 yAxis/tooltip/legend 等） */
  config?: Record<string, any>;
  series?: Record<string, any>[];
  xAxisData?: string[];
}

export interface SSEEvent {
  type: SSEEventType;
  data: SSEThinkingData | SSETextData | SSETableData | SSEChartData | SSEDataChunkData | null;
}

// ==================== 会话模型 ====================

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  /** 该会话是否正在流式接收中 */
  isStreaming: boolean;
  /** 切换会话时保留的输入框草稿 */
  draftInput?: string;
  /** 服务端是否存在更早的历史消息（分页加载用） */
  hasMoreOlder?: boolean;
  /** 是否正在加载更早的消息 */
  isLoadingOlder?: boolean;
}
