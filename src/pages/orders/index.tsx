import React, { useMemo, useState } from "react";
import { List, useTable, useDrawerForm, useSelect, } from "@refinedev/antd";
import { BaseRecord, HttpError, useDelete, useGo, useNotification } from "@refinedev/core";
import { Form, Input, Select, Table, Button, Space, Card, Tag, Tooltip, Image, Typography, Modal, theme, } from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined, DeleteOutlined, ExclamationCircleOutlined, PayCircleOutlined, RocketOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { IProcurement } from "../procurements";
import { OrderSettlementModal } from "./settlement-modal";
import { OrderDrawer } from "./order-drawer";
import { OrderShippingModal } from "./shipping-modal";

const { Text } = Typography;

/**
 * 接口定义
 */
export interface IOrder extends BaseRecord {
  /** 订单唯一标识 */
  id: string;
  /** 项目 ID */
  project_id: string;
  /** 订单日期 */
  order_date: string;
  /** 订单名称 */
  order_name: string;
  /** 是否为闲鱼订单 */
  is_xianyu: boolean;
  /** 订单号 */
  order_no: string;
  /** 订单状态 */
  status: "unpaid" | "paid_has_deposit" | "paid_no_deposit" | "shipped" | "confirmed" | "settled" | "refund_pending" | "partial_refund_pending" | "refunded";
  /** 平台手续费 */
  fee_amount: number;
  /** 订单金额 */
  amount_total: number;
  /** 汇率 */
  exchange_rate: number;
  /** 定金金额 */
  deposit_amount: number;
  /** 邮费 */
  postage_amount: number;
  /** 补正名称 */
  cost_correction_name: string;
  /** 补正数额 */
  cost_correction: number;
  /** rico付款补正 */
  rico_paid_correction: number;
  /** dorothy付款补正 */
  dorothy_paid_correction: number;
  /** 备注 */
  notes: string;

  /** 货物成本 */
  procurementsSum: number;
  /** 总成本 */
  totalCost: number;
  /** 净利润 */
  net: number;
  /** ROI */
  roi: number;

  /**
   * 关联数据 (通过 Supabase join 查询出来)
   */
  projects: { name: string };
  /**
   * 订单下的采购列表
   */
  procurements: IProcurement[];
}


// 订单状态常量
export const orderStatus = [
  { value: 'unpaid', label: '🔴 未付款' },
  { value: 'paid_has_deposit', label: '🟠 已付款 (有定金)' },
  { value: 'paid_no_deposit', label: '🔵 已付款 (无定金)' },
  { value: 'shipped', label: '🚚 已发货' },
  { value: 'confirmed', label: '🟢 买家已确认' },
  { value: 'settled', label: '💰 款项已结算' },
  { value: 'refund_pending', label: '🟣 待退款' },
  { value: 'partial_refund_pending', label: '🟤 待部分退款' },
  { value: 'refunded', label: '⚫ 已退款' },
];
// === 状态配置 ===
const getTableStatusConfig = (status: string) => {
  switch (status) {
    // 未付款
    case "unpaid":
      return { color: "error", text: "买家未付款" };
    // 已付款
    case "paid_has_deposit":
      return { color: "magenta", text: "已付款 (有定金)" };
    case "paid_no_deposit":
      return { color: "orange", text: "已付款 (无定金)" };
    // 物流/确认
    case "shipped":
      return { color: "geekblue", text: "已发货" };
    case "confirmed":
      return { color: "cyan", text: "买家已确认" };
    // 完结
    case "settled":
      return { color: "success", text: "款项已结算" };
    // 退款相关
    case "refund_pending":
      return { color: "#f50", text: "待退款" };
    case "partial_refund_pending":
      return { color: "gold", text: "待部分退款" };
    case "refunded":
      return { color: "default", text: "已退款" };
    default:
      return { color: "default", text: status };
  }
};

// === 订单列表组件 ===
export const OrderList = () => {

  const { tableProps, searchFormProps } = useTable<IOrder, HttpError, { order_no: string; status: string; project_id: string }>({
    resource: "orders",
    syncWithLocation: true,
    queryOptions: { staleTime: 0 },
    pagination: {
      pageSize: 10
    },
    // 核心：深度关联查询
    // 1. 查 projects 获取项目名
    // 2. 查 procurements (采购明细)
    // 3. 在 procurements 里再查 products (商品信息)
    meta: {
      select: "*, projects(name), procurements(*, products(name, image_url, price_jpy))",
    },
    sorters: {
      initial: [
        {
          field: "id",
          order: "asc",
        },
      ],
    },
    filters: {
      initial: [
        {
          field: "status",
          operator: "in",
          value: ["unpaid", "paid_has_deposit", "paid_no_deposit", "shipped", "confirmed", "refund_pending", "partial_refund_pending"],
        },
      ],
    },
    onSearch: (params) => {
      const filters = [];
      const { order_no, status, project_id } = params;
      filters.push({ field: "order_no", operator: "contains" as "contains", value: order_no });

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
          value: ["unpaid", "paid_has_deposit", "paid_no_deposit", "shipped", "confirmed", "refund_pending", "partial_refund_pending", "settled", "refunded"]
        });
      }

      filters.push({ field: "project_id", operator: "eq" as "eq", value: project_id });
      return filters;
    },
  });

  // 处理数据
  const processedDataSource = useMemo(() => {
    const data = tableProps.dataSource || [];

    return data.map((item) => {
      const totalJpy = item.procurements?.reduce((sum, p) => {
        return sum + ((p.products?.price_jpy || 0) * (p.quantity_needed || 1));
      }, 0) || 0;
      const procurementsSum = totalJpy * item.exchange_rate;
      const totalCost = procurementsSum + item.postage_amount + item.cost_correction;
      const net = (item.amount_total || 0) - (item.fee_amount || 0) - totalCost;
      const roi = totalCost > 0 ? Number((net / totalCost * 100).toFixed(2)) : 0;

      return {
        ...item,
        procurementsSum: procurementsSum,
        totalCost: totalCost,
        net: net,
        roi: roi
      }
    });
  }, [tableProps.dataSource])

  // 项目下拉数据
  const { selectProps: projectSelectProps } = useSelect({
    resource: "projects",
    optionLabel: "name",
    optionValue: "id",
  });


  const go = useGo();
  const { token } = theme.useToken();


  const [modal, contextHolder] = Modal.useModal();
  // 通知
  const { open: openNotification } = useNotification();

  // 删除订单
  const { mutate: deleteMutate } = useDelete();
  // 删除订单函数
  const handleDelete = (record: IOrder) => {
    modal.confirm({
      title: '高风险操作：确认删除订单？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ marginTop: 10 }}>
          <p>即将删除订单号：<strong>{record.order_no}</strong></p>
          <p style={{ color: token.colorError, background: token.colorErrorBg, padding: 8, border: '1px solid ' + token.colorErrorBorder, borderRadius: 4 }}>
            <strong>警告：</strong><br />
            删除此订单将<strong>同步彻底删除</strong>其绑定的所有<br />
            <strong>【采购明细】</strong>数据！
          </p>
          <p style={{ color: token.colorText }}>此操作无法撤销，请谨慎操作。</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteMutate(
          {
            resource: "orders",
            id: record.id
          },
          {
            onSuccess: () => {
              openNotification?.({
                type: "success",
                message: "订单及其采购记录已删除",
              });
            },
            onError: (error) => {
              openNotification?.({
                type: "error",
                message: "删除失败",
                description: error.message
              });
            }
          }
        );
      },
    });
  };

  const {
    drawerProps: createDrawerProps,
    formProps: createFormProps,
    show: showCreateDrawer,
  } = useDrawerForm({ action: "create", resource: "orders", redirect: false });

  const {
    drawerProps: editDrawerProps,
    formProps: editFormProps,
    show: showEditDrawer,
    query: editQuery,
  } = useDrawerForm({
    action: "edit",
    resource: "orders",
    redirect: false,
    meta: {
      select: "*, procurements(product_id, quantity_needed)",
    },
  });

  // 结算弹窗
  const [isSettlementModalVisible, setIsSettlementModalVisible] = useState(false);
  const [settlementRecord, setSettlementRecord] = useState<IOrder | null>(null);
  const showSettlementModal = (record: IOrder) => {
    setSettlementRecord(record);
    setIsSettlementModalVisible(true);
  };
  // 发货弹窗
  const [isShipModalVisible, setIsShipModalVisible] = useState(false);
  const [shipRecord, setShipRecord] = useState<IOrder | null>(null);
  const showShipModal = (record: IOrder) => {
    setShipRecord(record);
    setIsShipModalVisible(true);
  };

  return (
    <List
      title="订单管理"
      headerButtons={<Button type="primary" icon={<PlusOutlined />} onClick={() => showCreateDrawer()}>
        新建订单
      </Button>}
    >
      {contextHolder}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px' } }}>
        <Form {...searchFormProps} layout="inline">
          <Form.Item name="order_no">
            <Input prefix={<SearchOutlined />} style={{ width: 220 }} placeholder="搜索订单号" allowClear />
          </Form.Item>
          <Form.Item name="project_id">
            <Select {...projectSelectProps} style={{ width: 200 }} placeholder="筛选项目" allowClear />
          </Form.Item>
          <Form.Item name="status">
            <Select
              style={{ width: 345 }}
              mode="multiple"
              maxTagCount="responsive"
              placeholder="订单状态"
              allowClear
              options={orderStatus}
            />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit">搜索</Button></Form.Item>
        </Form>
      </Card>

      {/* --- 表格区域 --- */}
      <Table
        {...tableProps}
        dataSource={processedDataSource}
        rowKey="id"
        pagination={{
          ...tableProps.pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "15", "20", "50"],
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        scroll={{ x: 1200 }}
        expandable={{
          expandedRowRender: (record) => {
            return (
              <Card size="small"
                title={<div>📦 采购明细   <span style={{ marginLeft: 8, fontWeight: 500, color: token.colorPrimaryText, cursor: 'pointer' }} onClick={() => {
                  go({
                    to: { resource: "procurements", action: "list" },
                    query: {
                      'filters[0][field]': 'orders.order_no',
                      'filters[0][operator]': 'contains',
                      'filters[0][value]': record.order_no
                    },
                    type: "push",
                  });
                }}>  查看采购详情</span></div>
                } style={{ margin: 0, background: token.colorBgBase }}>
                <Table
                  dataSource={record.procurements}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  summary={(pageData) => {
                    let totalJpy = 0;
                    let payAmount = 0;
                    pageData.forEach((item) => {
                      totalJpy += item.procurement_amount || 0;
                      payAmount += item.pay_amount || 0;
                    });
                    // const totalCny = totalJpy * (record.exchange_rate || 0);
                    const payAmountCny = payAmount * (record.exchange_rate || 0);
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row style={{ background: token.colorFillTertiary }}>
                          <Table.Summary.Cell index={0}>
                            <Text strong>合计</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} />
                          <Table.Summary.Cell index={2} />
                          <Table.Summary.Cell index={3} />
                          <Table.Summary.Cell index={4} />
                          <Table.Summary.Cell index={5}>
                            <Text type="secondary">¥ {totalJpy.toLocaleString()}</Text>
                          </Table.Summary.Cell>
                          {/* <Table.Summary.Cell index={6}>
                            <Text >¥ {Number(totalCny.toFixed(2)).toLocaleString()}</Text>
                          </Table.Summary.Cell> */}
                          <Table.Summary.Cell index={6}>
                            <Text>¥ {payAmount.toLocaleString()}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={7}>
                            <Text >¥ {Number(payAmountCny.toFixed(2)).toLocaleString()}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={8} />
                          <Table.Summary.Cell index={9} />
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                >
                  <Table.Column
                    title="图片"
                    dataIndex={["products", "image_url"]}
                    width={76}
                    render={url => url ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-'}
                  />
                  <Table.Column
                    title="商品名称"
                    width={400}
                    dataIndex={["products", "name"]}
                  />
                  <Table.Column
                    title="商品单价"
                    width={120}
                    dataIndex={["products", "price_jpy"]}
                    render={v => `¥ ${v?.toLocaleString()}`}
                  />
                  <Table.Column
                    title="需求数量"
                    width={120}
                    dataIndex="quantity_needed"
                  />
                  <Table.Column
                    title="已购数量"
                    width={120}
                    dataIndex="quantity_purchased"
                  />
                  <Table.Column
                    title="估算成本 (JPY)"
                    width={140}
                    dataIndex="procurement_amount"
                    render={(amount) => {
                      return <Text type="secondary">¥ {amount.toLocaleString()}</Text>
                    }}
                  />
                  {/* <Table.Column
                    title="估算成本 (CNY)"
                    render={(_, item: IProcurement) => {
                      const cost = (item.procurement_amount || 0) * (record.exchange_rate || 0.046);
                      return <Text type="secondary">¥ {Number(cost.toFixed(2)).toLocaleString()}</Text>
                    }}
                  /> */}
                  <Table.Column title="实际已付(JPY)"
                    width={140}
                    dataIndex="pay_amount"
                    render={(pay) => {
                      return pay ? <span>¥ {pay.toLocaleString()}</span> : ''
                    }}
                  />
                  <Table.Column
                    title="实际已付(CNY)"
                    width={140}
                    render={(_, item: IProcurement) => {
                      const cny = (item.pay_amount || 0) * (record.exchange_rate || 0.046);
                      return <Text >¥ {Number(cny.toFixed(2)).toLocaleString()}</Text>
                    }}
                  />
                  <Table.Column
                    title="付款人"
                    width={140}
                    dataIndex="payer"
                  />
                  <Table.Column
                    width={240}
                    title="备注"
                    dataIndex="notes"
                  />
                </Table>
              </Card>
            );
          },
          rowExpandable: (record) => record.procurements && record.procurements.length > 0,
        }}
      >
        {/* 订单号 */}
        <Table.Column dataIndex="order_no" title="订单号" width={180} fixed="left" />

        {/* 所属项目 */}
        <Table.Column
          dataIndex={["projects", "name"]}
          title="所属项目"
          width={167}
          render={(val) => {
            if (!val) return '-';
            return (
              <Tag
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
              </Tag>
            );
          }}
        />

        {/* 订单名称 */}
        <Table.Column
          dataIndex="order_name"
          title="订单名称"
          width={160}
          fixed="left"
          render={(text) => text ? <Typography.Paragraph
            style={{ marginBottom: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            ellipsis={{
              rows: 1,
              expandable: false,
              tooltip: text
            }}
          >
            {text}
          </Typography.Paragraph> : '-'}
        />

        {/* 是否闲鱼 */}
        <Table.Column
          dataIndex="is_xianyu"
          title="来源"
          width={76}
          render={val => val ? <span color="orange">闲鱼</span> : <span>个人</span>}
        />
        {/* 订单日期 */}
        <Table.Column
          dataIndex="order_date"
          title="日期"
          width={80}
          render={val => val ? dayjs(val).format("MM-DD") : '-'}
        />

        {/* 订单金额  */}
        <Table.Column
          dataIndex="amount_total"
          title="订单金额"
          width={110}
          render={val => <b>¥ {val}</b>}
        />
        {/* 订单状态 */}
        <Table.Column
          dataIndex="status"
          title="状态"
          width={140}
          render={val => {
            const c = getTableStatusConfig(val);
            return <Tag color={c.color} >{c.text}</Tag>
          }}
        />

        {/* 总应收款 */}
        <Table.Column
          title={<Tooltip title="净应收 = 订单金额 - 平台手续费">净应收</Tooltip>}
          width={110}
          render={(_, record: IOrder) => {
            const net = (record.amount_total || 0) - (record.fee_amount || 0);
            if (record.status === 'refunded') {
              return '-';
            }
            return <Tooltip
              title={
                <div>订单金额：{record.amount_total.toFixed(2)}<br />
                  平台手续费：{record.fee_amount.toFixed(2)}
                </div>
              }>
              ¥ {Number(net.toFixed(2)).toLocaleString()}
            </Tooltip>;

          }}
        />


        {/* 总成本 */}
        <Table.Column
          title={<Tooltip title="订单总成本 = 该订单下所有货物成本 + 邮费 + 订单成本补正">订单总成本</Tooltip>}
          width={110}
          render={(_, record: IOrder) => {
            if (record.status === 'refunded') {
              return '-';
            }
            return <Tooltip
              title={
                <div>货物成本：{record.procurementsSum.toFixed(2)}<br />
                  邮费：{record.postage_amount}<br />
                  成本补正：{record.cost_correction}
                </div>
              }>
              ¥ {Number(record.totalCost.toFixed(2)).toLocaleString()}
            </Tooltip>;
          }}
        />

        {/* 利润额 */}
        <Table.Column
          title="利润额"
          dataIndex="net"
          width={110}
          render={(net, record: IOrder) => {
            if (record.status === 'refunded') {
              return '-';
            };
            return <span style={{ color: net < 0 ? '#ED6F6A' : '#35BD4B' }}>¥ {Number(net.toFixed(2)).toLocaleString()}</span>
          }}
        />

        {/* 利润率 */}
        <Table.Column
          title="利润率"
          dataIndex="roi"
          width={110}
          render={(roi, record: IOrder) => {
            if (record.status === 'refunded') {
              return '-';
            };
            if (roi === 0) {
              return <span>-</span>
            }
            if (roi > 60) {
              return <span style={{ color: '#35BD4B' }}>{roi}%</span>
            }
            if (roi > 30) {
              return <span style={{ color: '#EB78B8' }}>{roi}%</span>
            }
            if (roi > 0) {
              return <span style={{ color: '#24A5D8' }}>{roi}%</span>
            }
            return <span style={{ color: '#ED6F6A' }}>{roi}%</span>
          }}
        />

        {/* 备注 */}
        <Table.Column
          dataIndex="notes"
          title="备注"
          width={160}
          ellipsis={{ showTitle: false }}
          render={val => val ? (
            <Typography.Paragraph
              style={{ marginBottom: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
              ellipsis={{
                rows: 2,
                expandable: false,
                tooltip: val
              }}
            >
              {val}
            </Typography.Paragraph>
          ) : ''}
        />

        {/* 操作列 */}
        <Table.Column
          title="操作"
          width={120}
          fixed="right"
          align="right"
          render={(_, record: IOrder) => (
            <Space>
              <Tooltip title="修改订单">
                <Button size="small" icon={<EditOutlined />} onClick={() => showEditDrawer(record.id)} />
              </Tooltip>
              {/* 结算按钮 */}
              {["shipped", "confirmed", "partial_refund_pending"].includes(record.status) && (
                <Tooltip title="金额结算">
                  <Button
                    size="small"
                    icon={<PayCircleOutlined />}
                    style={{ color: token.colorSuccess, borderColor: token.colorSuccessBorder, background: token.colorSuccessBg }}
                    onClick={() => showSettlementModal(record)}
                  />
                </Tooltip>
              )}
              {["paid_has_deposit", "paid_no_deposit"].includes(record.status) && (
                <Tooltip title="发货确认">
                  <Button
                    size="small"
                    icon={<RocketOutlined />}
                    style={{ color: token.colorPrimary, borderColor: token.colorPrimaryBorder, background: token.colorPrimaryBg }}
                    onClick={() => showShipModal(record)}
                  />
                </Tooltip>
              )}
              <Tooltip title="删除订单">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                />
              </Tooltip>

            </Space>
          )}
        />
      </Table>


      <OrderDrawer
        type="create"
        drawerProps={createDrawerProps}
        formProps={createFormProps}
      />
      <OrderDrawer
        type="edit"
        drawerProps={editDrawerProps}
        formProps={editFormProps}
        query={editQuery}
      />
      <OrderSettlementModal
        visible={isSettlementModalVisible}
        record={settlementRecord}
        onClose={() => setIsSettlementModalVisible(false)}
      />
      <OrderShippingModal
        visible={isShipModalVisible}
        record={shipRecord}
        onClose={() => setIsShipModalVisible(false)}
      />
    </List >
  );
};