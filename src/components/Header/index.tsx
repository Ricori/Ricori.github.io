import type { RefineThemedLayoutHeaderProps } from "@refinedev/antd";
import { useGetIdentity } from "@refinedev/core";
import { Avatar, Layout as AntdLayout, Space, theme, Typography, Switch, } from "antd";
import React from "react";
import ricoAvatar from "../../../public/rico_avatar.jpg";
import dorothyAvatar from "../../../public/dorothy_avatar.jpg";
import { useColorMode } from "../../contexts/color-mode";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { useToken } = theme;

type IUser = {
  id: number;
  name: string;
  avatar: string;
};

export const Header: React.FC<RefineThemedLayoutHeaderProps> = ({
  sticky = true,
}) => {
  const { token } = useToken();
  const { data: user } = useGetIdentity<IUser>();

  // 获取切换主题的方法
  const { mode, toggleTheme } = useColorMode();

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0px 24px",
    height: "64px",
    fontSize: "16px",
  };

  if (sticky) {
    headerStyles.position = "sticky";
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }

  const isRico = user?.name === 'takami2326@gmail.com' ? true : false;

  return (
    <AntdLayout.Header style={headerStyles}>
      <Switch
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        onChange={toggleTheme}
        checked={mode === "dark"}
      />
      <Space style={{ marginLeft: "24px" }}>
        {user?.name &&
          <Space size="small">
            <Avatar src={isRico ? ricoAvatar : dorothyAvatar} gap={0} size={30} style={{ marginTop: "-4px" }} />
            <Text strong style={{ fontSize: 16 }}>{isRico ? 'Rico' : 'Dorothy'}</Text>
          </Space>
        }
      </Space>
    </AntdLayout.Header>
  );
};
