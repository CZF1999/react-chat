import React from "react";
import type { ChatMessage } from "@/types/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({ message }) => {
    const isUser = message.role === "user";
    return (
      <div
        className={`flex w-full my-2 ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[80%] px-4 py-2 rounded-lg ${isUser
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
            }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer
              content={message.content}
              isStreaming={message.isStreaming}
            />
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming,
);
