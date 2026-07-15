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

export interface SSEEvent {
  type: SSEEventType;
  data: SSEThinkingData | SSETextData | SSETableData | SSEChartData | null;
}
