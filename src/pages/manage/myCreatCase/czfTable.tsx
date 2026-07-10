// src/components/BaseTable/index.tsx
import React from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';

interface BaseTableProps<T> {
  // 核心数据与配置 (来自 useTablePage)
  tableProps: TableProps<T>;
  columns: ColumnsType<T>;
  rowKey: string | ((record: T) => string);

  // 👇 插槽/自定义区域设计
  headerTitle?: React.ReactNode;       // 表格标题 (对应 Card title)
  toolbar?: React.ReactNode;           // 右上角工具栏 (对应 Card extra)
  tableHeader?: React.ReactNode;       // 表格上方区域 (如：批量删除按钮)
  tableFooter?: React.ReactNode;       // 表格下方区域 (如：统计信息)

  // 透传其他 Table 属性 (如 rowSelection, scroll 等)
  [key: string]: unknown;
}

// 使用泛型支持 TS 类型推导
const BaseTable = <T extends object>(props: BaseTableProps<T>) => {
  const {
    tableProps,
    columns,
    rowKey,
    headerTitle = '数据列表',
    toolbar,
    tableHeader,
    tableFooter,
    ...restTableProps
  } = props;
  return (
    <Card
      className="table-container"
      title={headerTitle}
      extra={toolbar}
    >
      {/* 插槽 1：表格上方 */}
      {tableHeader && <div style={{ marginBottom: 16 }}>{tableHeader}</div>}
      
      <Table

        rowKey={rowKey}
        columns={columns}
        {...tableProps}
        {...restTableProps} // 允许外部覆盖 tableProps 中的配置
      />
      
      {/* 插槽 2：表格下方 */}
      {tableFooter && <div style={{ marginTop: 16 }}>{tableFooter}</div>}
    </Card>
  );
};

export default React.memo(BaseTable);