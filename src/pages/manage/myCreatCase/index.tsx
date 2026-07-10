// src/pages/manage/myCreatCase/index.tsx
import React, { useEffect, useState } from "react";
import { Card, Form, Input, Button, Space } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import useCzfTable from "./useCzfTable";
import { getCjajListAPI, delCjajAPI } from "@/api/classification";
import type {
  GetCjajListParams,
  CjajListItem,
  DelCjajParams,
} from "@/type/classification";
import JatButton from "@/components/jatButton";
import BaseTable from "./czfTable"; // 👈 引入通用组件

const MycreateCase = () => {
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 👇 使用 Hook 获取数据及 tableProps
  const { tableProps, fetchData } = useCzfTable<
    CjajListItem,
    GetCjajListParams
  >({
    fetchApi: async (params) => {
      const res = await getCjajListAPI(params);
      return res.data.data;
    },
  });

  const columns: ColumnsType<CjajListItem> = [
    {
      title: "序号",
      dataIndex: "index",
      width: 80,
      align: "center",
      render: (_, __, index) => {
        // 注意：这里需要拿到 pagination，可以从 useTablePage 中解构出来，或者通过 tableProps.pagination 获取
        return (
          (tableProps.pagination.current! - 1) *
            tableProps.pagination.pageSize! +
          index +
          1
        );
      },
    },
    {
      title: "操作",
      dataIndex: "operation",
      width: 200,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button type="primary" onClick={() => editTableData(record)}>
            编辑
          </Button>
          <JatButton
            danger
            isDelete={true}
            onClick={() => deleteTableData(record)}
            confirmTitle="确定要删除该数据吗？"
            popconfirmProps={{ placement: "topRight", trigger: "click" }}
          >
            删除
          </JatButton>
        </Space>
      ),
    },
    {
      title: "案件编号",
      dataIndex: "ajbh",
      render: (ajbh) => <span style={{ color: "#1890ff" }}>{ajbh}</span>,
    },
    { title: "案件名称", dataIndex: "ajmc" },
  ];

  const editTableData = (record: CjajListItem) => console.log(record);

  const deleteTableData = async (record: CjajListItem) => {
    const params: DelCjajParams = { ids: record.id, sfscsj: "1" };
    const res = await delCjajAPI(params);
    if (res.data.code === "200") {
      fetchData({} as GetCjajListParams);
    }
  };

  const handleSearch = () => {
    const values = form.getFieldsValue();
    fetchData(values);
  };

  const handleReset = () => {
    form.resetFields();
    fetchData({} as GetCjajListParams);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 👇 定义表格上方的插槽内容 (例如：批量操作)
  const tableHeaderSlot =
    selectedRowKeys.length >= 0 ? (
      <Space>
        <span>
          已选择 <strong>{selectedRowKeys.length}</strong> 项
        </span>
        <Button danger size="small">
          批量删除
        </Button>
        <Button size="small" onClick={() => setSelectedRowKeys([])}>
          取消选择
        </Button>
      </Space>
    ) : null;

  return (
    <div>
      {/* 搜索区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="ajbh" label="案件编号">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item name="ajmc" label="案件名称">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 👇 使用通用 BaseTable 组件，通过 props 注入插槽 */}
      <BaseTable
        tableProps={tableProps}
        columns={columns}
        rowKey="id"
        headerTitle="数据列表"
        // 插槽：右上角工具栏
        toolbar={
          <Button type="primary" icon={<PlusOutlined />}>
            新增
          </Button>
        }
        // 插槽：表格上方区域
        tableHeader={tableHeaderSlot}
        // 透传其他 Table 属性
        scroll={{ y: "calc(100vh - 420px)" }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />
    </div>
  );
};

export default MycreateCase;
