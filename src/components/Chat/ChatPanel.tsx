import React, { useState, useCallback, useRef, useEffect } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useShallow } from "zustand/react/shallow";
import { useChatStore } from "@/store/useChatStore";
import { ChatMessageItem } from "@/components/Chat/ChatMessageItem";
import { ScrollToBottomButton } from "@/components/Chat/ScrollToBottomButton";
import type { ChatMessage } from "@/types/chat";

/** 教育向快捷意图：对齐 JD「推荐 / 生成类交互」 */
const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  {
    label: "演示流程图",
    prompt: "请用 mermaid 画出 ChatPanel 到 useChatStore 的架构图",
  },
  {
    label: "讲解这道错题",
    prompt:
      "我有一道题做错了，请先帮我定位可能的知识漏洞，再分步骤讲解思路（先不要直接给出完整最终答案，引导我思考）。题目是：",
  },
  {
    label: "推荐 3 道同类练习",
    prompt:
      "请根据初中常见考点，推荐 3 道同类练习题（由易到难），每题给出考查点和简要解答提示，不要只堆题目。主题：",
  },
  {
    label: "改成学生能懂的讲解",
    prompt:
      "请把下面这段内容改写成初中生也能听懂的讲解：用生活化例子、分步骤，并在最后给出 1 个小练习巩固。原文：",
  },
];

const ChatPanel: React.FC = () => {
  const { activeSessionId, session } = useChatStore(
    useShallow((s) => ({
      activeSessionId: s.activeSessionId,
      session: s.sessions.find((sess) => sess.id === s.activeSessionId),
    })),
  );
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const pauseStreaming = useChatStore((s) => s.pauseStreaming);
  const resumeStreaming = useChatStore((s) => s.resumeStreaming);
  const setDraftInput = useChatStore((s) => s.setDraftInput);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages);

  const [atBottom, setAtBottom] = useState(true);
  const [firstItemIndex, setFirstItemIndex] = useState(0);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const messages = session?.messages ?? [];
  const isStreaming = session?.isStreaming ?? false;
  const inputValue = session?.draftInput ?? "";

  // 切换会话时滚动到底部
  useEffect(() => {
    if (activeSessionId) {
      setFirstItemIndex(0);
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: "LAST",
          behavior: "smooth",
        });
      }, 50);
    }
  }, [activeSessionId]);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: "LAST",
      behavior: "smooth",
    });
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!activeSessionId) return;
    const addedCount = await loadMoreMessages(activeSessionId);
    if (addedCount > 0) {
      setFirstItemIndex((prev) => prev - addedCount);
    }
  }, [activeSessionId, loadMoreMessages]);

  const handleSend = useCallback(() => {
    if (!activeSessionId || !inputValue.trim() || isStreaming) return;
    sendMessage(activeSessionId, inputValue);
    setDraftInput(activeSessionId, "");
  }, [activeSessionId, inputValue, isStreaming, sendMessage, setDraftInput]);

  /** 快捷入口：填入预设 Prompt，方便学生/老师改完再发或直接发送 */
  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (!activeSessionId || isStreaming) return;
      setDraftInput(activeSessionId, prompt);
    },
    [activeSessionId, isStreaming, setDraftInput],
  );

  const handleStop = useCallback(() => {
    if (activeSessionId) {
      stopStreaming(activeSessionId);
    }
  }, [activeSessionId, stopStreaming]);

  const handlePause = useCallback(() => {
    if (activeSessionId) {
      pauseStreaming(activeSessionId);
    }
  }, [activeSessionId, pauseStreaming]);

  const handleResume = useCallback(() => {
    if (activeSessionId) {
      resumeStreaming(activeSessionId);
    }
  }, [activeSessionId, resumeStreaming]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSend();
    },
    [handleSend],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (activeSessionId) {
        setDraftInput(activeSessionId, e.target.value);
      }
    },
    [activeSessionId, setDraftInput],
  );

  // 无活跃会话
  if (!activeSessionId) {
    return (
      <div className="sbsjjc-chat__main">
        <div className="sbsjjc-chat__empty">
          <p>👋 选择一个会话或创建新会话开始对话</p>
          <p className="sbsjjc-chat__empty-hint">
            支持 Markdown · 代码高亮 · LaTeX · 表格 · 图表 · 流程图
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sbsjjc-chat__main">
      {/* 顶部标题栏 */}
      <div className="sbsjjc-chat__header">
        <h2>{session?.title || "AI 对话"}</h2>
        <span style={{ fontSize: 11, color: "#999" }}>
          {messages.length} 条消息
          {session?.isPaused
            ? " · 已暂停"
            : session?.isReconnecting
              ? " · 重连中..."
              : isStreaming && " · 接收中..."}
        </span>
      </div>

      {/* 消息列表 */}
      <div className="sbsjjc-chat__body" style={{ position: "relative" }}>
        {isLoadingMessages ? (
          <div className="sbsjjc-chat__empty">
            <p>⏳ 加载历史消息中...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="sbsjjc-chat__empty">
            <p>👋 发送一条消息开始对话</p>
            <p className="sbsjjc-chat__empty-hint">
              支持 Markdown · 代码高亮 · LaTeX · 表格 · 图表 · 流程图
            </p>
            <div className="sbsjjc-chat__quick-actions">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="sbsjjc-chat__quick-btn"
                  disabled={isStreaming}
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <p className="sbsjjc-chat__empty-hint" style={{ marginTop: 12 }}>
              演示结构化流：发送 <b>"分析销售数据"</b>
            </p>
          </div>
        ) : (
          <Virtuoso
            key={activeSessionId}
            ref={virtuosoRef}
            data={messages}
            firstItemIndex={firstItemIndex}
            followOutput={atBottom ? "smooth" : false}
            atBottomStateChange={setAtBottom}
            computeItemKey={(_index, msg: ChatMessage) => msg.id}
            itemContent={(index, msg) => (
              <ChatMessageItem
                message={msg}
                isLast={index === messages.length - 1}
                isPaused={session?.isPaused}
                onResume={handleResume}
              />
            )}
            increaseViewportBy={{ top: 400, bottom: 400 }}
            style={{ height: "100%" }}
            components={{
              Header: () =>
                session?.hasMoreOlder ? (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <button
                      className="sbsjjc-chat__load-older-btn"
                      onClick={handleLoadMore}
                      disabled={session?.isLoadingOlder}
                      style={{
                        background: "none",
                        border: "1px solid #d9d9d9",
                        borderRadius: 6,
                        padding: "4px 16px",
                        cursor: session?.isLoadingOlder ? "not-allowed" : "pointer",
                        opacity: session?.isLoadingOlder ? 0.5 : 1,
                      }}
                    >
                      {session?.isLoadingOlder ? "加载中..." : "加载更早的消息"}
                    </button>
                  </div>
                ) : null,
            }}
          />
        )}
        {!atBottom && messages.length > 0 && !isLoadingMessages && (
          <ScrollToBottomButton onClick={scrollToBottom} />
        )}
      </div>

      {/* 底部输入区域 */}
      <form className="sbsjjc-chat__footer" onSubmit={handleSubmit}>
        <div className="sbsjjc-chat__input-wrapper">
          <input
            type="text"
            className="sbsjjc-chat__input"
            placeholder="输入消息... 试试分析销售数据 (Enter 发送)"
            disabled={isStreaming || !!session?.isPaused}
            autoComplete="off"
            value={inputValue}
            onChange={handleInputChange}
          />
          {session?.isPaused ? (
            <button
              type="button"
              className="sbsjjc-chat__stop-btn"
              onClick={handleStop}
            >
              停止
            </button>
          ) : isStreaming ? (
            <>
              <button
                type="button"
                className="sbsjjc-chat__send-btn"
                onClick={handlePause}
              >
                暂停
              </button>
              <button
                type="button"
                className="sbsjjc-chat__stop-btn"
                onClick={handleStop}
              >
                停止
              </button>
            </>
          ) : (
            <button
              type="submit"
              className="sbsjjc-chat__send-btn"
            >
              发送
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
