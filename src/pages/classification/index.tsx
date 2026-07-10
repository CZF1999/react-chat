// src/pages/classification/index.tsx
import React, { useEffect, useState } from "react";
import { Card, Form, Input, Button, Table, Space } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTablePage } from "@/hooks/useTablePage";
import { getAjglListAPI } from "@/api/classification";
import type { GetAjglListParams, AjglListItem } from "@/type/classification";

// 模拟 API
// const fetchListApi = async (params: GetAjglListParams) => {
//   // TODO: 替换为实际 API
//   return {
//     list: [
//       { id: "1", name: "测试1", status: "启用" },
//       { id: "2", name: "测试2", status: "禁用" },
//     ],
//     total: 2,
//   };
// };

const Classification = () => {
  const [form] = Form.useForm();
  const {
    loading,
    dataSource,
    pagination,
    fetchData,
    handleTableChange,
    resetPagination,
  } = useTablePage<AjglListItem, GetAjglListParams>({
    fetchApi: async (params) => {
      const res = await getAjglListAPI(params);
      // 根据 AxiosResponse<ResponseData<AjglListData>> 结构，提取最内层的 data
      return res.data.data;
    },
  });
// 👇 1. 新增 state 用于存储勾选的行 keys
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const columns: ColumnsType<AjglListItem> = [
    {
      title: "序号",
      dataIndex: "index",
      width: 80,
      align: "center",
      render: (_, __, index) => {
        // 计算真实序号：(当前页码 - 1) * 每页条数 + 当前行索引 + 1
        return ((pagination.current! - 1) * pagination.pageSize!) + index + 1;
      },
    },
    { title: "案件编号", dataIndex: "ajbh" },
    { title: "案件名称", dataIndex: "ajmc" },
  ];

  const handleSearch = () => {
    const values = form.getFieldsValue();
    resetPagination();
    fetchData(values);
  };

  const handleReset = () => {
    form.resetFields();
    resetPagination();
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
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

      <Card
        className="table-container"
        title="数据列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            新增
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          // 👇 添加 scroll 属性，限制表格内容区高度，超出部分在表格内部滚动
          scroll={{ y: "calc(100vh - 420px)" }}
          // 👇 3. 添加 rowSelection 开启勾选框
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default Classification;
