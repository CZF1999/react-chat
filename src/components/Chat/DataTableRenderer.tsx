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
    // chunk 模式：首次渲染就有数据 → 直接 ready
    // 一次性模式（无 loading 骨架屏机制）：直接 ready
    isLoading && (!data?.data || data.data.length === 0) ? 'skeleton' : 'ready'
  );

  useEffect(() => {
    if (!isLoading && phase === 'skeleton') {
      // 一次性模式过渡：骨架屏 → expanding → ready
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
    // chunk 模式：有数据到来且正在加载 → 直接显示表格
    if (isLoading && data?.data && data.data.length > 0 && phase === 'skeleton') {
      setPhase('ready');
    }
  }, [isLoading, phase, onReady, data]);

  // 防御：columns 或 data 可能为空/残缺
  const columns = data?.columns;
  const rows = data?.data;
  const isValid = columns && columns.length > 0 && rows;
  const isSkeleton = phase === 'skeleton' || phase === 'expanding';

  const rowCount = rows?.length || 4;

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
        {isValid ? (
          <Table
            columns={columns.map(col => ({
              key: col.key,
              title: col.title,
              dataIndex: col.dataIndex,
              width: col.width,
            }))}
            dataSource={rows.map((row, i) => ({ ...row, _key: i }))}
            rowKey="_key"
            pagination={rows.length > 10 ? { pageSize: 10 } : false}
            size="small"
            bordered
          />
        ) : (
          <div className="data-table-renderer__error">
            ⚠️ 表格数据不完整
            {!columns && <p>缺少列定义 (columns)</p>}
            {!rows && <p>缺少行数据 (data)</p>}
          </div>
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
        /* 逐行追加动画（chunked streaming） */
        .data-table-renderer .ant-table-tbody > tr {
          animation: rowSlideIn 0.35s ease-out both;
        }
        @keyframes rowSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-color-scheme: dark) {
          .data-table-renderer__title {
            color: #e8e8e8;
          }
        }
        .data-table-renderer__error {
          padding: 16px;
          background: #fff2f0;
          border: 1px solid #ffccc7;
          border-radius: 8px;
          color: #ff4d4f;
          font-size: 13px;
        }
        .data-table-renderer__error p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #999;
        }
      `}</style>
    </div>
  );
};
