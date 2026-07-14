import { useState, useRef, useCallback } from 'react';

interface UseStreamMessageReturn {
  content: string;
  isStreaming: boolean;
  startStream: (url: string, body?: any) => Promise<void>;
  stopStream: () => void;
}

export function useStreamMessage(): UseStreamMessageReturn {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(async (url: string, body?: any) => {
    // 停止前一个请求
    stopStream();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    setContent('');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setContent(prev => prev + chunk);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream error:', err);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [stopStream]);

  return { content, isStreaming, startStream, stopStream };
}
