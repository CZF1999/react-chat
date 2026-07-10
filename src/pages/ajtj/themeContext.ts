// src/pages/ajtj/themeContext.ts
import { createContext } from "react";

// 1. 定义一个接口，包含你需要传递的多个值
export interface ThemeContextType {
  theme: string;
  fontSize: number;
  primaryColor: string;
  // 可以继续添加其他需要的值...
}

// 2. 将接口作为泛型传入，并提供一个默认的初始值对象
export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  fontSize: 16,
  primaryColor: "#000000",
}); 