import React, { useEffect, useId, useRef, useState } from 'react';

interface MermaidBlockProps {
  code: string;
  isStreaming?: boolean;
}

let mermaidInitialized = false;

async function getMermaid() {
  const mermaid = (await import('mermaid')).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'neutral',
      fontFamily: 'inherit',
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

/**
 * 渲染 ```mermaid 围栏：流式期间只展示源码，结束后懒加载 mermaid 画 SVG；失败回退源码。
 */
export const MermaidBlock: React.FC<MermaidBlockProps> = ({
  code,
  isStreaming = false,
}) => {
  const reactId = useId().replace(/:/g, '');
  const renderId = `mermaid-${reactId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (isStreaming) {
      setError(null);
      setRendering(false);
      if (containerRef.current) containerRef.current.innerHTML = '';
      return;
    }

    const source = code.trim();
    if (!source) return;

    let cancelled = false;
    setRendering(true);
    setError(null);

    (async () => {
      try {
        const mermaid = await getMermaid();
        const { svg } = await mermaid.render(renderId, source);
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        if (containerRef.current) containerRef.current.innerHTML = '';
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, isStreaming, renderId]);

  if (isStreaming) {
    return (
      <div className="relative group my-2 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-4 py-1">
          <span>mermaid · 流程图生成中…</span>
        </div>
        <pre className="m-0 overflow-x-auto bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 p-4 text-xs">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative group my-2 rounded-md border border-amber-200 dark:border-amber-800 overflow-hidden">
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs px-4 py-1">
          <span>mermaid · 渲染失败，已回退源码</span>
        </div>
        <pre className="m-0 overflow-x-auto bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 p-4 text-xs">
          <code>{code}</code>
        </pre>
        <p className="m-0 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/80">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="relative group my-2 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-4 py-1">
        <span>mermaid</span>
        {rendering && <span>渲染中…</span>}
      </div>
      <div
        ref={containerRef}
        className="mermaid-svg overflow-x-auto p-4 flex justify-center [&_svg]:max-w-full"
      />
    </div>
  );
};
