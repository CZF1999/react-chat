import React, { useCallback, useEffect, useState } from "react";
import useBaseConfigStore from "@/store/useBaseConfig";
import { useDispatch, useSelector } from "react-redux";
import { getUserInfoByToken } from "@/store/modules/userSlice";
import type { UserInfo } from "@/type/layout";
// 假设你配置了 RootState 类型
import type { RootState, AppDispatch } from "@/store";
// 自定义 Hook：里面使用 useCallback
function useAutoSave(data, delay) {
  const save = useCallback(() => {
    console.log("保存数据：", data);
  }, [data]); // data 变化时，save 函数也变

  // useEffect(() => {
  //   const timer = setTimeout(save, delay);
  //   console.log("timer", timer);
  //   return () => clearTimeout(timer);
  // }, [save, delay]);

  return { save };
}

interface Props {
  onClick: () => void;
  children: React.ReactNode;
}
// 组件：使用 useCallback，并用 React.memo 包裹子组件
const Button = React.memo(function Button({ onClick, children }: Props) {
  console.log("Button render");
  return <button onClick={onClick}>{children}</button>;
});

function Editor() {
  const [text, setText] = useState("");
  const { save } = useAutoSave(text, 3000);
  const [buttonText, setButtonText] = useState("手动保存");
  const { location, setLocation } = useBaseConfigStore();
  const dispatch = useDispatch<AppDispatch>();
  const { token, userInfo, status, error } = useSelector(
    (state: RootState) => state.user,
  );
  useEffect(() => {
    dispatch(getUserInfoByToken({ token: token }));
  }, [token, dispatch]);
  // 手动保存按钮的回调：用 useCallback 稳定引用
  const handleManualSave = useCallback(() => {
    save();
    alert("已保存");
    setLocation("编辑器");
  }, [save]); // save 来自自定义 Hook，依赖稳定时不会导致 Button 重渲染
  // 根据 status 渲染不同的 UI
  if (status === "loading") return <div>加载中...</div>;
  if (status === "failed") return <div>错误: {error}</div>;
  return (
    <div>
      <h1>
        {location}-{token}-{userInfo?.bmdm}
      </h1>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <Button onClick={handleManualSave}>{buttonText}</Button>
      <button onClick={() => setButtonText("保存中...")}>保存</button>
    </div>
  );
}

export default Editor;
