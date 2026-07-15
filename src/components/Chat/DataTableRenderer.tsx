import React, { useState, useEffect } from 'react';
import { Table, Skeleton } from 'antd';
import type { TableContent } from '@/types/chat';

interface DataTableRendererProps {
  data: TableContent;
  /** 是否处于加载中（骨架屏）状态 */
  isLoading?: boolean;
  /** 加载完成后触发 */
  onReady?: () => void;
}

export const DataTableRenderer: React.FC<DataTableRendererProps> = ({
  data,
  isLoading = false,
  onReady,
}) => {
  const [phase, setPhase] = useState<'skeleton' | 'expanding' | 'ready'>(
    isLoading ? 'skeleton' : 'ready'
  );

  useEffect(() => {
    if (!isLoading && phase === 'skeleton') {
      // 从骨架屏过渡到表格
      const t1 = setTimeout(() => setPhase('expanding'), 100);
      const t2 = setTimeout(() => {
        setPhase('ready');
        onReady?.();
      }, 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isLoading, phase, onReady]);

  // 处理数据变化：有新数据进来时触发过渡
  useEffect(() => {
    if (data && phase === 'ready') {
      // 数据已就绪，不需要再过渡
      return;
    }
    if (data && !isLoading && phase === 'skeleton') {
      const t1 = setTimeout(() => setPhase('expanding'), 50);
      const t2 = setTimeout(() => {
        setPhase('ready');
        onReady?.();
      }, 450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [data, isLoading]);

  const isSkeleton = phase === 'skeleton' || phase === 'expanding';

  const columnCount = data?.columns?.length || 4;
  const rowCount = data?.data?.length || 4;

  return (
    <div className={`data-table-renderer phase-${phase}`}>
      {/* 标题 */}
      {data?.title && (
        <h4 className="data-table-renderer__title">{data.title}</h4>
      )}

      {/* 骨架屏层 */}
      <div className={`data-table-renderer__skeleton ${!isSkeleton ? 'is-hidden' : ''}`}>
        <Skeleton active paragraph={{ rows: rowCount + 1 }} title={false} />
      </div>

      {/* 真实表格层 */}
      <div className={`data-table-renderer__table ${isSkeleton ? 'is-hidden' : ''}`}>
        {data && (
          <Table
            columns={data.columns.map(col => ({
              key: col.key,
              title: col.title,
              dataIndex: col.dataIndex,
              width: col.width,
            }))}
            dataSource={data.data.map((row, i) => ({ ...row, _key: i }))}
            rowKey="_key"
            pagination={data.data.length > 10 ? { pageSize: 10 } : false}
            size="small"
            bordered
          />
        )}
      </div>

      <style>{`
        .data-table-renderer {
          position: relative;
          margin: 12px 0;
          overflow: hidden;
        }
        .data-table-renderer__title {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        .data-table-renderer__skeleton {
          transition: opacity 0.35s ease, transform 0.35s ease;
          opacity: 1;
          transform: translateY(0);
        }
        .data-table-renderer__skeleton.is-hidden {
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          position: absolute;
          width: 100%;
        }
        .data-table-renderer__table {
          transition: opacity 0.5s ease, transform 0.5s ease;
          opacity: 1;
          transform: translateY(0);
        }
        .data-table-renderer__table.is-hidden {
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
        }
        /* expanding 阶段：骨架渐隐，表格渐显 */
        .data-table-renderer.phase-expanding .data-table-renderer__skeleton {
          opacity: 0.5;
        }
        .data-table-renderer.phase-expanding .data-table-renderer__table {
          opacity: 0.6;
        }
        @media (prefers-color-scheme: dark) {
          .data-table-renderer__title {
            color: #e8e8e8;
          }
        }
      `}</style>
    </div>
  );
};
