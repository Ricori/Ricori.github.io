import {
  Refine,
  Authenticated,
  I18nProvider
} from "@refinedev/core";

import {
  AuthPage,
  ErrorComponent,
  useNotificationProvider,
  ThemedLayout,
  ThemedSider,
} from "@refinedev/antd";

import {
  ProjectOutlined,
  DatabaseOutlined,
  ProductOutlined,
  HomeOutlined,
  SolutionOutlined
} from "@ant-design/icons";

import "@refinedev/antd/dist/reset.css";

import { useTranslation } from "react-i18next";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { App as AntdApp, ConfigProvider } from "antd";
import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
} from "@refinedev/react-router";

import { AppIcon } from "./components/AppIcon";
import { supabaseClient } from "./util/supabaseClient";

import { Header } from "./components/Header";
import authProvider from "./components/AuthProvider";

import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import "./i18n";
import { ProjectList } from "./pages/projects";
import { ProductList } from "./pages/products";
import { OrderList } from "./pages/orders";
import { ProcurementList } from "./pages/procurements";
import { DashboardPage } from "./pages/dashboard";
import { ColorModeContextProvider, useColorMode } from "./contexts/color-mode";
function App() {

  const { t: trans, i18n } = useTranslation();
  const i18nProvider: I18nProvider = {
    translate: (key: string, options?: any) => {
      const result = trans(key, options);
      if (typeof result === 'string') {
        return result;
      } else {
        return String(result);
      }
    },
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  };

  return (
    <BrowserRouter>
      <ColorModeContextProvider>
        <AntdApp>
          <ConfigProvider locale={zhCN}>
            <Refine
              i18nProvider={i18nProvider}
              dataProvider={dataProvider(supabaseClient)}
              liveProvider={liveProvider(supabaseClient)}
              authProvider={authProvider}
              routerProvider={routerProvider}
              notificationProvider={useNotificationProvider}
              resources={[
                {
                  name: "home",
                  list: "/dashboard",
                  meta: {
                    label: "主页",
                    icon: <HomeOutlined />
                  },
                },
                {
                  name: "projects",
                  list: "/projects",
                  meta: {
                    label: "项目管理",
                    icon: <ProjectOutlined />
                  },
                },
                {
                  name: "products",
                  list: "/products",
                  meta: {
                    label: "商品管理",
                    icon: <ProductOutlined />
                  },
                },
                {
                  name: "orders",
                  list: "/orders",
                  meta: {
                    label: "订单管理",
                    icon: <DatabaseOutlined />
                  },
                },
                {
                  name: "procurements",
                  list: "/procurements",
                  meta: {
                    label: "采购管理",
                    icon: <SolutionOutlined />
                  },
                },

              ]}
              options={{
                syncWithLocation: true,
                title: { text: <div style={{ fontSize: 16 }}>青森国贸</div>, icon: <AppIcon /> },
              }}
            >
              <Routes>
                <Route
                  element={
                    <Authenticated
                      key="authenticated-inner"
                      fallback={<CatchAllNavigate to="/login" />}
                    >
                      <ThemedLayout
                        Header={Header}
                        Sider={(props) => <ThemedSider {...props} fixed />}
                      >
                        <Outlet />
                      </ThemedLayout>
                    </Authenticated>
                  }
                >
                  <Route
                    index
                    element={<NavigateToResource resource="home" />}
                  />
                  <Route path="/dashboard">
                    <Route index element={<DashboardPage />} />
                  </Route>
                  <Route path="/projects">
                    <Route index element={<ProjectList />} />
                  </Route>
                  <Route path="/products">
                    <Route index element={<ProductList />} />
                  </Route>
                  <Route path="/orders">
                    <Route index element={<OrderList />} />
                  </Route>
                  <Route path="/procurements">
                    <Route index element={<ProcurementList />} />
                  </Route>
                  <Route path="*" element={<ErrorComponent />} />
                </Route>


                <Route
                  element={
                    <Authenticated
                      key="authenticated-outer"
                      fallback={<Outlet />}
                    >
                      <NavigateToResource />
                    </Authenticated>
                  }
                >
                  <Route
                    path="/login"
                    element={
                      <AuthPage
                        type="login"
                        forgotPasswordLink={false}
                        registerLink={false}
                      />
                    }
                  />
                </Route>

              </Routes>
            </Refine>
          </ConfigProvider>
        </AntdApp>
      </ColorModeContextProvider>
    </BrowserRouter >
  );
}

export default App;
