import React, { useState, useCallback } from "react";
import type{ childInfo } from "@/type/layout";

interface ChildProps {
  text?: string;
  childInfo: childInfo;
  onSubmit: (number) => void;
}
// 使用 React.memo 优化的子组件
const Child = function Child({ text, onSubmit, childInfo }: ChildProps) {
  console.log("🔴 子组件渲染了");
  return (
    <div>
      <p>当前文本：{text}</p>
      <p>子组件信息：身高{childInfo.height}</p>
      <button onClick={() => onSubmit(6)}>提交</button>
    </div>
  );
};
export default React.memo(Child);
