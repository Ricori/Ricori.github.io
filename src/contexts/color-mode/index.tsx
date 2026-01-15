import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  PropsWithChildren,
} from "react";
import { ConfigProvider, theme } from "antd";

type ColorModeContextType = {
  mode: "light" | "dark";
  setMode: (mode: "light" | "dark") => void;
  toggleTheme: () => void;
};

export const ColorModeContext = createContext<ColorModeContextType>(
  {} as ColorModeContextType
);

export const ColorModeContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  // 1. 从 localStorage 读取主题，默认为 'light'
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedMode = window.localStorage.getItem("colorMode");
    if (savedMode === "dark" || savedMode === "light") {
      setMode(savedMode);
    }
  }, []);

  // 2. 切换并保存到 localStorage
  const setColorMode = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    window.localStorage.setItem("colorMode", newMode);
  };

  const { darkAlgorithm, defaultAlgorithm } = theme;

  return (
    <ColorModeContext.Provider
      value={{
        setMode: setMode,
        mode: mode,
        toggleTheme: setColorMode,
      }}
    >
      {/* 3. 核心：通过 ConfigProvider 动态注入算法 */}
      <ConfigProvider
        theme={{
          // 根据 mode 切换算法
          algorithm: mode === "dark" ? darkAlgorithm : defaultAlgorithm,
          token: {
            // 这里可以自定义一些全局颜色，例如主色调
            // colorPrimary: '#1677ff', 

          }
        }}
      >
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
};

// 导出自定义 Hook 方便组件调用
export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  if (context === undefined) {
    throw new Error("useColorMode must be used within a ColorModeContextProvider");
  }
  return context;
};