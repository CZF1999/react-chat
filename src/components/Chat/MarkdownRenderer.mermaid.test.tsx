import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';

const renderMock = vi.fn();

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: (...args: unknown[]) => renderMock(...args),
  },
}));

describe('MarkdownRenderer mermaid 围栏', () => {
  beforeEach(() => {
    renderMock.mockReset();
    renderMock.mockResolvedValue({
      svg: '<svg data-testid="md-mermaid"><text>ok</text></svg>',
    });
  });

  it('识别 ```mermaid 并在非流式时渲染图', async () => {
    const content = [
      '架构如下：',
      '',
      '```mermaid',
      'flowchart TB',
      '  A[ChatPanel] --> B[useChatStore]',
      '```',
    ].join('\n');

    render(<MarkdownRenderer content={content} isStreaming={false} />);

    await waitFor(() => {
      expect(renderMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="md-mermaid"]')).toBeTruthy();
    });
  });

  it('流式时 mermaid 围栏不触发 render', () => {
    const content = ['```mermaid', 'flowchart TB', '  A-->B', '```'].join('\n');

    render(<MarkdownRenderer content={content} isStreaming />);

    expect(screen.getByText(/流程图生成中/)).toBeTruthy();
    expect(renderMock).not.toHaveBeenCalled();
  });
});
