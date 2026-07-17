import React from "react";
import type { ChatMessage, MessageContent, TextContent, TableContent, ChartContent } from "@/types/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ThinkingProcess } from "./ThinkingProcess";
import { DataTableRenderer } from "./DataTableRenderer";
import { DataChartRenderer } from "./DataChartRenderer";

interface ChatMessageItemProps {
  message: ChatMessage;
  /** 该消息是否为最后一条（用于显示继续按钮） */
  isLast?: boolean;
  /** 会话是否被暂停 */
  isPaused?: boolean;
  /** 点击继续的回调 */
  onResume?: () => void;
}

/**
 * 渲染单个内容块
 */
const ContentBlockRenderer: React.FC<{ block: MessageContent; isLoading?: boolean }> = ({
  block,
  isLoading,
}) => {
  switch (block.type) {
    case "text":
      return (
        <MarkdownRenderer
          content={(block as TextContent).text}
          isStreaming={isLoading}
        />
      );

    case "table":
      return (
        <DataTableRenderer
          data={block as TableContent}
          isLoading={isLoading}
        />
      );

    case "chart":
      return (
        <DataChartRenderer
          data={block as ChartContent}
          isLoading={isLoading}
        />
      );

    default:
      return null;
  }
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({ message, isLast, isPaused, onResume }) => {
    const isUser = message.role === "user";
    const hasContentBlocks =
      message.contentBlocks && message.contentBlocks.length > 0;
    const hasThinking =
      message.thinkingStages && message.thinkingStages.length > 0;

    return (
      <div
        className={`flex w-full my-2 ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[85%] px-4 py-2 rounded-lg ${isUser
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
            }`}
        >
          {/* 用户消息：纯文本 */}
          {isUser && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}

          {/* AI 消息：结构化内容 */}
          {!isUser && (
            <>
              {/* 思考过程 */}
              {hasThinking && (
                <ThinkingProcess
                  stages={message.thinkingStages!}
                  isStreaming={message.isStreaming}
                />
              )}

              {/* 结构化内容块 */}
              {hasContentBlocks ? (
                <div className="chat-content-blocks">
                  {message.contentBlocks!.map((block, index) => (
                    <ContentBlockRenderer
                      key={`${block.type}_${index}`}
                      block={block}
                      isLoading={message.isStreaming}
                    />
                  ))}
                </div>
              ) : (
                /* 兼容旧版纯文本 */
                <MarkdownRenderer
                  content={message.content}
                  isStreaming={message.isStreaming}
                />
              )}

              {/* 暂停时显示继续按钮 */}
              {isLast && isPaused && (
                <div className="mt-2 text-center">
                  <button
                    onClick={onResume}
                    className="px-4 py-1 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                  >
                    ▶ 继续生成
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    // 新增 props 变了就要重渲染
    if (prev.isLast !== next.isLast) return false;
    if (prev.isPaused !== next.isPaused) return false;

    // 自定义比较：深度比较 thinkingStages 和 contentBlocks
    const prevMsg = prev.message;
    const nextMsg = next.message;

    if (prevMsg.content !== nextMsg.content) return false;
    if (prevMsg.isStreaming !== nextMsg.isStreaming) return false;
    if (prevMsg.thinkingStages?.length !== nextMsg.thinkingStages?.length)
      return false;
    if (prevMsg.contentBlocks?.length !== nextMsg.contentBlocks?.length)
      return false;

    // 深度检查 contentBlocks 内部数据变化（chunked streaming 必需）
    // 当 data_chunk 追加行/系列时，block 数量不变但内部数据变了
    const prevBlocks = prevMsg.contentBlocks;
    const nextBlocks = nextMsg.contentBlocks;
    if (prevBlocks && nextBlocks) {
      for (let i = 0; i < prevBlocks.length; i++) {
        const pb = prevBlocks[i];
        const nb = nextBlocks[i];
        if (pb.type !== nb.type) return false;
        if (pb.type === "table") {
          const pt = pb as TableContent;
          const nt = nb as TableContent;
          if (pt.data?.length !== nt.data?.length) return false;
        }
        if (pb.type === "chart") {
          const pc = pb as ChartContent;
          const nc = nb as ChartContent;
          const psLen = (pc.config?.series as any[])?.length ?? 0;
          const nsLen = (nc.config?.series as any[])?.length ?? 0;
          if (psLen !== nsLen) return false;
        }
      }
    }

    return true;  // 所有检查通过，跳过渲染
  },
);
