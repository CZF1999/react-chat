import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MermaidBlock } from './MermaidBlock';

const renderMock = vi.fn();

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: (...args: unknown[]) => renderMock(...args),
  },
}));

describe('MermaidBlock', () => {
  beforeEach(() => {
    renderMock.mockReset();
    renderMock.mockResolvedValue({
      svg: '<svg data-testid="mermaid-svg"><text>diagram</text></svg>',
    });
  });

  it('流式中不调用 mermaid.render，展示源码占位', () => {
    render(
      <MermaidBlock
        code={"flowchart TB\n  A-->B"}
        isStreaming
      />,
    );

    expect(screen.getByText(/流程图生成中/)).toBeTruthy();
    expect(screen.getByText(/A-->B/)).toBeTruthy();
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('流式结束后渲染 SVG', async () => {
    render(
      <MermaidBlock code={"flowchart TB\n  UI-->Store"} isStreaming={false} />,
    );

    await waitFor(() => {
      expect(renderMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="mermaid-svg"]')).toBeTruthy();
    });
  });

  it('语法错误时回退源码并展示错误', async () => {
    renderMock.mockRejectedValue(new Error('Parse error on line 1'));

    render(<MermaidBlock code="not a valid diagram {{{" isStreaming={false} />);

    await waitFor(() => {
      expect(screen.getByText(/渲染失败，已回退源码/)).toBeTruthy();
    });
    expect(screen.getByText(/Parse error/)).toBeTruthy();
    expect(screen.getByText(/not a valid diagram/)).toBeTruthy();
  });
});
