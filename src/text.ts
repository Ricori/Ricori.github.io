// 订单状态
//   'unpaid',                 -- 买家未付款
//   'paid_has_deposit',       -- 买家已付款(有定金)
//   'paid_no_deposit',        -- 买家已付款(无定金)
//   'shipped',                -- 已发货给买家
//   'confirmed',              -- 买家已确认
//   'settled',                -- 款项已结算
//   'refund_pending',         -- 待退款
//   'partial_refund_pending', -- 待部分退款
//   'refunded'                -- 已退款


//项目状态：
// 'not_started', 'in_progress', 'completed'

  // -- 费用与手续费
  // has_fee boolean default false, -- 是否有手续费
  // fee_amount numeric default 0, -- 手续费金额 (建议加上这个字段，只有布尔值不够计算)
  
  // -- 金额与成本 (核心计算区)
  // amount_total numeric default 0, -- 订单销售金额(收入)
  
  // cost_jp numeric default 0, -- 货物日元总成本
  // exchange_rate numeric default 0.05, -- 汇率
  
  // -- 🔥 自动计算：人民币成本 = 日元成本 * 汇率
  // cost_cny numeric generated always as (cost_jp * exchange_rate) stored, 
  
  // cost_correction numeric default 0, -- 成本补正
  
  // postage 邮费
  // total_cost numeric generated always as ((cost_jp * exchange_rate) + cost_correction) stored,