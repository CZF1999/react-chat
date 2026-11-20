import React, { useCallback, useState } from 'react';
import { MermaidBlock } from './MermaidBlock';

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  isStreaming?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  className,
  children,
  isStreaming = false,
}) => {
  const code = String(children).replace(/\n$/, '');
  // rehype-highlight 会加上 hljs，class 形如 "hljs language-mermaid"
  const language = className?.match(/language-([\w-]+)/)?.[1] || '';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(console.error);
  }, [code]);

  if (language === 'mermaid') {
    return <MermaidBlock code={code} isStreaming={isStreaming} />;
  }

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-gray-800 text-gray-200 text-xs px-4 py-1 rounded-t-md">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition-colors"
        >
          {copied ? '已复制' : '复制代码'}
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none overflow-x-auto bg-gray-900 text-gray-100 p-4">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};
