import ChildA from "./childA.tsx";
import ChildB from "./childB.tsx";
import { useState } from "react";
function Parent() {
  const [message, setMessage] = useState("Hello from parent");
  const handleData = (data: string) => {
    setMessage(data);
  };
  return (
    <div>
      <h1>Parent Component</h1>
      <span>{message}</span>
      <h1>Child Component</h1>
      <ChildA message={message} onSendData={handleData} />
      <ChildB message={message} onSendData={handleData}/>
    </div>
  );
}

export default Parent;