import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Table, message, Alert, Tag, Image, Typography } from "antd";
import { RocketOutlined, CarOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../util/supabaseClient";
import { useInvalidate, useNotification } from "@refinedev/core";
import { getProcurmentStatusConfig } from "../procurements";

const { Text } = Typography;

interface IShippingModalProps {
  visible: boolean;
  onClose: () => void;
  record: any; // 当前选中的订单
}

export const OrderShippingModal = ({ visible, onClose, record }: IShippingModalProps) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const invalidate = useInvalidate();

  // 打开弹窗时，获取商品明细
  useEffect(() => {
    if (visible && record) {
      fetchItems();
    }
  }, [visible, record]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // 查询采购单及关联商品信息
      const { data, error } = await supabaseClient
        .from("procurements")
        .select("*, products(name, image_url)")
        .eq("order_id", record.id);

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      message.error("加载商品失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 通知
  const { open: openNotification } = useNotification();

  // 是否存在没国内到货商品
  const hasNoArriveCNProduct = useMemo(() => {
    if (!items) return false;
    return items.some((item) => item.status !== "arrived_cn");
  }, [items]);

  const handleConfirmShip = async () => {
    setSubmitting(true);
    try {
      // 更新【订单】状态为已发货 (shipped)
      const { error: orderError } = await supabaseClient
        .from("orders")
        .update({ status: 'shipped' })
        .eq("id", record.id);

      if (orderError) throw orderError;

      // 更新采购单状态为已发货 (shipped)
      const { error: procError } = await supabaseClient
        .from("procurements")
        .update({ status: 'shipped' })
        .eq("order_id", record.id);

      if (procError) throw procError;

      openNotification?.({
        type: "success",
        message: "订单已发货，商品状态已同步更新！",
      });

      // 刷新列表
      await invalidate({ resource: "orders", invalidates: ["resourceAll"] });
      onClose();

    } catch (err: any) {
      openNotification?.({
        type: "error",
        message: "发货操作失败",
        description: err.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={<span><CarOutlined /> 订单发货确认</span>}
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button
          key="submit"
          type="primary"
          icon={<RocketOutlined />}
          loading={submitting}
          onClick={handleConfirmShip}
          disabled={hasNoArriveCNProduct}
        >
          确认已发货
        </Button>,
      ]}
    >
      <Alert
        message={`即将对订单 ${record?.order_no} 执行发货`}
        description={<div>请确认下列商品是否<b>数量正确并已经发货给买家</b>。<br />点击确认发货后，该订单状态将变为「已发货」，且下方列表中的所有采购商品状态将变更为「发货完毕」。</div>}
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      {hasNoArriveCNProduct &&
        <Alert
          description="存在有未到到中国仓的采购商品，请再次确认"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      }

      <Table
        dataSource={items}
        rowKey="id"
        pagination={false}
        loading={loading}
        size="small"
      >
        <Table.Column
          title="商品"
          dataIndex={["products", "name"]}
          render={(text, r: any) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image src={r.products?.image_url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
              <Text ellipsis style={{ maxWidth: 250 }}>{text}</Text>
            </div>
          )}
        />
        <Table.Column
          title="数量"
          dataIndex="quantity_needed"
          width={80}
          render={val => <b>x{val}</b>}
        />
        <Table.Column
          title="当前状态"
          dataIndex="status"
          width={120}
          render={(val) => {
            const config = getProcurmentStatusConfig(val);
            return <Tag color={config.color}>{config.text}</Tag>;
          }}
        />
      </Table>
    </Modal>
  );
};