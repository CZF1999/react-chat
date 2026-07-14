import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAsyncRouterStore from './useAsyncRouterStore';

// 模拟 API 模块
vi.mock('@/api/layout', () => ({
  getAsyncRouterAPI: vi.fn(),
}));

import { getAsyncRouterAPI } from '@/api/layout';

describe('useAsyncRouterStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useAsyncRouterStore.setState({ asyncRouter: [] });
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('asyncRouter 应该为空数组', () => {
      const { asyncRouter } = useAsyncRouterStore.getState();
      expect(asyncRouter).toEqual([]);
    });
  });

  describe('setAsyncRouter', () => {
    it('应该使用传入的路由数据更新 asyncRouter', () => {
      const newRouter = [
        { id: '1', pid: '0', map: { yymc: '首页', ydzm: '/home' } },
      ] as any;

      useAsyncRouterStore.getState().setAsyncRouter(newRouter);
      expect(useAsyncRouterStore.getState().asyncRouter).toEqual(newRouter);
    });

    it('传入空数组时应该清空 asyncRouter', () => {
      useAsyncRouterStore.setState({ asyncRouter: [{ id: '1' }] as any });
      expect(useAsyncRouterStore.getState().asyncRouter).toHaveLength(1);

      useAsyncRouterStore.getState().setAsyncRouter([]);
      expect(useAsyncRouterStore.getState().asyncRouter).toEqual([]);
    });
  });

  describe('getAsyncRouter（异步获取路由）', () => {
    it('应该调用 getAsyncRouterAPI 并传入正确参数', async () => {
      const mockApi = vi.mocked(getAsyncRouterAPI);
      mockApi.mockResolvedValue({
        code: '0',
        data: {
          data: JSON.stringify({
            menu: JSON.stringify([
              { id: '1', map: { yymc: '首页', ydzm: '/home' } },
            ]),
          }),
        },
        message: 'ok',
      } as any);

      await useAsyncRouterStore.getState().getAsyncRouter({ yydm: 'app001' });

      expect(mockApi).toHaveBeenCalledTimes(1);
      expect(mockApi).toHaveBeenCalledWith({ yydm: 'app001' });
    });

    it('应该解析 API 返回的双层 JSON 并更新 asyncRouter', async () => {
      const menuData = [
        { id: '1', pid: '0', map: { yymc: '首页', ydzm: '/home' } },
        { id: '2', pid: '1', map: { yymc: '子页面', ydzm: '/home/sub' } },
      ];

      const mockApi = vi.mocked(getAsyncRouterAPI);
      mockApi.mockResolvedValue({
        code: '0',
        data: {
          data: JSON.stringify({
            menu: JSON.stringify(menuData),
          }),
        },
        message: 'ok',
      } as any);

      await useAsyncRouterStore.getState().getAsyncRouter({ yydm: 'app001' });

      expect(useAsyncRouterStore.getState().asyncRouter).toEqual(menuData);
    });

    it('API 调用失败时不应该更新 asyncRouter', async () => {
      // 先设置 asyncRouter 为已知值
      useAsyncRouterStore.setState({ asyncRouter: [{ id: 'existing' }] as any });

      const mockApi = vi.mocked(getAsyncRouterAPI);
      mockApi.mockRejectedValue(new Error('网络错误'));

      // getAsyncRouter 内部没有 try/catch，异常会直接抛出
      await expect(
        useAsyncRouterStore.getState().getAsyncRouter({ yydm: 'app001' })
      ).rejects.toThrow('网络错误');

      // asyncRouter 保持原值不变
      expect(useAsyncRouterStore.getState().asyncRouter).toEqual([{ id: 'existing' }] as any);
    });
  });
});
