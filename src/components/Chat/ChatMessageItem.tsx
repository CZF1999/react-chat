import React from "react";
import type { ChatMessage, MessageContent, TextContent, TableContent, ChartContent } from "@/types/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ThinkingProcess } from "./ThinkingProcess";
import { DataTableRenderer } from "./DataTableRenderer";
import { DataChartRenderer } from "./DataChartRenderer";

interface ChatMessageItemProps {
  message: ChatMessage;
}

/**
 * 渲染单个内容块
 */
const ContentBlockRenderer: React.FC<{ block: MessageContent }> = React.memo(
  ({ block }) => {
    switch (block.type) {
      case "text":
        return (
          <MarkdownRenderer
            content={(block as TextContent).text}
            isStreaming={false}
          />
        );

      case "table":
        return <DataTableRenderer data={block as TableContent} />;

      case "chart":
        return <DataChartRenderer data={block as ChartContent} />;

      default:
        return null;
    }
  }
);
ContentBlockRenderer.displayName = "ContentBlockRenderer";

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({ message }) => {
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
            </>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    // 自定义比较：深度比较 thinkingStages 和 contentBlocks
    const prevMsg = prev.message;
    const nextMsg = next.message;

    if (prevMsg.content !== nextMsg.content) return false;
    if (prevMsg.isStreaming !== nextMsg.isStreaming) return false;
    if (prevMsg.thinkingStages?.length !== nextMsg.thinkingStages?.length) return false;
    if (prevMsg.contentBlocks?.length !== nextMsg.contentBlocks?.length) return false;

    return true;
  },
);
