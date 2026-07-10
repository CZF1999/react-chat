// src/hooks/useCzfTable.ts
import { useState, useRef, useCallback, useMemo } from 'react';
import type { TablePaginationConfig } from 'antd/es/table';

interface useCzfTableOptions<T, S> {
    fetchApi: (params: S) => Promise<{
        list: T[];
        total?: number;
    }>;
    defaultPageSize?: number;
}

const useCzfTable = <T, S>({
    fetchApi,
    defaultPageSize = 50
}: useCzfTableOptions<T, S>) => {
    const [loading, setLoading] = useState(false);
    const [dataSource, setDataSource] = useState<T[]>([]);
    const [pagination, setPagination] = useState<TablePaginationConfig>({
        current: 1,
        pageSize: defaultPageSize,
        total: 0,
    });
    
    const searchParamsRef = useRef<S>({} as S);

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

    const fetchData = useCallback((params?: S) => {
        if (params) {
            searchParamsRef.current = params;
        }
        request(1, pagination.pageSize!, searchParamsRef.current);
    }, [request, pagination.pageSize]);

    const handleTableChange = useCallback((newPagination: TablePaginationConfig) => {
        const {
            current = pagination.current,
            pageSize = pagination.pageSize
        } = newPagination;
        request(current!, pageSize!, searchParamsRef.current);
    }, [request, pagination.current, pagination.pageSize]);

    // 👇 新增：打包 Table 常用的 props，减少业务代码重复配置
    const tableProps = useMemo(() => ({
        dataSource,
        loading,
        pagination: {
            ...pagination,
            showSizeChanger: true,
            showTotal: (total: number) => `共 ${total} 条`,
        },
        onChange: handleTableChange,
    }), [dataSource, loading, pagination, handleTableChange]);

    return {
        loading,
        dataSource,
        pagination,
        fetchData,
        handleTableChange,
        tableProps, // 👇 暴露给外部组件使用
    };
};

export default useCzfTable