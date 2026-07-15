import React, { useState, useCallback, useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '@/types/chat';
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

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: input,
        createdAt: Date.now(),
      };
      const assistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        createdAt: Date.now(),
      };

      // Step 1: 添加用户消息 + 空的 AI 占位消息
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      // 滚动到底部
      setAtBottom(true);
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' });
      }, 50);

      // Step 2: 发起 SSE 流式请求
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      let fullText = '';

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

          // 解析 SSE 事件
          const events = lineBuffer.split('\n\n');
          lineBuffer = events.pop() || '';

          let newText = '';
          for (const event of events) {
            for (const line of event.split('\n')) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data !== '[DONE]') newText += data;
              }
            }
          }

          if (newText) {
            fullText += newText;
            // Step 3: 实时更新 AI 消息内容
            setMessages(prev => {
              const idx = prev.findIndex(m => m.id === assistantId);
              if (idx === -1) return prev;
              const updated = [...prev];
              updated[idx] = { ...updated[idx], content: fullText };
              return updated;
            });
          }
        }

        // 处理缓冲区中的最后一段
        if (lineBuffer.trim()) {
          for (const line of lineBuffer.split('\n')) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              fullText += line.slice(6);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          const errMsg = err instanceof Error ? err.message : String(err);
          fullText = `❌ 请求失败：${errMsg}`;
        }
      } finally {
        // Step 4: 标记流式完成
        setIsStreaming(false);
        abortRef.current = null;
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === assistantId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], content: fullText, isStreaming: false };
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
              支持 Markdown · 代码高亮 · LaTeX · 表格
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
            placeholder="输入消息... (Enter 发送)"
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
