import React from "react";
interface ChildProps {
  message: string;
  onSendData: (data: string) => void;
}
const ChildB = ({ message, onSendData }: ChildProps) => {
  const changeMessage = (data: string) => {
    onSendData(data);
  };
  return (
    <div>
      <p>{message}</p>
      <button onClick={() => changeMessage("Hello from ChildB!")}>
        Send Data
      </button>
    </div>
  );
};

export default React.memo(ChildB);
