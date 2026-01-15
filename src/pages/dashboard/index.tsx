import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { Row, Col, Card, Statistic, Progress, Typography, Spin, theme, } from "antd";
import { DollarCircleOutlined, ShoppingOutlined, TagsOutlined, RiseOutlined, AccountBookOutlined, ClockCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// === 1. 简单的卡片组件封装 ===
const StatCard = ({ title, value, prefix, suffix, icon, color, loading, subTitle, subValue }: any) => {

  const { token } = theme.useToken();
  return (
    <Card
      bordered={false}
      style={{ height: '100%', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 14 }}>{title}</Text>
          <div style={{ marginTop: 8 }}>
            {loading ? <Spin size="small" /> : (
              <Statistic
                value={value}
                prefix={prefix}
                suffix={suffix}
                valueStyle={{ fontWeight: 600, fontSize: 24 }}
                precision={typeof value === 'number' && !Number.isInteger(value) ? 2 : 0}
              />
            )}
          </div>
        </div>
        <div style={{
          background: color,
          width: 48,
          height: 48,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 20,
          opacity: 0.9
        }}>
          {icon}
        </div>
      </div>
      {subTitle && (
        <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 12, fontSize: 12, color: '#888' }}>
          {subTitle}: <span style={{ color: token.colorText, fontWeight: 500 }}>{subValue}</span>
        </div>
      )}
    </Card>
  );
};

export const DashboardPage = () => {
  // === 2. 获取所有数据 (不分页) ===
  // 这里我们需要计算所有的成本，所以必须把 products 的价格也查出来

  const { query } = useList({
    resource: "orders",
    pagination: { mode: "off" },
    meta: {
      select: "*, procurements(quantity_needed, status, products(price_jpy))",
    }
  });
  const { data: orderData, isLoading } = query;

  // === 3. 核心计算逻辑 (使用 useMemo 缓存结果) ===
  const stats = useMemo(() => {
    const orders = orderData?.data || [];

    let totalRevenue = 0;   // 总金额 (营收)
    let totalCost = 0;      // 总成本
    let totalProfit = 0;    // 总利润

    let orderCount = 0;           // 总订单数
    let pendingOrderCount = 0;    // 待完成订单 (非 settled, 非 refunded)

    let procurementCount = 0;         // 采购商品总数
    let pendingProcurementCount = 0;  // 待采购商品数 (not_ordered)

    orders.forEach((order: any) => {
      orderCount++;

      // A. 订单状态统计
      // 假设 'settled' 和 'refunded' 算作已结束，其他都算待处理/进行中
      if (order.status !== 'settled' && order.status !== 'refunded') {
        pendingOrderCount++;
      }

      // 退款订单不进行财务计算
      if (order.status === 'refunded') {
        return;
      }

      // B. 财务计算
      const amountTotal = Number(order.amount_total) || 0;
      const feeAmount = Number(order.fee_amount) || 0;
      const exchangeRate = Number(order.exchange_rate) || 0;
      const correction = Number(order.cost_correction) || 0;
      const postage = Number(order.postage_amount) || 0;

      // 累加营收
      totalRevenue += amountTotal;

      // 计算本单成本
      let orderJpyTotal = 0;
      order.procurements?.forEach((p: any) => {
        const qty = Number(p.quantity_needed) || 0;
        const price = Number(p.products?.price_jpy) || 0;

        // 累加采购数量
        procurementCount += qty;
        if (p.status === 'not_ordered') {
          pendingProcurementCount += qty;
        }

        orderJpyTotal += price * qty;
      });

      const orderCnyCost = (orderJpyTotal * exchangeRate) + correction + postage;
      totalCost += orderCnyCost;

      // 计算本单利润 (营收 - 手续费 - 成本)
      const netIncome = amountTotal - feeAmount;
      totalProfit += (netIncome - orderCnyCost);
    });

    // 综合利润率
    const profitMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      orderCount,
      pendingOrderCount,
      orderCompletionRate: orderCount > 0 ? ((orderCount - pendingOrderCount) / orderCount) * 100 : 0,
      procurementCount,
      pendingProcurementCount,
      procurementCompletionRate: procurementCount > 0 ? ((procurementCount - pendingProcurementCount) / procurementCount) * 100 : 0,
    };
  }, [orderData]);

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={4} style={{ marginBottom: 24, fontWeight: 400 }}>
        📊 经营概览
      </Title>

      {/* 第一行：核心财务指标 */}
      <Row gutter={[24, 24]}>
        {/* 1. 总金额 */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="总销售额"
            value={stats.totalRevenue}
            prefix="¥"
            icon={<DollarCircleOutlined />}
            color="linear-gradient(135deg, #1890ff 0%, #096dd9 100%)" // 蓝色渐变
            loading={isLoading}
            subTitle="共计订单"
            subValue={`${stats.orderCount} 单`}
          />
        </Col>

        {/* 2. 总成本 */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="总投入成本"
            value={stats.totalCost}
            prefix="¥"
            icon={<AccountBookOutlined />}
            color="linear-gradient(135deg, #ffc53d 0%, #faad14 100%)" // 橙色/金色渐变
            loading={isLoading}
            subTitle="成本占比"
            subValue={`${stats.totalRevenue > 0 ? ((stats.totalCost / stats.totalRevenue) * 100).toFixed(1) : 0}%`}
          />
        </Col>

        {/* 3. 总利润 */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="净利润"
            value={stats.totalProfit}
            prefix="¥"
            icon={<RiseOutlined />}
            color={stats.totalProfit >= 0
              ? "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)" // 绿色渐变
              : "linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)" // 红色渐变(亏损)
            }
            loading={isLoading}
            subTitle="平均单笔利润"
            subValue={`¥${stats.orderCount > 0 ? (stats.totalProfit / stats.orderCount).toFixed(1) : 0}`}
          />
        </Col>

        {/* 4. 综合利润率 */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="综合 ROI"
            value={stats.profitMargin}
            suffix="%"
            icon={<TagsOutlined />}
            color="linear-gradient(135deg, #722ed1 0%, #531dab 100%)" // 紫色渐变
            loading={isLoading}
            subTitle="投资回报状态"
            subValue={stats.profitMargin > 25 ? "🔥 优秀" : stats.profitMargin > 0 ? "🙂 良好" : "⚠️ 需注意"}
          />
        </Col>
      </Row>

      {/* 第二行：业务进度 */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>

        {/* 左侧：订单处理进度 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span><ClockCircleOutlined /> 订单处理进度</span>}
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            <Row gutter={24} align="middle">
              <Col span={12}>
                <Statistic
                  title="待完成/结算订单"
                  value={stats.pendingOrderCount}
                  valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
                  suffix={`/ ${stats.orderCount}`}
                />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">订单完成率</Text>
                  <Progress percent={Number(stats.orderCompletionRate.toFixed(1))} status="active" strokeColor="#1890ff" />
                </div>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <div style={{ color: '#888', marginBottom: 4 }}>历史总单量</div>
                <div style={{ fontSize: 32, fontWeight: 300 }}>{stats.orderCount}</div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 右侧：采购任务进度 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span><ShoppingOutlined /> 采购任务进度</span>}
            bordered={false}
            style={{ borderRadius: 8 }}
          >
            <Row gutter={24} align="middle">
              <Col span={12}>
                <Statistic
                  title="待采购商品单"
                  value={stats.pendingProcurementCount}
                  valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
                  suffix={`/ ${stats.procurementCount}`}
                />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">采购完成率</Text>
                  <Progress percent={Number(stats.procurementCompletionRate.toFixed(1))} status="active" strokeColor="#52c41a" />
                </div>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <div style={{ color: '#888', marginBottom: 4 }}>商品吞吐总量</div>
                <div style={{ fontSize: 32, fontWeight: 300 }}>{stats.procurementCount}</div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};