import { useState, useRef } from "react";

function ControlledInput() {
  const inputRef = useRef(null);
  const uploadRef = useRef(null)
  const [value, setValue] = useState("");

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleSubmit = () => {
    alert("提交的名字：" + value + "-" + inputRef.current?.value);
  };
  const uploadChangeFile = () => {
    console.log(uploadRef.current.file)
  }
  return (
    <div>
      <input
        type="text"
        value={value} // 值由 state 决定
        onChange={handleChange} // 通过 onChange 修改 state
      />

      <input
        type="text"
        ref={inputRef}
        defaultValue="初始值" // 非受控用 defaultValue 设置初始值
      />

      <input
        type="file"
        ref={uploadRef}
        onChange={uploadChangeFile}
      />
      <p>当前输入：{value}</p>
      <button onClick={handleSubmit}>提交</button>
    </div>
  );
}

export default ControlledInput;
