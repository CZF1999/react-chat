import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTablePage } from './useTablePage';

describe('useTablePage', () => {
  it('应该具有正确的初始状态', () => {
    const mockFetchApi = vi.fn();
    const { result } = renderHook(() => useTablePage({ fetchApi: mockFetchApi }));

    expect(result.current.loading).toBe(false);
    expect(result.current.dataSource).toEqual([]);
    expect(result.current.pagination).toEqual({
      current: 1,
      pageSize: 50,
      total: 0,
    });
  });

  it('fetchData 应该正确请求数据并更新状态，且页码重置为 1', async () => {
    const mockData = { list: [{ id: 1 }, { id: 2 }], total: 2 };
    const mockFetchApi = vi.fn().mockResolvedValue(mockData);
    
    // 注意：这里需要传入泛型以匹配 TS 类型
    const { result } = renderHook(() => 
      useTablePage<{ id: number }, { keyword?: string }>({ fetchApi: mockFetchApi })
    );

    // 触发请求，必须使用 await act 包裹异步操作
    await act(async () => {
      await result.current.fetchData({ keyword: 'test' });
    });

    // 验证 fetchApi 被调用，且参数正确 (pageNum 被强制重置为 1)
    expect(mockFetchApi).toHaveBeenCalledWith({
      keyword: 'test',
      pageNum: 1,
      pageSize: 50,
    });

    // 验证状态更新
    expect(result.current.loading).toBe(false);
    expect(result.current.dataSource).toEqual(mockData.list);
    expect(result.current.pagination.total).toBe(2);
    expect(result.current.pagination.current).toBe(1);
  });

  it('handleTableChange 翻页时，应该使用 ref 缓存的搜索参数', async () => {
    const mockData = { list: [{ id: 3 }], total: 100 };
    const mockFetchApi = vi.fn().mockResolvedValue(mockData);
    
    const { result } = renderHook(() => 
      useTablePage<{ id: number }, { keyword?: string }>({ fetchApi: mockFetchApi })
    );

    // 1. 先执行搜索，缓存搜索参数
    await act(async () => {
      await result.current.fetchData({ keyword: 'cached_keyword' });
    });

    mockFetchApi.mockClear(); // 清除之前的调用记录，方便后续断言

    // 2. 模拟用户点击翻页
    await act(async () => {
      await result.current.handleTableChange({ current: 2, pageSize: 50 });
    });

    // 3. 验证 fetchApi 被调用，且包含了缓存的搜索参数和新的页码
    expect(mockFetchApi).toHaveBeenCalledTimes(1);
    expect(mockFetchApi).toHaveBeenCalledWith({
      keyword: 'cached_keyword', // 核心断言：搜索条件没有丢失
      pageNum: 2,
      pageSize: 50,
    });
  });

  it('resetPagination 应该将 current 重置为 1', async () => {
    const mockFetchApi = vi.fn().mockResolvedValue({ list: [], total: 0 });
    const { result } = renderHook(() => useTablePage({ fetchApi: mockFetchApi }));

    // 模拟翻页到第 2 页
    await act(async () => {
      await result.current.handleTableChange({ current: 2, pageSize: 50 });
    });
    
    expect(result.current.pagination.current).toBe(2);

    // 执行重置
    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.pagination.current).toBe(1);
  });
});