import React, { useEffect, useState, useMemo } from "react";
import { Modal, Button, Descriptions, Statistic, Divider, message, Spin, Alert, Radio, Form, theme } from "antd";
import { PayCircleOutlined, CheckCircleOutlined, UserOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../util/supabaseClient";
import { useInvalidate, useNotification } from "@refinedev/core";
import { IOrder } from ".";

interface ISettlementModalProps {
  visible: boolean;
  onClose: () => void;
  record: IOrder | null; // 当前选中的订单对象
}

export const OrderSettlementModal = ({ visible, onClose, record }: ISettlementModalProps) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const invalidate = useInvalidate();

  // 🔥 新增：补正金额付款人状态 (默认为 Rico)
  const [correctionPayer, setCorrectionPayer] = useState<'Rico' | 'Dorothy'>('Rico');

  // 基础统计数据 (仅包含采购单的数据)
  const [baseStats, setBaseStats] = useState({
    ricoProcurementPaid: 0,   // 采购单里 Rico 付的钱
    dorothyProcurementPaid: 0, // 采购单里 Dorothy 付的钱
    totalProcurementCost: 0,
  });

  // 当弹窗打开时，实时计算数据
  useEffect(() => {
    if (visible && record) {
      // 每次打开重置补正付款人，或者你可以保持状态
      setCorrectionPayer('Rico');
      fetchProcurementData();
    }
  }, [visible, record]);

  const fetchProcurementData = async () => {
    if (!record) return;

    setLoading(true);
    try {
      // 1. 获取该订单下的所有采购记录
      const { data: procurements, error } = await supabaseClient
        .from("procurements")
        .select("pay_amount, payer")
        .eq("order_id", record.id);

      if (error) throw error;

      // 2. 计算各方在【采购单层面】的垫付金额
      let ricoSum = 0;
      let dorothySum = 0;
      let procurementTotal = 0;

      procurements?.forEach((p: any) => {
        const amount = Number(p.pay_amount) || 0;
        procurementTotal += amount;
        if (p.payer === 'Rico') ricoSum += amount;
        else if (p.payer === 'Dorothy') dorothySum += amount;
      });

      setBaseStats({
        ricoProcurementPaid: ricoSum * record.exchange_rate,
        dorothyProcurementPaid: dorothySum * record.exchange_rate,
        totalProcurementCost: procurementTotal,
      });

    } catch (err: any) {
      message.error("计算失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 实时计算最终展示数据 (包含补正金额的分配)
  const finalStats = useMemo(() => {
    if (!record) {
      return {
        ricoTotal: 0,
        dorothyTotal: 0,
        profit: 0,
        netIncome: 0,
        extraCost: 0,
        totalCost: 0,
        ricoShouldReceive: 0,
        dorothyShouldReceive: 0
      };
    }

    const amountTotal = Number(record.amount_total) || 0;
    const feeAmount = Number(record.fee_amount) || 0;
    const costCorrection = Number(record.cost_correction) || 0;
    const postageAmount = Number(record.postage_amount) || 0;

    // 补正金额
    const extraCost = costCorrection;

    // 根据单选框，将额外成本加给对应的人
    const ricoTotal = baseStats.ricoProcurementPaid + (correctionPayer === 'Rico' ? extraCost : 0);
    const dorothyTotal = baseStats.dorothyProcurementPaid + (correctionPayer === 'Dorothy' ? extraCost : 0) + postageAmount;

    // 净应收
    const netIncome = amountTotal - feeAmount;
    // 总付款
    const totalCost = ricoTotal + dorothyTotal;
    // 利润
    const profit = netIncome - totalCost;

    // rico 应收
    const ricoShouldReceive = ricoTotal + profit / 2;
    // dorothy 应收
    const dorothyShouldReceive = dorothyTotal + profit / 2;

    return {
      ricoTotal,
      dorothyTotal,
      netIncome,
      profit, // 利润
      postageAmount, // 邮费
      totalCost,
      extraCost, // 补正
      ricoShouldReceive,
      dorothyShouldReceive
    };
  }, [baseStats, record, correctionPayer]);

  // 通知
  const { open: openNotification } = useNotification();

  const handleConfirm = async () => {
    if (!record) return;

    setSubmitting(true);
    try {
      // 执行结算：更新状态 + 回写已收金额
      const { error } = await supabaseClient
        .from("orders")
        .update({
          status: 'settled',
          rico_receive: Number(finalStats.ricoShouldReceive.toFixed(2)),
          dorothy_receive: Number(finalStats.dorothyShouldReceive.toFixed(2))
        })
        .eq("id", record.id);

      if (error) throw error;
      openNotification?.({
        type: "success",
        message: "订单结算完成！",
      });
      await invalidate({ resource: "orders", invalidates: ["list"] });
      onClose();

    } catch (err: any) {
      openNotification?.({
        type: "error",
        message: "结算提交失败",
        description: err.message || "未知错误",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const { token } = theme.useToken();

  return (
    <Modal
      title={<span><PayCircleOutlined /> 订单金额结算</span>}
      open={visible}
      onCancel={onClose}
      width={650}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={submitting}
          onClick={handleConfirm}
          style={{ backgroundColor: token.colorSuccessBg, borderColor: token.colorSuccessBorder, color: token.colorSuccess }}
        >
          确认结算
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Alert
          message={`正在结算订单：${record?.order_no}`}
          description="系统已根据采购记录的汇总。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {finalStats.extraCost > 0 && (
          <div style={{ background: token.colorWarningBg, padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid ' + token.colorWarningBorder }}>
            <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#d46b08' }}>
              检测到订单补正金额：¥ {finalStats.extraCost.toFixed(2)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 12 }}>请选择该笔费用的付款人：</span>
              <Radio.Group
                value={correctionPayer}
                onChange={e => setCorrectionPayer(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="Rico">Rico</Radio.Button>
                <Radio.Button value="Dorothy">Dorothy</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        )}

        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="Rico 总实付" span={2}>
            <span style={{ fontSize: 18 }}>
              ¥ {finalStats.ricoTotal.toFixed(2)}
            </span>
            <div style={{ fontSize: 12, color: '#999' }}>
              (商品: {baseStats.ricoProcurementPaid.toFixed(2)} + 补正: {correctionPayer === 'Rico' ? finalStats.extraCost : 0})
            </div>
          </Descriptions.Item>


          <Descriptions.Item label="Dorothy 总实付" span={2} >
            <span style={{ fontSize: 18 }}>
              ¥ {finalStats.dorothyTotal.toFixed(2)}
            </span>
            <div style={{ fontSize: 12, color: '#999' }}>
              (商品: {baseStats.dorothyProcurementPaid.toFixed(2)} + 邮费: {finalStats.postageAmount} + 补正: {correctionPayer === 'Dorothy' ? finalStats.extraCost : 0})
            </div>
          </Descriptions.Item>

          <Descriptions.Item label="净应收 (去除平台手续费)" span={2} >
            <span style={{ color: '#1677ff', fontSize: 18 }}>¥ {finalStats.netIncome.toFixed(2)}</span>
          </Descriptions.Item>
          <Descriptions.Item label="总实付合计" span={2}>
            <span style={{ fontSize: 18 }}>¥ {finalStats.totalCost.toFixed(2)}</span>
          </Descriptions.Item>

          <Descriptions.Item label="Rico 应收款" span={2} >
            <span style={{ color: '#3f8600', fontWeight: 'bold', fontSize: 18 }}>¥ {finalStats.ricoShouldReceive.toFixed(2)}</span>
            <div style={{ fontSize: 12, color: '#999' }}>
              (实付: {finalStats.ricoTotal.toFixed(2)} + 分配利润: {(finalStats.profit / 2).toFixed(2)} )
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Dorothy 应收款" span={2}>
            <span style={{ color: '#3f8600', fontWeight: 'bold', fontSize: 18 }}>¥ {finalStats.dorothyShouldReceive.toFixed(2)}</span>
            <div style={{ fontSize: 12, color: '#999' }}>
              (实付: {finalStats.dorothyTotal.toFixed(2)} + 分配利润: {(finalStats.profit / 2).toFixed(2)} )
            </div>
          </Descriptions.Item>

        </Descriptions>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ textAlign: 'center', background: '#f6ffed', padding: 16, borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Statistic
            title={<div style={{ color: '#999' }}>
              本单最终总利润
            </div>}
            value={finalStats.profit}
            precision={2}
            prefix="¥"
            valueStyle={{ color: finalStats.profit >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}
          />
          <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>
            请确认以上信息正确，打款完成后，点击确认结算按钮
          </div>
        </div>
      </Spin>
    </Modal>
  );
};