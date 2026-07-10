import { useState, useRef, useCallback } from 'react';
import type { TablePaginationConfig } from 'antd/es/table';

interface UseTablePageOptions<T, S> {
    fetchApi: (params: S) => Promise<{
        list: T[];
        total?: number;
    }>;
    defaultPageSize?: number;
}

export const useTablePage = <T, S>({
    fetchApi
}: UseTablePageOptions<T, S>) => {
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<T[]>([]);
    const [pagination, setPagination] = useState<TablePaginationConfig>({
        current: 1,
        pageSize: 50,
        total: 0,
    });
    // 👇 使用 ref 缓存搜索条件，避免翻页时丢失，同时避免闭包陷阱
    const searchParamsRef = useRef<S>({} as S);

    // 👇 核心请求方法：直接接收分页参数，不依赖异步的 state
    const request = useCallback(async (pageNum: number, pageSize: number, params: S) => {
        setLoading(true);
        try {
            const res = await fetchApi({
                ...params,
                pageNum,
                pageSize,
            });
            setDataSource(res.list);
            setPagination(prev => ({
                ...prev,
                current: pageNum,
                pageSize,
                total: res.total || 0
            }));
        } catch (error) {
            console.error('获取数据失败:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchApi]);
    // 搜索/初始化时调用（默认重置到第一页）
    const fetchData = useCallback((params?: S) => {
        if (params) {
            searchParamsRef.current = params;
        }
        request(1, pagination.pageSize!, searchParamsRef.current);
    }, [request, pagination.pageSize]);
    // 👇 修复：fallback 使用当前 state 中已选中的 pagination.current 和 pagination.pageSize
    const handleTableChange = useCallback((newPagination: TablePaginationConfig) => {
        const {
            current = pagination.current,
            pageSize = pagination.pageSize
        } = newPagination;
        request(current!, pageSize!, searchParamsRef.current);
    }, [request, pagination.current, pagination.pageSize]);

    const resetPagination = useCallback(() => {
        setPagination(prev => ({ ...prev, current: 1 }));
    }, []);

    return {
        loading,
        dataSource,
        pagination,
        fetchData,
        handleTableChange,
        resetPagination,
    };
};