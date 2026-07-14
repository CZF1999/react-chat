import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatContainer } from '../../components/Chat/ChatContainer';
import { useStreamMessage } from '../../hooks/useStreamMessage';
import type { ChatMessage } from '@/types/chat';
import './index.css';

let idCounter = 0;
const generateId = () => `msg_${++idCounter}_${Date.now()}`;

const Sbsjjc: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { content, isStreaming, startStream, stopStream } = useStreamMessage();
  const [triggerScrollToBottom, setTriggerScrollToBottom] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ChatContainer 通知的 atBottom 状态
  const [userAtBottom, setUserAtBottom] = useState(true);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    setUserAtBottom(atBottom);
  }, []);

  // 发送消息
  const handleSend = useCallback(async (input: string) => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input,
      createdAt: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setTriggerScrollToBottom(prev => prev + 1);

    // 发起流式请求 - 替换为你的后端API地址
    await startStream('/api/chat', { message: input });
  }, [isStreaming, startStream]);

  // 流式内容更新到最后一条 assistant 消息
  useEffect(() => {
    if (!isStreaming || !content) return;

    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
        updated[lastIdx] = { ...updated[lastIdx], content };
      }
      return updated;
    });
  }, [content, isStreaming]);

  // 流结束，标记最后一条 assistant 的 isStreaming 为 false
  useEffect(() => {
    if (isStreaming) return;

    setMessages(prev => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === 'assistant' && updated[lastIdx].isStreaming) {
        updated[lastIdx] = { ...updated[lastIdx], isStreaming: false };
      }
      return updated;
    });
  }, [isStreaming]);

  // 表单提交
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current?.value || '';
    if (input.trim()) {
      handleSend(input);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [handleSend]);

  return (
    <div className="sbsjjc-chat">
      <div className="sbsjjc-chat__header">
        <h2>AI 对话</h2>
      </div>
      <div className="sbsjjc-chat__body">
        <ChatContainer
          messages={messages}
          triggerScrollToBottom={triggerScrollToBottom}
          onScrollAtBottomStateChange={handleAtBottomStateChange}
        />
      </div>
      <form className="sbsjjc-chat__footer" onSubmit={handleSubmit}>
        <div className="sbsjjc-chat__input-wrapper">
          <input
            ref={inputRef}
            type="text"
            name="message"
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
            <button
              type="button"
              className="sbsjjc-chat__stop-btn"
              onClick={stopStream}
            >
              停止
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Sbsjjc;
