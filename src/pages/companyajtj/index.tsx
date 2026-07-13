import { useEffect, useState } from "react";
import useTimer from "./useTimer";
import { useDebounce } from "@/hooks/useDebounce";
function companyajtj() {
  useEffect(() => {
    console.log("companyajtj");
  }, []);
  const count = useTimer(100);

  // 2. 定义输入框的实时状态
  const [inputValue, setInputValue] = useState("");
  // 3. 使用 useDebounce，设置延迟时间为 500ms
  const debouncedValue = useDebounce(inputValue, 1000);
  // 4. 监听防抖后的值，当用户停止输入 500ms 后，才会触发这里的逻辑
  useEffect(() => {
    if (debouncedValue) {
      console.log("用户停止输入，发起搜索请求:", debouncedValue);
      // 这里可以写 fetch/axios 请求逻辑
    }
  }, [debouncedValue]);
  return (
    <div>
      <p>{count}</p>
      <p>companyajtj</p>
      {/* 5. 渲染输入框，绑定实时状态 */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="请输入搜索内容"
        style={{ marginTop: "10px", padding: "5px" }}
      />

      {/* 展示防抖后的值，用于调试或展示 */}
      <p>防抖后的值: {debouncedValue || "暂无"}</p>
    </div>
  );
}

export default companyajtj;
