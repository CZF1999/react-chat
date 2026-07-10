import React, {
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
} from "react";

function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");

  // 普通写法：每次 Parent 渲染，handleSubmit 都是新函数
  //   const handleSubmit = () => { console.log(text); };

  // 使用 useCallback：只有 text 变化时，才创建新函数
  const handleSubmit = useCallback(() => {
    console.log(text);
  }, [text]);
  useEffect(() => {
    console.log("我是异步effect");
    return () => {
      console.log("我是异步effect return");
    };
  }, [count]);
  useLayoutEffect(() => {
    console.log("我是同步layoutEffect");
    return () => {
      console.log("我是同步layoutEffect return");
    };
  }, [count]);
  const addNum = useCallback(() => {
    setCount((c) => c + 1);
  }, []);
  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
      <button onClick={() => addNum()}>Submit</button>
      <MemoChild onSubmit={handleSubmit} />
    </div>
  );
}
interface MemoChildProps {
  onSubmit: () => void;
}
const MemoChild = React.memo(function Child({ onSubmit }: MemoChildProps) {
  console.log("Child rendered");
  return <button onClick={onSubmit}>Submit</button>;
});

export default Parent;
