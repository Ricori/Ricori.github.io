import React, { useEffect, useMemo } from "react";
import { debounce } from "lodash";
import { List, useTable, useDrawerForm } from "@refinedev/antd";
import { BaseRecord, HttpError } from "@refinedev/core";
import { Form, Input, Select, Table, Tag, Drawer, Button, Space, Radio, Card, Tooltip, Typography, theme } from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import { IOrder } from "../orders";

interface IProject extends BaseRecord {
  id: string;  // 项目id
  name: string;   // 项目名称
  members: string[];  // 项目人员
  status: "not_started" | "in_progress" | "completed" | "cancelled";  // 项目状态: 未启动、进行中、已完成、已取消
  estimated_budget: number;   // 项目总成本
  cost_correction: number;  // 项目维度成本补正
  notes: string;  // 备注
  // 关联的订单数据
  orders: IOrder[];
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "not_started":
      return { color: "default", text: "🔴 未启动" };
    case "in_progress":
      return { color: "processing", text: "🔵 进行中" };
    case "completed":
      return { color: "success", text: "🟢 已完成" };
    case "cancelled":
      return { color: "default", text: "⚫ 已取消" };
    default:
      return { color: "default", text: status };
  }
};

const calculateProjectStats = (record: IProject) => {
  let totalRevenue = 0; // 总营收 (订单金额)
  let totalFee = 0;     // 总手续费
  let totalCost = 0;    // 总成本
  const orders = record.orders || [];
  orders.filter(i => i.status !== 'refunded').forEach(order => {
    // 1. 累加营收
    totalRevenue += Number(order.amount_total) || 0;
    // 2. 累加手续费
    totalFee += Number(order.fee_amount) || 0;
    // 3. 计算该订单的商品日元总成本
    let orderJpyTotal = 0;
    order.procurements?.forEach(proc => {
      const price = proc.products?.price_jpy || 0;
      const qty = proc.quantity_needed || 0;
      orderJpyTotal += price * qty;
    });
    // 4. 计算该订单的人民币总成本 (日元*汇率 + 补正 + 邮费)
    const exchangeRate = Number(order.exchange_rate) || 0;
    const correction = Number(order.cost_correction) || 0;
    const postage = Number(order.postage_amount) || 0;
    const orderCnyCost = (orderJpyTotal * exchangeRate) + correction + postage;
    totalCost += orderCnyCost;
  });
  // 净收入 (扣除平台手续费)
  const netIncome = totalRevenue - totalFee;
  // 总利润
  const totalProfit = netIncome - totalCost;
  // 利润率
  const profitMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin
  };
};

const ProjectCreateDrawer = ({ drawerProps, formProps, saveButtonProps }: any) => {
  return (
    <Drawer {...drawerProps} title="新建项目" width={500} >
      <Form {...formProps} layout="vertical">
        <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
          <Input placeholder="请输入项目名称" />
        </Form.Item>
        <Form.Item label="项目人员" name="members" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            placeholder="请选择成员"
            options={[
              { label: "Rico", value: "rico" },
              { label: "Dorothy", value: "dorothy" },
            ]}
          />
        </Form.Item>
        <Form.Item label="项目状态" name="status" initialValue="not_started">
          <Radio.Group>
            <Radio value="not_started">未启动</Radio>
            <Radio value="in_progress">进行中</Radio>
            <Radio value="completed">已完成</Radio>
            <Radio value="cancelled">已取消</Radio>
          </Radio.Group>
        </Form.Item>
        {/* <Form.Item label="项目维度成本补正" name="cost_correction">
          <InputNumber style={{ width: "100%" }} formatter={value => `¥ ${value}`} />
        </Form.Item> */}
        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={10} placeholder="如有特殊说明请填写" />
        </Form.Item>
      </Form>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <Button {...saveButtonProps} type="primary" icon={<PlusOutlined />}>立即创建</Button>
      </div>
    </Drawer>
  );
};

const ProjectEditDrawer = ({ drawerProps, formProps, saveButtonProps }: any) => {
  return (
    <Drawer {...drawerProps} title="编辑项目信息" width={500} >
      <Form {...formProps} layout="vertical">
        <Form.Item label="项目ID" name="id" rules={[{ required: true }]}>
          <Input disabled />
        </Form.Item>
        <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="项目人员" name="members" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            options={[
              { label: "Rico", value: "rico" },
              { label: "Dorothy", value: "dorothy" },
            ]}
          />
        </Form.Item>
        <Form.Item label="项目状态" name="status">
          <Radio.Group>
            <Radio value="not_started">未启动</Radio>
            <Radio value="in_progress">进行中</Radio>
            <Radio value="completed">已完成</Radio>
            <Radio value="cancelled">已取消</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={10} />
        </Form.Item>
      </Form>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <Button {...saveButtonProps} type="primary">保存修改</Button>
      </div>
    </Drawer>
  );
};
export const ProjectList = () => {
  const { tableProps, searchFormProps } = useTable<IProject, HttpError, { name: string; status: string[] }>({
    resource: "projects",
    queryOptions: { staleTime: 0 },
    pagination: {
      pageSize: 10,
    },
    // 深度嵌套查询
    // 查项目 -> 查订单 -> 查采购 -> 查商品价格
    meta: {
      select: "*, orders(status, amount_total, fee_amount, cost_correction, postage_amount, exchange_rate, procurements(quantity_needed, products(price_jpy)))",
    },
    sorters: {
      initial: [
        {
          field: "id",
          order: "asc",
        },
      ],
    },
    onSearch: (params) => {
      const filters = [];
      const { name, status } = params;
      filters.push({ field: "name", operator: "contains" as "contains", value: name });
      if (status && status.length > 0) {
        filters.push({
          field: "status",
          operator: "in" as "in",
          value: status
        });
      } else {
        filters.push({
          field: "status",
          operator: "in" as "in",
          value: ["not_started", "in_progress", "completed", "cancelled"]
        });
      }
      return filters;
    },
    filters: {
      initial: [
        {
          field: "status",
          operator: "in",
          value: ["not_started", "in_progress"],
        },
      ],
    },
    syncWithLocation: true,
  });

  const {
    drawerProps: createDrawerProps,
    formProps: createFormProps,
    saveButtonProps: createSaveButtonProps,
    show: showCreateDrawer
  } = useDrawerForm({
    action: "create",
    resource: "projects",
    redirect: false,
  });

  const {
    drawerProps: editDrawerProps,
    formProps: editFormProps,
    saveButtonProps: editSaveButtonProps,
    show: showEditDrawer
  } = useDrawerForm({
    action: "edit",
    resource: "projects",
    redirect: false,
  });

  const debouncedSubmit = useMemo(() => {
    return debounce(() => {
      searchFormProps.form?.submit();
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      debouncedSubmit.cancel();
    };
  }, [debouncedSubmit]);

  const { token } = theme.useToken();

  return (
    <List
      title="项目管理"
      headerButtons={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showCreateDrawer()}>
          新建项目
        </Button>
      }
    >
      {/* --- 搜索区域 --- */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px' } }}>
        <Form {...searchFormProps} layout="inline"
          onValuesChange={(changedValues) => {
            if ('status' in changedValues) {
              searchFormProps.form?.submit();
            }
            if ('name' in changedValues) {
              debouncedSubmit();
            }
          }}>
          <Form.Item name="name">
            <Input
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              placeholder="搜索项目名称"
              allowClear
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              style={{ width: 240 }}
              mode="multiple"
              placeholder="筛选状态"
              maxTagCount="responsive"
              allowClear
              options={[
                { label: "未启动", value: "not_started" },
                { label: "进行中", value: "in_progress" },
                { label: "已完成", value: "completed" },
                { label: "已取消", value: "cancelled" },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">搜索</Button>
          </Form.Item>
        </Form>
      </Card>

      {/* --- 表格区域 --- */}
      <Table
        {...tableProps}
        rowKey="id"
        scroll={{ x: 1400 }}
        pagination={{
          ...tableProps.pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "15", "20", "50"],
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      >
        <Table.Column dataIndex="id" title="项目ID" width={120} sorter />

        <Table.Column dataIndex="name" title="项目名称" width={280} sorter />

        <Table.Column
          dataIndex="members"
          title="项目人员"
          width={170}
          render={(members: string[]) => (
            <Space wrap>
              {members?.map((member) => (
                <Tag key={member} color="geekblue">{member}</Tag>
              ))}
            </Space>
          )}
        />

        <Table.Column
          dataIndex="status"
          title="状态"
          width={140}
          sorter
          render={(value) => {
            const config = getStatusConfig(value);
            return <Tag color={config.color}>{config.text}</Tag>;
          }}
        />

        <Table.Column
          title="项目总营收"
          width={150}
          render={(_, record: IProject) => {
            const stats = calculateProjectStats(record);
            return (
              <span style={{ color: '#1677ff', fontWeight: 500 }}>
                ¥ {stats.totalRevenue.toLocaleString()}
              </span>
            );
          }}
        />
        <Table.Column
          title="项目总成本"
          width={150}
          render={(_, record: IProject) => {
            const stats = calculateProjectStats(record);
            return (
              <span style={{ color: '#888' }}>
                ¥ {stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            );
          }}
        />

        <Table.Column
          title="项目总利润"
          width={150}
          render={(_, record: IProject) => {
            const stats = calculateProjectStats(record);
            return (
              <span style={{
                color: stats.totalProfit >= 0 ? '#3f8600' : '#cf1322',
                fontWeight: 'bold'
              }}>
                ¥ {stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            );
          }}
        />

        <Table.Column
          title="项目利润率"
          width={120}
          render={(_, record: IProject) => {
            const stats = calculateProjectStats(record);
            return (
              <Tag color={stats.profitMargin >= 30 ? 'green' : stats.profitMargin > 0 ? 'orange' : 'red'}>
                {stats.profitMargin.toFixed(2)}%
              </Tag>
            );
          }}
        />


        <Table.Column
          dataIndex="notes"
          title="备注"
          minWidth={140}
          render={(value) => {
            if (!value) return '-';
            return (
              <Typography.Paragraph
                style={{ marginBottom: 0 }}
                ellipsis={{
                  rows: 2,
                  expandable: false,
                  tooltip: value,
                }}
              >
                {value}
              </Typography.Paragraph>
            );
          }}
        />

        <Table.Column
          title="操作"
          width={80}
          render={(_, record: BaseRecord) => (
            <Space>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => showEditDrawer(record.id)}
              />

            </Space>
          )}
        />
      </Table>

      <ProjectCreateDrawer
        drawerProps={createDrawerProps}
        formProps={createFormProps}
        saveButtonProps={createSaveButtonProps}
      />
      <ProjectEditDrawer
        drawerProps={editDrawerProps}
        formProps={editFormProps}
        saveButtonProps={editSaveButtonProps}
      />
    </List>
  );
};