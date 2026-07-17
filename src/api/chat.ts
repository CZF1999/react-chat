import type { ChatMessage, ChatSession } from "@/types/chat";

const API_BASE = "/api";

interface SessionRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  is_paused?: number;
  paused_message?: string | null;
  resume_event_count?: number | null;
}

interface MessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentBlocks?: ChatMessage["contentBlocks"];
  thinkingStages?: ChatMessage["thinkingStages"];
  createdAt: number;
}

// ==================== 会话 API ====================

/** 获取所有会话列表（不含消息） */
export async function fetchSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error("获取会话列表失败");
  const data = await res.json();
  return (data.sessions as SessionRow[]).map(
    (row): ChatSession => ({
      id: row.id,
      title: row.title,
      messages: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isStreaming: false,
      draftInput: "",
      isPaused: row.is_paused === 1,
      pausedMessage: row.paused_message || undefined,
      resumeEventCount: row.resume_event_count ?? undefined,
    }),
  );
}

/** 创建新会话 */
export async function createSessionAPI(
  id: string,
  title: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "创建失败" }));
    throw new Error(err.error || "创建会话失败");
  }
}

/** 删除会话 */
export async function deleteSessionAPI(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("删除会话失败");
}

/** 重命名会话 */
export async function renameSessionAPI(
  id: string,
  title: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("重命名失败");
}

// ==================== 消息 API ====================

/** 获取某会话的历史消息（分页） */
export async function fetchMessages(
  sessionId: string,
  pageNum = 1,
  pageSize = 10,
): Promise<{ messages: ChatMessage[]; total: number; hasMoreOlder: boolean }> {
  const params = new URLSearchParams({
    pageNum: String(pageNum),
    pageSize: String(pageSize),
  });
  const res = await fetch(
    `${API_BASE}/sessions/${sessionId}/messages?${params}`,
  );
  if (!res.ok) throw new Error("获取历史消息失败");
  const data = await res.json();
  const messages = (data.messages as MessageRow[]).map(
    (row): ChatMessage => ({
      id: row.id,
      role: row.role,
      content: row.content,
      contentBlocks: row.contentBlocks,
      thinkingStages: row.thinkingStages,
      createdAt: row.createdAt,
      isStreaming: false,
    }),
  );
  const total: number = data.total ?? messages.length;
  return {
    messages,
    total,
    hasMoreOlder: pageNum * pageSize < total,
  };
}

/** 更新会话暂停状态 */
export async function updatePauseStateAPI(
  sessionId: string,
  state: { isPaused: boolean; pausedMessage?: string | null; resumeEventCount?: number | null },
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/pause`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error("更新暂停状态失败");
}

/** 批量保存消息（覆盖该会话的所有消息） */
export async function saveMessagesAPI(
  sessionId: string,
  messages: ChatMessage[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("保存消息失败");
}
