import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { sanitizeStreamingMarkdown } from '@/utils/sanitizeStreamingMarkdown';
import { MarkdownErrorBoundary } from './ErrorBoundary';
import { CodeBlock } from './CodeBlock';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isStreaming }) => {
    const sanitizedContent = useMemo(
      () => sanitizeStreamingMarkdown(content),
      [content]
    );

    return (
      <MarkdownErrorBoundary fallbackText={content}>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[
              rehypeKatex,
              // mermaid 由 MermaidBlock 渲染，避免 highlight 拆成 span 导致源码丢失
              [rehypeHighlight, { plainText: ['mermaid'] }],
            ]}
            components={{
              pre: ({ children }) => <>{children}</>,
              code: (props) => <CodeBlock {...props} isStreaming={isStreaming} />,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              img: ({ src, alt }) => (
                <img src={src} alt={alt} className="max-w-full rounded" loading="lazy" />
              ),
            }}
          >
            {sanitizedContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-5 ml-0.5 bg-blue-500 animate-pulse align-middle" />
          )}
        </div>
      </MarkdownErrorBoundary>
    );
  }
);
