import Parent from "./parent.tsx";
import { useState } from "react";
// 导入抽离的 Context
import { ThemeContext } from "./themeContext";
import useConfigStore from "@/store/useConfigStore";
function GrandParent() {
  const [theme, setTheme] = useState("light");
  const [fontSize] = useState(16);
  const [primaryColor] = useState("#1890ff");

  const { isTheme } = useConfigStore();

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };
  return (
    <ThemeContext.Provider value={{ theme, fontSize, primaryColor }}>
      <button onClick={toggleTheme}>切换主题</button>
      <span>{isTheme}</span>
      <Parent />
    </ThemeContext.Provider>
  );
}

export default GrandParent;
