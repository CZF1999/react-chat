import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '@/types/chat';
import { ChatMessageItem } from './ChatMessageItem';
import { ScrollToBottomButton } from './ScrollToBottomButton';

interface ChatContainerProps {
  messages: ChatMessage[];
  triggerScrollToBottom?: number;
  onScrollAtBottomStateChange?: (atBottom: boolean) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  triggerScrollToBottom,
  onScrollAtBottomStateChange,
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const showScrollToBottom = !atBottom;

  // 通知外部 atBottom 状态
  useEffect(() => {
    onScrollAtBottomStateChange?.(atBottom);
  }, [atBottom, onScrollAtBottomStateChange]);

  // 当 triggerScrollToBottom 变化时，强制滚动到底部
  useEffect(() => {
    if (triggerScrollToBottom !== undefined) {
      setAtBottom(true);
      virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' });
    }
  }, [triggerScrollToBottom]);

  const handleAtBottomStateChange = useCallback((bottom: boolean) => {
    setAtBottom(bottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' });
  }, []);

  return (
    <div className="h-full relative">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        followOutput={atBottom ? 'smooth' : false}
        atBottomStateChange={handleAtBottomStateChange}
        itemContent={(_index, message) => (
          <ChatMessageItem key={message.id} message={message} />
        )}
        increaseViewportBy={{ top: 400, bottom: 400 }}
        style={{ height: '100%' }}
      />
      {showScrollToBottom && (
        <ScrollToBottomButton onClick={scrollToBottom} />
      )}
    </div>
  );
};
