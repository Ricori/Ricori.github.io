import React, { useMemo, useEffect } from "react";
import { List, useTable, useDrawerForm, useSelect, } from "@refinedev/antd";
import { BaseRecord, HttpError, useGo } from "@refinedev/core";
import { Form, Input, Select, Table, Drawer, Button, InputNumber, Space, Card, Image, Tag, Typography, theme } from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined, FileImageOutlined, LinkOutlined, GlobalOutlined } from "@ant-design/icons";
import { debounce } from "lodash";

const { Link } = Typography;


interface IProduct extends BaseRecord {
  id: string;
  project_id: string;  // 归属项目ID
  name: string;        // 商品名称
  product_url: string; // 商品链接
  image_url: string;   // 图片链接
  price_jpy: number;   // 日元价格
  projects?: { name: string }; // 关联的项目对象
}


const ProductCreateDrawer = ({ drawerProps, formProps, saveButtonProps }: any) => {
  const { selectProps: projectSelectProps } = useSelect({
    resource: "projects",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <Drawer {...drawerProps} title="新建商品" width={500}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="归属项目" name="project_id" rules={[{ required: true }]}>
          <Select {...projectSelectProps} placeholder="选择项目" />
        </Form.Item>

        <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
          <Input placeholder="例如：绝望先生 吧唧SET" />
        </Form.Item>

        <Form.Item label="日元价格 (JPY)" name="price_jpy" initialValue={0} rules={[{ required: true }]}>
          <InputNumber
            style={{ width: "100%" }}
            prefix="¥"
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => v!.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>

        <Form.Item label="商品链接 URL" name="product_url">
          <Input prefix={<GlobalOutlined />} placeholder="https://..." />
        </Form.Item>

        <Form.Item label="图片链接 URL" name="image_url">
          <Input prefix={<FileImageOutlined />} placeholder="https://..." />
        </Form.Item>
      </Form>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <Button {...saveButtonProps} type="primary" icon={<PlusOutlined />}>立即创建</Button>
      </div>
    </Drawer>
  );
};


const ProductEditDrawer = ({ drawerProps, formProps, saveButtonProps }: any) => {
  const { selectProps: projectSelectProps } = useSelect({
    resource: "projects",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <Drawer {...drawerProps} title="编辑商品信息" width={500}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="商品ID" name="id"><Input disabled /></Form.Item>

        <Form.Item label="归属项目" name="project_id" rules={[{ required: true }]}>
          <Select {...projectSelectProps} />
        </Form.Item>

        <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label="日元价格 (JPY)" name="price_jpy" rules={[{ required: true }]}>
          <InputNumber
            style={{ width: "100%" }}
            prefix="¥"
          />
        </Form.Item>

        <Form.Item label="商品链接 URL" name="product_url">
          <Input prefix={<GlobalOutlined />} />
        </Form.Item>

        <Form.Item label="图片链接 URL" name="image_url">
          <Input prefix={<FileImageOutlined />} />
        </Form.Item>
      </Form>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <Button {...saveButtonProps} type="primary">保存修改</Button>
      </div>
    </Drawer>
  );
};


export const ProductList = () => {
  const { tableProps, searchFormProps } = useTable<IProduct, HttpError, { name: string; project_id: string }>({
    resource: "products",
    meta: {
      select: "*, projects(name)",
    },
    pagination: {
      pageSize: 10,
    },
    onSearch: (params) => {
      const filters = [];
      const { name, project_id } = params;
      filters.push({ field: "name", operator: "contains" as "contains", value: name });
      filters.push({ field: "project_id", operator: "eq" as "eq", value: project_id });
      return filters;
    },
    sorters: {
      initial: [{ field: "created_at", order: "asc" }],
    },
  });

  const { selectProps: projectSearchSelectProps } = useSelect({
    resource: "projects",
    optionLabel: "name",
    optionValue: "id",
  });

  const go = useGo();

  const {
    drawerProps: createDrawerProps,
    formProps: createFormProps,
    saveButtonProps: createSaveButtonProps,
    show: showCreateDrawer,
  } = useDrawerForm({ action: "create", resource: "products", redirect: false });

  const {
    drawerProps: editDrawerProps,
    formProps: editFormProps,
    saveButtonProps: editSaveButtonProps,
    show: showEditDrawer,
  } = useDrawerForm({ action: "edit", resource: "products", redirect: false });

  const debouncedSubmit = useMemo(() => {
    return debounce(() => {
      searchFormProps.form?.submit();
    }, 400);
  }, []);

  const { token } = theme.useToken();

  useEffect(() => {
    return () => debouncedSubmit.cancel();
  }, [debouncedSubmit]);


  return (
    <List
      title="商品管理"
      headerButtons={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showCreateDrawer()}>
          新建商品
        </Button>
      }
    >
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px' } }}>
        <Form
          {...searchFormProps}
          layout="inline"
          onValuesChange={(changedValues) => {
            if ('project_id' in changedValues) {
              setTimeout(() => searchFormProps.form?.submit(), 0);
            }
            if ('name' in changedValues) {
              debouncedSubmit();
            }
          }}
        >
          <Form.Item name="project_id">
            <Select
              {...projectSearchSelectProps}
              style={{ width: 200 }}
              placeholder="筛选归属项目"
              allowClear
            />
          </Form.Item>
          <Form.Item name="name">
            <Input
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              style={{ width: 360 }}
              placeholder="搜索商品名称"
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">搜索</Button>
          </Form.Item>
        </Form>
      </Card>


      <Table
        {...tableProps}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          ...tableProps.pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "15", "20", "50"],
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      >

        {/* 商品id */}
        <Table.Column dataIndex="id" title="商品ID" width={120} sorter />

        {/* 归属项目 */}
        <Table.Column
          dataIndex={["projects", "name"]}
          title="归属项目"
          sorter
          width={210}
          render={(val) => {
            if (!val) return '-';
            return (
              <Tag
                color="blue"
                style={{ cursor: "pointer" }}
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

        {/* 图片 */}
        <Table.Column
          dataIndex="image_url"
          title="商品图片"
          width={140}
          render={(val) => val ? <Image src={val} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-'}
        />

        {/* 商品名称 */}
        <Table.Column dataIndex="name" title="商品名称" sorter minWidth={200} />


        {/* 日元价格 */}
        <Table.Column
          dataIndex="price_jpy"
          title="日元价格"
          sorter
          width={150}
          render={(val) => <span>¥ {val?.toLocaleString()}</span>}
        />

        {/* 商品链接 */}
        <Table.Column
          dataIndex="product_url"
          title="商品来源"
          width={150}
          render={(url) => url ? (
            <Link href={url} target="_blank">
              <LinkOutlined /> 打开
            </Link>
          ) : '-'}
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

      <ProductCreateDrawer
        drawerProps={createDrawerProps}
        formProps={createFormProps}
        saveButtonProps={createSaveButtonProps}
      />
      <ProductEditDrawer
        drawerProps={editDrawerProps}
        formProps={editFormProps}
        saveButtonProps={editSaveButtonProps}
      />
    </List>
  );
};