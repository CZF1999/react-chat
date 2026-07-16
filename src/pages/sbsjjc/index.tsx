import React, { useEffect } from "react";
import { useChatStore } from "@/store/useChatStore";
import SessionSidebar from "@/components/Chat/SessionSidebar";
import ChatPanel from "@/components/Chat/ChatPanel";
import "./index.css";

const Sbsjjc: React.FC = () => {
  const sessions = useChatStore((s) => s.sessions);
  const createSession = useChatStore((s) => s.createSession);

  // 初始化：如果没有会话，自动创建一个
  useEffect(() => {
    if (sessions.length === 0) {
      createSession("新对话");
    }
  }, [sessions.length, createSession]);

  return (
    <div className="sbsjjc-chat">
      <SessionSidebar />
      <ChatPanel />
    </div>
  );
};

export default Sbsjjc;
