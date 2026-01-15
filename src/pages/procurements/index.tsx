import React, { useMemo, useState } from "react";
import {
  List,
  useTable,
  useDrawerForm,
  useSelect,
} from "@refinedev/antd";
import { BaseRecord, HttpError, useGo } from "@refinedev/core";
import { Form, Input, Select, Table, Drawer, Button, InputNumber, Card, Tag, Image, Progress, Typography, Row, Col, Spin, Tooltip, Space, theme } from "antd";
import { EditOutlined, LinkOutlined, SearchOutlined, ThunderboltOutlined, UserOutlined } from "@ant-design/icons";
import { fallBackImgBase64 } from "./fallbackImg";

const { Text } = Typography;

// === 1. 接口定义 ===
export interface IProcurement extends BaseRecord {
  id: string;
  quantity_needed: number; // 需采购数量
  quantity_purchased: number; // 实际采购数量
  procurement_amount: number; // 预估总价
  payer: string;  // 付款人
  pay_amount: number; // 实际付款金额
  order_id: string;
  product_id: string;
  project_id: string;
  status: "not_ordered" | "ordered_full" | "ordered_partial" | "arrived_jp_full" | "arrived_jp_partial" | "arrived_cn" | "shipped" | "cancelled";
  created_at: string;
  notes: string; // 备注
  // 关联数据
  products: { name: string; image_url: string; price_jpy: number };
  orders: { order_no: string };
  projects: { name: string };
}

// === 状态映射配置 ===
export const getProcurmentStatusConfig = (status: string) => {
  switch (status) {
    case "not_ordered": return { color: "default", text: "⚪ 未订购" };
    case "ordered_partial": return { color: "orange", text: "🟠 部分订购" };
    case "ordered_full": return { color: "blue", text: "🔵 已订购" };
    case "arrived_jp_partial": return { color: "geekblue", text: "📦 日本部分到货" };
    case "arrived_jp_full": return { color: "cyan", text: "📦 日本全部到货" };
    case "arrived_cn": return { color: "success", text: "✅ 国内到货" };
    case "shipped": return { color: "success", text: "✅ 发货完毕" };
    case "cancelled": return { color: "default", text: "⚫ 取消订购" };
    default: return { color: "default", text: status };
  }
};
const statusOptions = [
  { value: 'not_ordered', label: '⚪ 未订购' },
  { value: 'ordered_partial', label: '🟠 部分订购' },
  { value: 'ordered_full', label: '🔵 已订购' },
  { value: 'arrived_jp_partial', label: '📦 日本部分到货' },
  { value: 'arrived_jp_full', label: '📦 日本全部到货' },
  { value: 'arrived_cn', label: '✅ 国内到货' },
  { value: 'shipped', label: '✅ 发货完毕' },
  { value: 'cancelled', label: '⚫ 取消订购' },
]

// === 3. 编辑采购单 Drawer ===
const ProcurementEditDrawer = ({ drawerProps, formProps, saveButtonProps, query }: any) => {
  // 从 query 中安全获取关联数据
  const recordData = query?.data?.data;
  const isLoading = query?.isLoading;

  const form = formProps.form;
  const handleAutoFill = () => {
    if (!recordData) return;
    const currentNeeded = form.getFieldValue("quantity_needed") ?? recordData.quantity_needed ?? 0;
    const priceJpy = recordData.procurement_amount || 0;
    form.setFieldsValue({
      quantity_purchased: currentNeeded,
      status: 'ordered_full',
      payer: 'Rico',
      pay_amount: priceJpy
    });
  };

  const { token } = theme.useToken();

  return (
    <Drawer
      {...drawerProps}
      title="更新采购信息"
      width={500}
      destroyOnClose={true}
      extra={
        <Tooltip title="一键填入：已购满、Rico支付、按估算成本填入金额">
          <Button
            type="dashed"
            icon={<ThunderboltOutlined style={{ color: '#faad14' }} />}
            onClick={handleAutoFill}
          >
            一键填入
          </Button>
        </Tooltip>
      }>
      <Spin spinning={isLoading}>
        <Form {...formProps} layout="vertical">
          {/* 只读的基础信息 - 从 recordData 读取更稳定  */}
          <Card size="small" style={{ marginBottom: 16, background: token.colorFillQuaternary }}>
            <Form.Item label="关联商品" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Image

                  src={recordData?.products?.image_url}
                  width={40}
                  style={{ borderRadius: 4 }}
                  fallback={fallBackImgBase64}
                />
                {/* 同样使用 recordData 读取名称 */}
                <b>{recordData?.products?.name || '-'}</b>
              </div>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="所属订单" style={{ marginBottom: 0 }}>
                  <Tag>{recordData?.orders?.order_no || '-'}</Tag>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="所属项目" style={{ marginBottom: 0 }}>
                  <Tag color="blue">{recordData?.projects?.name || '-'}</Tag>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 可编辑区域 */}
          <Card size="small" title="采购进度与状态" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="需求数量" name="quantity_needed" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="已购数量" name="quantity_purchased" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="当前状态" name="status" rules={[{ required: true }]}>
              <Select options={statusOptions} />
            </Form.Item>
          </Card>

          <Card size="small" title="财务信息" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="付款人" name="payer">
                  <Select
                    placeholder="选择付款人"
                    allowClear
                    options={[
                      { label: 'Rico', value: 'Rico' },
                      { label: 'Dorothy', value: 'Dorothy' }
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="实际已付(JPY)" name="pay_amount">
                  <InputNumber
                    style={{ width: '100%' }}
                    prefix="¥"
                    placeholder="0.00"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} placeholder="填写采购备注..." />
          </Form.Item>

        </Form>
      </Spin>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <Button {...saveButtonProps} type="primary" icon={<EditOutlined />}>保存更新</Button>
      </div>
    </Drawer>
  );
};

export const ProcurementList = () => {
  const { tableProps, searchFormProps } = useTable<IProcurement, HttpError, { status: string; project_id: string; order_no: string; }>({
    resource: "procurements",
    syncWithLocation: true,
    meta: {
      select: "*, products(name, image_url, product_url, price_jpy), orders!inner(order_no), projects(name)",
      order: "created_at.desc"
    },
    pagination: {
      pageSize: 10,
    },
    sorters: {
      initial: [
        {
          field: "status",
          order: "desc",
        },
      ],
    },
    filters: {
      initial: [
        {
          field: "status",
          operator: "in",
          value: ["not_ordered", "ordered_full", "ordered_partial", "arrived_jp_full", "arrived_jp_partial", "arrived_cn"],
        },
      ],
    },
    onSearch: (params) => {
      const filters = [];
      const { status, project_id, order_no } = params;
      filters.push({
        field: "orders.order_no",
        operator: "contains" as "contains",
        value: order_no
      });
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
          value: ["not_ordered", "ordered_full", "ordered_partial", "arrived_jp_full", "arrived_jp_partial", "arrived_cn", "shipped", "cancelled"]
        });
      }

      filters.push({ field: "project_id", operator: "eq" as "eq", value: project_id });
      return filters;
    },
  });

  const { selectProps: projectSelectProps } = useSelect({
    resource: "projects",
    optionLabel: "name",
    optionValue: "id",
  });

  const {
    drawerProps: editDrawerProps,
    formProps: editFormProps,
    saveButtonProps: editSaveButtonProps,
    show: showEditDrawer,
    query: editQuery
  } = useDrawerForm({
    action: "edit",
    resource: "procurements",
    redirect: false,
    meta: {
      select: "*, products(name, image_url), orders(order_no), projects(name)",
    }
  });

  const go = useGo();

  const { token } = theme.useToken();

  return (
    <List title="采购管理">
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px' } }}>
        <Form {...searchFormProps} layout="inline">
          <Form.Item name="order_no">
            <Input
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              placeholder="搜索订单号"
              allowClear
            />
          </Form.Item>
          <Form.Item name="project_id">
            <Select {...projectSelectProps} style={{ width: 200 }} placeholder="筛选项目" allowClear />
          </Form.Item>
          <Form.Item name="status">
            <Select
              style={{ width: 295 }}
              placeholder="采购状态"
              allowClear
              mode="multiple"
              maxTagCount="responsive"
              options={statusOptions}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
          </Form.Item>
        </Form>
      </Card>

      <Table
        {...tableProps}
        rowKey="id"
        scroll={{ x: 1500 }}
        pagination={{
          ...tableProps.pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "15", "20", "50"],
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      >

        <Table.Column
          dataIndex={["orders", "order_no"]}
          title="所属订单"
          width={150}
          fixed="left"
          render={val => <Tag
            style={{ cursor: "pointer" }}
            onClick={() => {
              go({
                to: { resource: "orders", action: "list" },
                query: {
                  'filters[0][field]': 'order_no',
                  'filters[0][operator]': 'contains',
                  'filters[0][value]': val
                },
                type: "push",
              });
            }}
          >{val}</Tag>
          }
        />

        {/* 2. 商品信息 */}
        <Table.Column
          title="商品名称"
          width={220}
          fixed="left"
          render={(_, record: IProcurement) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Image
                src={record.products?.image_url}
                width={40}
                height={40}
                style={{ borderRadius: 4, objectFit: 'cover' }}
                fallback={fallBackImgBase64}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.products?.name}>
                  {record.products?.name || "未知商品"}
                </div>
              </div>
            </div>
          )}
        />

        {/* 3. 商品单价 (新增) */}
        <Table.Column
          dataIndex={["products", "price_jpy"]}
          title="单价 (JPY)"
          width={100}
          render={val => val ? `¥${val.toLocaleString()}` : '-'}
        />

        {/* 4. 采购进度 */}
        <Table.Column
          title="采购进度"
          width={160}
          render={(_, record: IProcurement) => {
            const percent = record.quantity_needed > 0
              ? Math.min(100, Math.round((record.quantity_purchased / record.quantity_needed) * 100))
              : 0;
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>需: {record.quantity_needed}</span>
                  <span style={{ fontWeight: 'bold', color: percent >= 100 ? token.colorSuccess : token.colorPrimaryText }}>
                    已购: {record.quantity_purchased}
                  </span>
                </div>
                <Progress percent={percent} size="small" showInfo={false} strokeColor={percent >= 100 ? token.colorSuccess : token.colorPrimaryText} />
              </div>
            );
          }}
        />

        {/* 5. 估算成本 (新增: 需求数量 * 日元单价) */}
        <Table.Column
          title="估算成本 (JPY)"
          dataIndex="procurement_amount"
          width={130}
          render={val => {
            return <span style={{ color: token.colorTextSecondary }}>¥ {val.toLocaleString()}</span>;
          }}
        />

        {/* 6. 状态 */}
        <Table.Column
          dataIndex="status"
          title="状态"
          width={120}
          sorter
          render={(val) => {
            const config = getProcurmentStatusConfig(val);
            return <Tag color={config.color}>{config.text}</Tag>;
          }}
        />

        {/* 7. 实际已付金额 */}
        <Table.Column
          dataIndex="pay_amount"
          title="实际已付 (JPY)"
          width={130}
          render={(val) => val > 0 ? (
            <Text strong style={{ color: token.colorErrorText }}>¥ {val.toLocaleString()}</Text>
          ) : '-'}
        />

        {/* 8. 付款人 (新增) */}
        <Table.Column
          dataIndex="payer"
          title="付款人"
          width={100}
          render={(val) => val ? <Tag icon={<UserOutlined />}>{val}</Tag> : '-'}
        />

        {/* 9. 所属项目 */}
        <Table.Column
          dataIndex={["projects", "name"]}
          title="所属项目"
          width={140}
          render={val => <Tag
            color="blue"
            style={{
              cursor: "pointer",
              maxWidth: 135,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onClick={() => {
              go({
                to: { resource: "projects", action: "list" },
                query: {
                  'filters[0][field]': 'name',
                  'filters[0][operator]': 'contains',
                  'filters[0][value]': val
                },
                type: "push",
              });
            }}
          >
            {val}
          </Tag>}
        />

        {/* 10. 备注 */}
        <Table.Column dataIndex="notes" title="备注" ellipsis={true} width={140} render={val => val ? (
          <Tooltip title={val}>
            <span>{val}</span>
          </Tooltip>
        ) : ''} />

        {/* 操作 */}
        <Table.Column
          title="操作"
          width={80}
          fixed="right"
          render={(_, record: BaseRecord) => (
            <Space>
              <Tooltip title="跳转商品页面">
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  href={record.products?.product_url}
                  target="_blank"
                />
              </Tooltip>
              <Tooltip title="修改信息">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => record.id && showEditDrawer(record.id)}
                />
              </Tooltip>
            </Space>
          )}
        />
      </Table>

      <ProcurementEditDrawer
        drawerProps={editDrawerProps}
        formProps={editFormProps}
        saveButtonProps={editSaveButtonProps}
        query={editQuery}
      />
    </List>
  );
};