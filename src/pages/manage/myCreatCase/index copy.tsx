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
import { getCjajListAPI, delCjajAPI } from "@/api/classification";
import type {
  GetCjajListParams,
  CjajListItem,
  DelCjajParams,
} from "@/type/classification";
import JatButton from "@/components/jatButton";

const MycreateCase = () => {
  const [form] = Form.useForm();
  const {
    loading,
    dataSource,
    pagination,
    fetchData,
    handleTableChange,
    resetPagination,
  } = useTablePage<CjajListItem, GetCjajListParams>({
    fetchApi: async (params) => {
      const res = await getCjajListAPI(params);
      // 根据 AxiosResponse<ResponseData<AjglListData>> 结构，提取最内层的 data
      return res.data.data;
    },
  });
  // 👇 1. 新增 state 用于存储勾选的行 keys
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const columns: ColumnsType<CjajListItem> = [
    {
      title: "序号",
      dataIndex: "index",
      width: 80,
      align: "center",
      render: (_, __, index) => {
        // 计算真实序号：(当前页码 - 1) * 每页条数 + 当前行索引 + 1
        return (pagination.current! - 1) * pagination.pageSize! + index + 1;
      },
    },
    {
      title: "操作",
      dataIndex: "operation",
      width: 200,
      align: "center",
      render: (row, record) => (
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
      render: (ajbh) => {
        return <span style={{ color: "#1890ff" }}>{ajbh}</span>;
      },
    },
    { title: "案件名称", dataIndex: "ajmc" },
  ];
  const editTableData = (record: CjajListItem) => {
    console.log(record);
  };
  const deleteTableData = async (record: CjajListItem) => {
    const params: DelCjajParams = {
      ids: record.id,
      sfscsj: "1",
    };
    const res = await delCjajAPI(params);
    if (res.data.code === "200") {
      fetchData({} as GetCjajListParams);
    }
  };
  const handleSearch = () => {
    const values = form.getFieldsValue();
    resetPagination();
    fetchData(values);
  };

  const handleReset = () => {
    form.resetFields();
    resetPagination();
    fetchData({} as GetCjajListParams);
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

export default MycreateCase;
