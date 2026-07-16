import React, { useEffect, useRef } from "react";
import { useChatStore } from "@/store/useChatStore";
import SessionSidebar from "@/components/Chat/SessionSidebar";
import ChatPanel from "@/components/Chat/ChatPanel";
import "./index.css";

const Sbsjjc: React.FC = () => {
  const sessions = useChatStore((s) => s.sessions);
  const initStore = useChatStore((s) => s.initStore);
  const initializedRef = useRef(false);

  useEffect(() => {
    // 只初始化一次（防止 StrictMode 重复调用）
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (sessions.length === 0) {
      initStore();
    }
  }, [sessions.length, initStore]);

  return (
    <div className="sbsjjc-chat">
      <SessionSidebar />
      <ChatPanel />
    </div>
  );
};

export default Sbsjjc;
