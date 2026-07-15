import { useState, useRef, useCallback } from 'react';

interface UseStreamMessageReturn {
  content: string;
  isStreaming: boolean;
  error: string | null;
  startStream: (url: string, body?: any) => Promise<void>;
  stopStream: () => void;
}

/**
 * SSE 流式消息 Hook
 *
 * 向后端发起 POST 请求，接收 text/event-stream 格式的 SSE 响应，
 * 解析 data: 字段并累积为完整文本，通过 content 状态驱动 UI 更新。
 */
export function useStreamMessage(): UseStreamMessageReturn {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (url: string, body?: any): Promise<void> => {
      stopStream();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setContent('');
      setError(null);
      setIsStreaming(true);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        if (!response.body) {
          throw new Error('浏览器不支持 ReadableStream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let fullText = '';
        // SSE 行缓冲：拼接不完整的 chunk
        let lineBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          lineBuffer += chunk;

          // 按 \n\n 分割 SSE 事件
          const parts = lineBuffer.split('\n\n');
          // 最后一段可能是不完整的，保留到下一次
          lineBuffer = parts.pop() || '';

          for (const part of parts) {
            // 解析 data: 行
            const lines = part.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // 去掉 "data: " 前缀
                if (data === '[DONE]') {
                  // 流结束标记，由 finally 块处理
                  continue;
                }
                fullText += data;
              }
            }
          }

          // 更新 React 状态，驱动 UI
          setContent(fullText);
        }

        // 处理最后的缓冲区
        if (lineBuffer.trim()) {
          const lines = lineBuffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              fullText += line.slice(6);
            }
          }
          setContent(fullText);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // 用户主动取消
        }
        const message = err instanceof Error ? err.message : String(err);
        console.error('[useStreamMessage] 失败:', message);
        setError(message);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [stopStream],
  );

  return { content, isStreaming, error, startStream, stopStream };
}
