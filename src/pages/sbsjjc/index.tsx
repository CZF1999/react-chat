import React, { useState, useCallback, useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type {
  ChatMessage,
  MessageContent,
  ThinkingStage,
  TextContent,
  TableContent,
  ChartContent,
} from '@/types/chat';
import { ChatMessageItem } from '../../components/Chat/ChatMessageItem';
import './index.css';

let idCounter = 0;
const generateId = () => `msg_${++idCounter}_${Date.now()}`;

const Sbsjjc: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // ---- 发送消息 & 流式接收 ----
  const handleSend = useCallback(
    async (input: string) => {
      if (!input.trim() || isStreaming) return;

      const assistantId = generateId();

      // Step 1: 添加用户消息 + 空的 AI 占位消息
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: input,
        createdAt: Date.now(),
      };
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        contentBlocks: [],
        thinkingStages: [],
        isStreaming: true,
        createdAt: Date.now(),
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setAtBottom(true);
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' });
      }, 50);

      // Step 2: 发起 SSE 流式请求
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      // 追踪当前流式状态
      const contentBlocks: MessageContent[] = [];
      const thinkingStages: ThinkingStage[] = [];
      let pendingLoadingBlock: { type: 'table' | 'chart'; message: string } | null = null;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('不支持 ReadableStream');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let lineBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          lineBuffer += chunk;

          const events = lineBuffer.split('\n\n');
          lineBuffer = events.pop() || '';

          let hasUpdates = false;

          for (const rawEvent of events) {
            for (const line of rawEvent.split('\n')) {
              if (!line.startsWith('data: ')) continue;

              const payload = line.slice(6);
              if (payload === '[DONE]') continue;

              try {
                const event = JSON.parse(payload) as {
                  type: string;
                  data: any;
                };

                switch (event.type) {
                  case 'thinking': {
                    // 添加思考阶段
                    thinkingStages.push({
                      type: event.data.stage,
                      message: event.data.message,
                      timestamp: Date.now(),
                    });
                    hasUpdates = true;
                    break;
                  }

                  case 'text': {
                    const textContent = event.data.content as string;
                    // 追加到最后一个 text 块或创建新的
                    // 注意：必须新建对象，否则 React.memo 浅比较无法检测变化
                    const lastBlock = contentBlocks[contentBlocks.length - 1];
                    if (lastBlock && lastBlock.type === 'text') {
                      contentBlocks[contentBlocks.length - 1] = {
                        type: 'text',
                        text: (lastBlock as TextContent).text + textContent,
                      };
                    } else {
                      contentBlocks.push({ type: 'text', text: textContent });
                    }
                    hasUpdates = true;
                    break;
                  }

                  case 'table_loading': {
                    // 记录有一个 pending 的表格
                    pendingLoadingBlock = { type: 'table', message: event.data.message };
                    hasUpdates = true;
                    break;
                  }

                  case 'table_data': {
                    // 将 pending 的表格数据填充
                    const tableBlock: TableContent = {
                      type: 'table',
                      columns: event.data.columns,
                      data: event.data.data,
                      title: event.data.title,
                    };
                    contentBlocks.push(tableBlock);
                    pendingLoadingBlock = null;
                    hasUpdates = true;
                    break;
                  }

                  case 'chart_loading': {
                    pendingLoadingBlock = { type: 'chart', message: event.data.message };
                    hasUpdates = true;
                    break;
                  }

                  case 'chart_data': {
                    const chartBlock: ChartContent = {
                      type: 'chart',
                      chartType: event.data.chartType,
                      title: event.data.title,
                      config: event.data.config,
                    };
                    contentBlocks.push(chartBlock);
                    pendingLoadingBlock = null;
                    hasUpdates = true;
                    break;
                  }

                  case 'done': {
                    // 流结束
                    break;
                  }
                }
              } catch {
                // JSON 解析失败，当作纯文本处理（兼容旧版）
                contentBlocks.push({ type: 'text', text: payload });
                hasUpdates = true;
              }
            }
          }

          // 批量更新消息状态
          if (hasUpdates) {
            setMessages(prev => {
              const idx = prev.findIndex(m => m.id === assistantId);
              if (idx === -1) return prev;
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                contentBlocks: [...contentBlocks],
                thinkingStages: [...thinkingStages],
                // 兼容旧版：content 为所有 text 块的拼接
                content: contentBlocks
                  .filter((b): b is TextContent => b.type === 'text')
                  .map(b => b.text)
                  .join(''),
              };
              return updated;
            });
          }
        }

        // 处理缓冲区中的最后一段
        if (lineBuffer.trim()) {
          for (const line of lineBuffer.split('\n')) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              const payload = line.slice(6);
              try {
                const event = JSON.parse(payload);
                if (event.type === 'text') {
                  const lastBlock = contentBlocks[contentBlocks.length - 1];
                  if (lastBlock && lastBlock.type === 'text') {
                    // 新建对象，确保 React.memo 能检测到变化
                    contentBlocks[contentBlocks.length - 1] = {
                      type: 'text',
                      text: (lastBlock as TextContent).text + event.data.content,
                    };
                  } else {
                    contentBlocks.push({ type: 'text', text: event.data.content });
                  }
                }
              } catch {
                contentBlocks.push({ type: 'text', text: payload });
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          const errMsg = err instanceof Error ? err.message : String(err);
          contentBlocks.push({ type: 'text', text: `❌ 请求失败：${errMsg}` });
        }
      } finally {
        // Step 4: 标记流式完成
        setIsStreaming(false);
        abortRef.current = null;
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === assistantId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            contentBlocks: [...contentBlocks],
            thinkingStages: [...thinkingStages],
            content: contentBlocks
              .filter((b): b is TextContent => b.type === 'text')
              .map(b => b.text)
              .join(''),
            isStreaming: false,
          };
          return updated;
        });
      }
    },
    [isStreaming],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const input = inputRef.current?.value || '';
      if (!input.trim()) return;
      handleSend(input);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleSend],
  );

  // ---- 渲染 ----
  return (
    <div className="sbsjjc-chat">
      <div className="sbsjjc-chat__header">
        <h2>AI 对话</h2>
        <span style={{ fontSize: 11, color: '#999' }}>
          {messages.length} 条消息{isStreaming && ' · 接收中...'}
        </span>
      </div>

      <div className="sbsjjc-chat__body">
        {messages.length === 0 ? (
          <div className="sbsjjc-chat__empty">
            <p>👋 发送一条消息开始对话</p>
            <p className="sbsjjc-chat__empty-hint">
              支持 Markdown · 代码高亮 · LaTeX · 表格 · 图表
            </p>
            <p className="sbsjjc-chat__empty-hint" style={{ marginTop: 4 }}>
              试试发送 <b>"分析销售数据"</b> 体验完整演示
            </p>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            followOutput={atBottom ? 'smooth' : false}
            atBottomStateChange={setAtBottom}
            itemKey={(msg) => msg.id}
            itemContent={(_index, msg) => <ChatMessageItem message={msg} />}
            increaseViewportBy={{ top: 400, bottom: 400 }}
            style={{ height: '100%' }}
          />
        )}
      </div>

      <form className="sbsjjc-chat__footer" onSubmit={handleSubmit}>
        <div className="sbsjjc-chat__input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="sbsjjc-chat__input"
            placeholder="输入消息... 试试分析销售数据 (Enter 发送)"
            disabled={isStreaming}
            autoComplete="off"
          />
          <button
            type="submit"
            className="sbsjjc-chat__send-btn"
            disabled={isStreaming}
          >
            发送
          </button>
          {isStreaming && (
            <button type="button" className="sbsjjc-chat__stop-btn" onClick={handleStop}>
              停止
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Sbsjjc;
