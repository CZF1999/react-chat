import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  // 每个测试前启用假定时器
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // 每个测试后恢复真实定时器
  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该立即返回初始值', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('应该在延迟时间到达后更新值', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // 更新传入的 value
    rerender({ value: 'updated', delay: 500 });
    
    // 在 500ms 内，值不应该改变
    expect(result.current).toBe('initial');

    // 快进时间 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 延迟到达后，值应该更新
    expect(result.current).toBe('updated');
  });

  it('应该具备防抖特性：快速连续更新时，只保留最后一次', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // 快速连续触发更新
    rerender({ value: 'update1', delay: 500 });
    act(() => { vi.advanceTimersByTime(200); }); // 过去 200ms
    
    rerender({ value: 'update2', delay: 500 });
    act(() => { vi.advanceTimersByTime(200); }); // 又过去 200ms (总计 400ms)
    
    rerender({ value: 'update3', delay: 500 });
    
    // 此时总时间 400ms，还没到 500ms 的阈值，值依然是初始值
    expect(result.current).toBe('initial');

    // 再快进 500ms，让最后一次更新生效
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 最终值应该是最后一次传入的值
    expect(result.current).toBe('update3');
  });
});