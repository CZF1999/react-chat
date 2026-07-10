import React from "react";
import { useContext } from "react";
interface ChildProps {
  message: string;
  onSendData: (data: string) => void;
}
// 导入抽离的 Context
import { ThemeContext } from "./themeContext";
const ChildA = ({ message, onSendData }: ChildProps) => {
  // 解构获取 Context 中的多个值
  const { theme, fontSize, primaryColor } = useContext(ThemeContext);
  const changeMessage = (data: string) => {
    onSendData(data);
  };
  return (
    <div>
      <p>{message}</p>
      <button onClick={() => changeMessage("Hello from ChildA!")}>
        Send Data
      </button>
      <span>
        {theme}-{fontSize}-{primaryColor}
      </span>
    </div>
  );
};

export default React.memo(ChildA);
