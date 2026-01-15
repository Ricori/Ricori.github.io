import React, { useEffect, useMemo, useState } from "react";
import { useSelect } from "@refinedev/antd";
import { Form, Input, Select, Drawer, Button, InputNumber, Radio, DatePicker, Card, Divider, Row, Col, Avatar, Statistic, Tooltip, Switch, Tag, theme, DrawerProps, Alert, } from "antd";

import { PlusOutlined, DeleteOutlined, ShoppingOutlined, FileImageOutlined, InfoCircleOutlined, CalculatorOutlined, FileAddOutlined, LockOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { orderStatus } from ".";
import { useInvalidate, useNotification } from "@refinedev/core";
import { supabaseClient } from "../../util/supabaseClient";

const LockedLabel = ({ label, tips }: { label: string, tips: string }) => (
  <span style={{ cursor: 'not-allowed', color: '#888' }}>
    {label} <Tooltip title={tips}><LockOutlined style={{ fontSize: 12, color: '#faad14' }} /></Tooltip>
  </span>
);

export const OrderDrawer = (
  { type, drawerProps, formProps, query }: { type: 'create' | 'edit', drawerProps: DrawerProps, formProps: any, query?: any }
) => {

  // 主题样式
  const { token } = theme.useToken();
  // 通知
  const { open: openNotification } = useNotification();
  // 初始化失效钩子
  const invalidate = useInvalidate();


  // 监听状态
  const currentProjectId = Form.useWatch("project_id", formProps.form);
  const isXianyu = Form.useWatch("is_xianyu", formProps.form);
  const currentStatus = Form.useWatch("status", formProps.form);
  const highXianyuFees = Form.useWatch("high_xianyu_fees", formProps.form);
  const amountTotal = Form.useWatch("amount_total", formProps.form) || 0;
  const postageAmount = Form.useWatch("postage_amount", formProps.form) || 0;
  const exchangeRate = Form.useWatch("exchange_rate", formProps.form) || 0;
  const selectedProducts = Form.useWatch("selected_products", formProps.form) || [];
  const hasCorrection = Form.useWatch("has_correction", formProps.form);
  const correctionAmount = Form.useWatch("cost_correction", formProps.form) || 0;

  // 项目列表
  const { selectProps: projectSelectProps } = useSelect({
    resource: "projects",
    optionLabel: "name",
    optionValue: "id",
  });

  // 商品列表
  const { query: productQueryResult } = useSelect({
    resource: "products",
    meta: {
      select: "id, name, image_url, price_jpy, product_url, project_id"
    },
    filters: [
      {
        field: "project_id",
        operator: "eq",
        value: currentProjectId,
      }
    ],
    queryOptions: {
      enabled: !!currentProjectId, // 只有选了项目才查
    }
  });
  const productOptions = productQueryResult.data?.data || [];


  // 平台手续费计算
  const feeAmount = useMemo(() => {
    if (!isXianyu) return 0;
    return Number((amountTotal * (highXianyuFees ? 0.016 : 0.006)).toFixed(2));
  }, [isXianyu, amountTotal, highXianyuFees]);
  // 补正计算
  const totalCorrectionAmount = useMemo(() => {
    return hasCorrection ? Number(correctionAmount) : 0;
  }, [hasCorrection, correctionAmount]);
  const estimates = useMemo(() => {
    // 商品日元总价
    let totalJpy = 0;
    selectedProducts.forEach((item: { product_id: string; quantity: number }) => {
      if (item?.product_id && item?.quantity) {
        const product = productOptions.find((p: any) => p.id === item.product_id);
        if (product) {
          totalJpy += (product.price_jpy || 0) * item.quantity;
        }
      }
    });
    // 商品人民币成本 = 日元 * 汇率
    const productCostCny = totalJpy * exchangeRate;
    // 总成本 = 商品CNY + 邮费 + 补正
    const totalCost = productCostCny + postageAmount + totalCorrectionAmount;
    // 总应收 (净入账) = 订单金额 - 手续费
    const netIncome = amountTotal - feeAmount;
    // 预估利润 = 净入账 - 总成本
    const estimatedProfit = netIncome - totalCost;
    // 利润率 (ROI) = 利润 / 总成本
    const profitMargin = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;
    return {
      totalJpy,
      productCostCny,
      totalCost,
      netIncome,
      estimatedProfit,
      profitMargin
    };
  }, [amountTotal, feeAmount, exchangeRate, postageAmount, selectedProducts, productOptions, totalCorrectionAmount]);




  const form = <Form
    {...formProps}
    layout="vertical"
    initialValues={undefined}
    onValuesChange={(changedValues) => {
      if ('project_id' in changedValues) {
        formProps.form.setFieldValue('selected_products', []);
      }
    }}
  >
    {/* === 基础信息 === */}
    <Card size="small" title="基础信息" style={{ marginBottom: 16 }}>
      <Row gutter={16}>

        <Col span={12}>
          {type === 'create' ?
            <Form.Item
              label="归属项目"
              name="project_id"
              rules={[{ required: true }]}
            >
              <Select {...projectSelectProps} placeholder="请先选择项目" />
            </Form.Item>
            :
            <Form.Item
              label={<LockedLabel label="归属项目" tips="订单创建后不可更改归属项目" />}
              name="project_id"
            >
              <Select {...projectSelectProps} disabled variant="filled" />
            </Form.Item>
          }
        </Col>

        <Col span={12}>
          {type === 'create' ?
            <Form.Item
              label="订单日期"
              name="order_date"
              initialValue={dayjs()}
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            :
            <Form.Item
              label="订单日期"
              name="order_date"
              rules={[{ required: true }]}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : undefined,
              })}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          }
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="订单名称" name="order_name" >
            <Input placeholder="自定义订单名称" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={type === 'create' ? "来源" : <LockedLabel label="来源" tips="不可更改订单来源" />}
            name="is_xianyu"
            initialValue={type === 'create' ? true : undefined}
          >
            <Radio.Group buttonStyle="solid">
              <Radio.Button value={true}>闲鱼</Radio.Button>
              <Radio.Button value={false}>个人</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Col>

        {type === 'create' ?
          <Col span={12}>
            {isXianyu === true && (
              <Form.Item label="闲鱼订单编号" name="order_no" rules={[{ required: true }]}>
                <Input placeholder="例如：4976747245071757005" />
              </Form.Item>
            )}
          </Col>
          :
          <Col span={12}>
            <Form.Item label={<LockedLabel label="订单编号" tips="订单号是唯一标识，不可更改" />} name="order_no">
              <Input disabled variant="filled" />
            </Form.Item>
          </Col>}
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="订单当前状态"
            name="status"
            initialValue={type === 'create' ? "paid_no_deposit" : undefined}
            rules={[{ required: true }]}
          >
            <Select options={orderStatus} />
          </Form.Item>
        </Col>
      </Row>
    </Card>


    {/* === 财务信息 === */}
    <Card size="small" title="财务信息" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="订单总金额 (CNY)" name="amount_total" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
        </Col>
        <Col span={12}>
          {isXianyu === true &&
            <Form.Item
              label="平台手续费比例"
              name="high_xianyu_fees"
              initialValue={type === 'create' ? false : undefined}
              rules={[{ required: true }]}
            >
              <Radio.Group buttonStyle="solid">
                <Radio.Button value={false}>0.6%</Radio.Button>
                <Radio.Button value={true}>1.6%</Radio.Button>
              </Radio.Group>
            </Form.Item>
          }
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="日元汇率 (CNY/JPY)"
            name="exchange_rate"
            initialValue={type === 'create' ? 0.0446 : undefined}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} step={0.0001} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="邮费" name="postage_amount" initialValue={type === 'create' ? 0 : undefined} >
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
        </Col>
      </Row>

      {/* 只有选了“已付定金”才显示的字段 */}
      {currentStatus === 'paid_has_deposit' && (
        <Form.Item
          label="定金金额 (CNY)"
          name="deposit_amount"
          rules={[{ required: true, message: "买家已付定金状态下必填" }]}
          style={{ background: token.colorWarningBg, padding: 8, borderRadius: 4, border: '1px dashed ' + token.colorWarning }}
        >
          <InputNumber style={{ width: '100%' }} prefix="¥" />
        </Form.Item>
      )}
    </Card>


    <Card
      size="small"
      title={<span><ShoppingOutlined /> 订单商品</span>}
      style={{ marginBottom: 16, background: token.colorSuccessBg, borderColor: token.colorSuccess }}
    >
      {type === 'edit' &&
        <Alert
          message="商品明细已锁定"
          description="为保证采购数据一致性，修改订单时不可变更商品明细。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      }

      <Form.List name="selected_products">
        {(fields, { add, remove }) => (
          <>

            {(type === 'create' && fields.length > 0) ? (
              <Row gutter={8} style={{ marginBottom: 8, fontSize: 12, color: token.colorTextLabel }}>
                <Col span={12}>商品名称</Col>
                <Col span={6}>价格 (JPY)</Col>
                <Col span={4}>数量</Col>
                <Col span={2}>操作</Col>
              </Row>
            ) : null}



            {fields.map(({ key, name, ...restField }) => {
              // 获取当前行选中的商品数据
              const currentRow = selectedProducts[name] || {};
              const selectedProduct = productOptions.find((p: any) => p.id === currentRow.product_id);
              const unitPrice = selectedProduct?.price_jpy || 0;
              const quantity = currentRow.quantity || 1;
              const rowTotal = unitPrice * quantity;
              // 计算所有已选的商品ID (用于查重) 
              const allSelectedIds = selectedProducts.map((p: any) => p?.product_id);


              return (
                <Row
                  key={key}
                  gutter={8}
                  align="middle"
                  style={{ marginBottom: 12, borderBottom: `1px dashed ${token.colorBorder}`, paddingBottom: 8 }}
                >

                  {type === 'create' ?
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'product_id']}
                        rules={[{ required: true, message: '必选' }]}
                        style={{ margin: 0 }}
                      >
                        <Select
                          placeholder={currentProjectId ? "搜商品..." : "⛔ 先选项目"}
                          disabled={!currentProjectId}
                          showSearch
                          optionFilterProp="label"
                          optionLabelProp="label"
                          listHeight={400}
                          style={{ width: '100%' }}
                        >
                          {productOptions.map((item: any) => {
                            // 判断是否禁用该选项 
                            // 规则：如果该ID已经被选了，且不是当前行自己选的，就禁用
                            const isSelected = allSelectedIds.includes(item.id);
                            const isCurrentRowSelection = item.id === currentRow.product_id;
                            const shouldDisable = isSelected && !isCurrentRowSelection;
                            return (
                              <Select.Option key={item.id} value={item.id} label={item.name} disabled={shouldDisable}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar shape="square" size={32} src={item.image_url} icon={<FileImageOutlined />} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 500,
                                      fontSize: 14,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }} title={item.name}>
                                      {item.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: token.colorErrorText }}>¥{item.price_jpy?.toLocaleString()}</div>
                                  </div>
                                </div>
                              </Select.Option>
                            )
                          })}
                        </Select>
                      </Form.Item>
                    </Col>
                    :
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'product_id']}
                        style={{ margin: 0 }}
                      >
                        {/* 禁用 Select */}
                        <Select disabled variant="borderless" suffixIcon={null}>
                          {productOptions.map((item: any) => (
                            <Select.Option key={item.id} value={item.id} label={item.name}>
                              {item.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  }


                  {/* 价格展示 */}
                  <Col span={6}>
                    {type === 'create' ?
                      <div style={{ background: token.colorFillSecondary, padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: token.colorTextLabel }}>
                          <span>单价:</span>
                          <span>¥{unitPrice.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: token.colorTextLabel }}>
                          <span>小计:</span>
                          <span style={{ color: token.colorErrorText }}>¥{rowTotal.toLocaleString()}</span>
                        </div>
                      </div>
                      :
                      <div style={{ fontSize: 12, color: token.colorTextLabel }}>
                        单价: ¥{unitPrice}<br />
                        小计: <span style={{ color: token.colorErrorText }}>¥{rowTotal}</span>
                      </div>
                    }
                  </Col>

                  {/* 数量输入 */}
                  {type === 'create' &&
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        initialValue={type === 'create' ? 1 : unitPrice}
                        rules={[{ required: true }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber
                          min={1}
                          placeholder="数"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  }

                  {/* 删除按钮 */}
                  {type === 'create' &&
                    <Col span={2} style={{ textAlign: 'center' }}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      />
                    </Col>
                  }

                  {type === 'edit' &&
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        style={{ margin: 0 }}
                      >
                        {/* 禁用 Quantity，并改为只读样式 */}
                        <InputNumber disabled variant="borderless" suffix="个" style={{ color: token.colorText, fontWeight: 'bold' }} />
                      </Form.Item>
                    </Col>
                  }
                </Row>
              )
            })}

            {type === 'create' &&
              <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加商品
                </Button>
              </Form.Item>
            }
          </>
        )}
      </Form.List>
    </Card >

    <Card
      size="small"
      title={<span><FileAddOutlined /> 成本补正 </span>}
      style={{ marginBottom: 16 }}
      extra={<Tag color="orange">补正金额: ¥{totalCorrectionAmount}</Tag>}
    >
      <Form.Item name="has_correction" valuePropName="checked" initialValue={type === 'create' ? false : undefined} style={{ marginBottom: hasCorrection ? 16 : 0 }}>
        <Switch checkedChildren="启用补正" unCheckedChildren="无补正" />
      </Form.Item>

      {/* 只有开关打开时显示输入框 */}
      {hasCorrection && (
        <div style={{ background: token.colorWarningBg, padding: '16px 16px 0 16px', borderRadius: 8, border: '1px dashed ' + token.colorWarning }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="补正名称"
                name="cost_correction_name"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="例如：门票费、路费" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                label="金额 (CNY)"
                name="cost_correction"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      )}
    </Card>

    {/* === 预估分析 === */}
    <Card
      size="small"
      title={<span><CalculatorOutlined /> 订单预估分析</span>}
      style={{ marginBottom: 16, background: token.colorInfoBg, borderColor: token.colorInfo }}
    >
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Statistic
            title={
              <Tooltip title="订单商品的 (日元原价 × 数量) 之和">
                商品日元总价 <InfoCircleOutlined />
              </Tooltip>
            }
            value={estimates.totalJpy}
            prefix="JPY ¥"
            precision={0}
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title={
              <Tooltip title={`订单总金额(${amountTotal}) - 平台手续费(${feeAmount})`}>
                总应收(净入账) <InfoCircleOutlined />
              </Tooltip>
            }
            value={estimates.netIncome}
            prefix="¥"
            precision={2}
            valueStyle={{ color: '#3f8600', fontSize: 16 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title={
              <Tooltip title="(商品日元总价 × 汇率) + 邮费 + 成本补正">
                预估总成本 <InfoCircleOutlined />
              </Tooltip>
            }
            value={estimates.totalCost}
            prefix="¥"
            precision={2}
            valueStyle={{ color: '#cf1322', fontSize: 16 }}
          />
        </Col>
        <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>
        <Col span={12}>
          <Statistic
            title={
              <Tooltip title="总应收 - 预估总成本">
                预估总利润 <InfoCircleOutlined />
              </Tooltip>
            }
            value={estimates.estimatedProfit}
            prefix="¥"
            precision={1}
            valueStyle={{
              color: estimates.estimatedProfit >= 0 ? '#3f8600' : '#cf1322',
              fontWeight: 'bold'
            }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={
              <Tooltip title="预估总利润 ÷ 预估总成本">
                预估利润率 (ROI) <InfoCircleOutlined />
              </Tooltip>
            }
            value={estimates.profitMargin}
            suffix="%"
            precision={1}
            valueStyle={{
              color: estimates.profitMargin >= 0 ? '#3f8600' : '#cf1322',
              fontWeight: 'bold'
            }}
          />
        </Col>
      </Row>
    </Card>

    <Form.Item label="备注" name="notes">
      <Input.TextArea rows={3} placeholder="备注信息..." />
    </Form.Item>
  </Form>;


  // 统一的关闭 Drawer
  const handleClose = () => {
    if (drawerProps.onClose) {
      (drawerProps as any).onClose();
    }
    formProps.form.resetFields();
  };

  const [submitLoading, setSubmitLoading] = useState(false);

  // 新建订单提交逻辑
  const handleCreateSubmit = async () => {
    setSubmitLoading(true);
    try {
      // 先触发 Ant Design 的基础表单校验 (必填项等)
      const values = await formProps.form.validateFields();
      // 校验：检查商品列表
      if (!values.selected_products || values.selected_products.length === 0) {
        openNotification?.({
          type: "error",
          message: "订单至少包含一个商品！",
        });
        return;
      }
      // 定金金额
      const depositAmount = values.status === 'paid_no_deposit' ? 0 : values.deposit_amount;
      // 订单数据 
      const orderData = {
        project_id: values.project_id,
        is_xianyu: values.is_xianyu,
        order_no: values.order_no || `ORD-${dayjs().format('YYYYMMDDHHmmss')}`,
        order_date: values.order_date.format('YYYY-MM-DD'),
        order_name: values.order_name,
        status: values.status,  // 订单状态
        amount_total: values.amount_total,  // 订单金额
        deposit_amount: depositAmount,  // 定金金额
        high_xianyu_fees: values.high_xianyu_fees || false,  // 高闲鱼手续费
        fee_amount: feeAmount || 0, // 闲鱼手续费
        exchange_rate: values.exchange_rate || 0, // 汇率
        cost_correction_name: values.cost_correction_name,  // 补正名称
        cost_correction: values.cost_correction || 0,  // 补正数额
        postage_amount: values.postage_amount || 0, // 邮费
        dorothy_receive: depositAmount,  // dorothy 已收款
        rico_receive: 0,  // rico 已收款
        notes: values.notes,
      };
      // 插入订单
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert(orderData)
        .select()
        .single();
      if (orderError) throw orderError;

      // 插入采购记录
      const procurementData = values.selected_products.map((item: any) => {
        const selectedProduct = productOptions.find((p: any) => p.id === item.product_id);
        const unitPrice = selectedProduct?.price_jpy || 0;
        return {
          order_id: order.id,  // 订单ID
          project_id: values.project_id,  // 项目ID
          product_id: item.product_id,  // 商品ID
          status: 'not_ordered',
          quantity_needed: item.quantity,  // 需采购数量
          procurement_amount: item.quantity * unitPrice,  // 采购金额
        }
      });

      const { error: procError } = await supabaseClient
        .from("procurements")
        .insert(procurementData);

      if (procError) throw procError;
      openNotification?.({
        type: "success",
        message: "订单新建成功",
      });
      await invalidate({
        resource: "orders",
        invalidates: ["list"], // 告诉 Refine 刷新列表页
      });
      formProps.form.resetFields();
      handleClose();
    } catch (error: any) {
      if (error?.errorFields) {
        openNotification?.({
          type: "error",
          message: "请检查表单必填项",
        });
      } else {
        openNotification?.({
          type: "error",
          message: "新建失败",
          description: error.message || "未知错误",
        });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // 修改订单 Drawer 的逻辑
  const formRef = formProps.form;
  const recordData = query?.data?.data;
  const orderId = recordData?.id;
  const isFetched = query?.isFetched; // 确保数据请求已完成

  useEffect(() => {
    if (type === 'create') {
      return;
    }
    if (isFetched && recordData && formRef) {
      if (submitLoading) return;
      const mappedProducts = recordData.procurements?.map((p: any) => ({
        product_id: p.product_id,
        quantity: p.quantity_needed
      })) || [];
      const orderDate = recordData.order_date ? dayjs(recordData.order_date) : dayjs();
      const highFees = recordData.high_xianyu_fees === true; // 强制转为 boolean
      const hasCorrection = !!(recordData.cost_correction && recordData.cost_correction !== 0);
      const formData = {
        ...recordData,               // 填入所有默认匹配的字段 (如 amount_total, status 等)
        project_id: recordData.project_id, // 显式填入
        order_no: recordData.order_no,
        is_xianyu: recordData.is_xianyu,
        order_date: orderDate,
        selected_products: mappedProducts, // 填入商品
        high_xianyu_fees: highFees,        // 填入费率
        has_correction: hasCorrection,
        cost_correction_name: recordData.cost_correction_name,
        cost_correction: recordData.cost_correction
      };
      setTimeout(() => {
        formRef.setFieldsValue(formData);
      }, 50);
    }
  }, [isFetched, recordData, formRef]);

  // 更新订单
  const handleUpdateSubmit = async () => {
    setSubmitLoading(true);
    try {
      const values = await formProps.form.validateFields();
      // 定金金额
      const depositAmount = values.status === 'paid_no_deposit' ? 0 : values.deposit_amount;
      // 订单更新数据
      const updateData = {
        order_date: values.order_date.format('YYYY-MM-DD'), // 订单日期
        order_name: values.order_name, // 订单名称
        status: values.status,  // 订单状态
        amount_total: values.amount_total,  // 订单金额
        deposit_amount: depositAmount,  // 定金金额
        high_xianyu_fees: values.high_xianyu_fees || false,  // 高闲鱼手续费
        fee_amount: feeAmount || 0, // 闲鱼手续费
        exchange_rate: values.exchange_rate || 0, // 汇率
        cost_correction_name: values.cost_correction_name,  // 补正名称
        cost_correction: values.cost_correction || 0,  // 补正数额
        postage_amount: values.postage_amount || 0, // 邮费
        notes: values.notes,
      };

      // 2. 更新订单主表
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update(updateData)
        .eq("id", orderId); // 使用当前记录ID

      if (updateError) throw updateError;

      openNotification?.({
        type: "success",
        message: "订单修改成功",
      });

      await invalidate({ resource: "orders", invalidates: ["resourceAll"] });
      handleClose();

    } catch (error: any) {
      openNotification?.({
        type: "error",
        message: "修改失败",
        description: error.message
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (type === 'create') {
    return <Drawer
      {...drawerProps}
      title="新建订单"
      width={800}
      maskClosable={false}
      footer={
        <div style={{ textAlign: "right" }}>
          <Button onClick={handleClose} style={{ marginRight: 8 }}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleCreateSubmit} loading={submitLoading}>
            新建订单
          </Button>
        </div>
      }
    >
      {form}
    </Drawer>
  } else if (type === 'edit') {
    return <Drawer
      {...drawerProps}
      title="修改订单"
      width={800}
      maskClosable={false}
      onClose={handleClose}
      destroyOnHidden={true}
      footer={
        <div style={{ textAlign: "right" }}>
          <Button onClick={handleClose} style={{ marginRight: 8 }}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleUpdateSubmit} loading={submitLoading}>保存修改</Button>
        </div>
      }
    >
      {form}
    </Drawer>
  };

  return null;
}
