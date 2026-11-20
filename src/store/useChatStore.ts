import { create } from "zustand";
import type {
  ChatMessage,
  ChatSession,
  MessageContent,
  ThinkingStage,
  TextContent,
  TableContent,
  ChartContent,
  SSEDataChunkData,
} from "@/types/chat";
import {
  API_BASE,
  fetchSessions,
  createSessionAPI,
  deleteSessionAPI,
  renameSessionAPI,
  fetchMessages,
  saveMessagesAPI,
  updatePauseStateAPI,
} from "@/api/chat";
import { devtools } from 'zustand/middleware';
// ==================== 模块级闭包（不可序列化） ====================

/** 发给 DeepSeek 的多轮历史条数上限（不含当前 user 消息） */
const CHAT_HISTORY_LIMIT = 20;

type ChatHistoryItem = { role: "user" | "assistant"; content: string };

/** 从会话已有消息提取纯文本历史（排除空内容 / 流式占位） */
function buildChatHistory(messages: ChatMessage[]): ChatHistoryItem[] {
  return messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        Boolean(m.content?.trim()) &&
        !m.isStreaming,
    )
    .slice(-CHAT_HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content.trim() }));
}

/** 每个会话独立的 AbortController，支持多 SSE 连接并发 */
const abortControllers = new Map<string, AbortController>();

/** 暂停时保存已消费的 SSE 事件数，用于继续回复时跳过 */
const resumeEventCounts = new Map<string, number>();

/** 当前流式会话的实时事件计数（由 throttledFlush 更新，pauseStreaming 读取） */
const streamEventCounts = new Map<string, number>();

let idCounter = 0;
const generateId = (prefix: string) => `${prefix}_${++idCounter}_${Date.now()}`;

// ==================== Store 类型 ====================

interface ChatStoreState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  /** 是否正在从后端加载历史消息 */
  isLoadingMessages: boolean;

  // ---- 派生 ----
  getActiveSession: () => ChatSession | undefined;
  getSession: (id: string) => ChatSession | undefined;

  // ---- 初始化 ----
  initStore: () => Promise<void>;

  // ---- 会话 CRUD ----
  createSession: (title?: string) => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  setActiveSession: (id: string) => void;

  // ---- 输入草稿 ----
  setDraftInput: (sessionId: string, value: string) => void;

  // ---- 消息操作 ----
  loadMessages: (sessionId: string) => Promise<void>;
  /** 加载更早的历史消息（分页），返回实际新增条数（0 表示无更多） */
  loadMoreMessages: (sessionId: string) => Promise<number>;
  flushMessages: (
    sessionId: string,
    localId: string,
    contentBlocks: MessageContent[],
    thinkingStages: ThinkingStage[],
    isStreaming: boolean,
  ) => void;
  /** 将内存中的消息持久化到后端 */
  persistMessages: (sessionId: string) => Promise<void>;

  // ---- 流式控制 ----
  sendMessage: (sessionId: string, content: string) => Promise<void>;
  /** 暂停流式输出（保留部分回复，可继续） */
  pauseStreaming: (sessionId: string) => void;
  /** 继续被暂停的流式输出 */
  resumeStreaming: (sessionId: string) => Promise<void>;
  stopStreaming: (sessionId: string) => void;
  stopAllStreaming: () => void;
}

// ==================== Store 实现 ====================

export const useChatStore = create<ChatStoreState>()(devtools((set, get) => ({

  sessions: [],  // 所有会话
  activeSessionId: null,  // 当前活跃会话指针
  isLoadingMessages: false,  // 是否正在加载历史消息

  // ---- 派生 ----

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    return sessions.find((s) => s.id === activeSessionId);
  },

  getSession: (id: string) => {
    return get().sessions.find((s) => s.id === id);
  },

  // ---- 初始化 ----

  initStore: async () => {
    try {
      const sessions = await fetchSessions();
      if (sessions.length > 0) {
        set({
          sessions,
          activeSessionId: sessions[0].id,
        });
      } else {
        // 后端无会话，创建一个
        await get().createSession("新对话");
      }
    } catch (err) {
      console.error("[store] 初始化失败，使用本地模式:", err);
      // 降级：如果加载失败，本地创建一个会话
      if (get().sessions.length === 0) {
        const id = generateId("session");
        const now = Date.now();
        set({
          sessions: [
            {
              id,
              title: "新对话",
              messages: [],
              createdAt: now,
              updatedAt: now,
              isStreaming: false,
              draftInput: "",
            },
          ],
          activeSessionId: id,
        });
      }
    }
  },

  // ---- 加载历史消息 ----

  loadMessages: async (sessionId: string) => {
    set({ isLoadingMessages: true });
    try {
      const { messages, hasMoreOlder } = await fetchMessages(sessionId);
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, messages, hasMoreOlder } : s,
        ),
      }));
    } catch (err) {
      console.error("[store] 加载历史消息失败:", err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  // ---- 加载更早的历史消息（分页） ----

  loadMoreMessages: async (sessionId: string) => {
    const session = get().getSession(sessionId);
    if (!session || session.isLoadingOlder || !session.hasMoreOlder) return 0;

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, isLoadingOlder: true } : s,
      ),
    }));

    try {
      const pageNum = Math.floor(session.messages.length / 10) + 1;
      const { messages, hasMoreOlder } = await fetchMessages(
        sessionId,
        pageNum,
        10,
      );
      let addedCount = 0;
      set((state) => ({
        sessions: state.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          const existingIds = new Set(s.messages.map((m) => m.id));
          const uniqueOlder = messages.filter((m) => !existingIds.has(m.id));
          addedCount = uniqueOlder.length;
          return {
            ...s,
            messages: [...uniqueOlder, ...s.messages],
            hasMoreOlder,
            isLoadingOlder: false,
          };
        }),
      }));
      return addedCount;
    } catch (err) {
      console.error("[store] 加载更早消息失败:", err);
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, isLoadingOlder: false } : s,
        ),
      }));
      return 0;
    }
  },

  // ---- 持久化消息 ----

  persistMessages: async (sessionId: string) => {
    const session = get().getSession(sessionId);
    if (!session || session.messages.length === 0) return;

    try {
      await saveMessagesAPI(sessionId, session.messages);
    } catch (err) {
      console.error("[store] 持久化消息失败:", err);
    }
  },

  // ---- 会话 CRUD ----

  createSession: async (title?: string) => {
    const id = generateId("session");
    const now = Date.now();
    const sessionTitle = title || "新对话";

    // 先尝试持久化到后端
    try {
      await createSessionAPI(id, sessionTitle);
    } catch (err) {
      console.error("[store] 创建会话 API 失败，仅本地创建:", err);
    }

    const newSession: ChatSession = {
      id,
      title: sessionTitle,
      messages: [],
      createdAt: now,
      updatedAt: now,
      isStreaming: false,
      draftInput: "",
    };
    set((state) => ({
      sessions: [...state.sessions, newSession],
      activeSessionId: id,
    }));
    return id;
  },

  deleteSession: async (id: string) => {
    // 先终止 SSE 连接
    const ctrl = abortControllers.get(id);
    if (ctrl) {
      ctrl.abort();
      abortControllers.delete(id);
    }

    // 从后端删除
    try {
      await deleteSessionAPI(id);
    } catch (err) {
      console.error("[store] 删除会话 API 失败:", err);
    }

    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      let nextActive = state.activeSessionId;
      if (state.activeSessionId === id) {
        nextActive = filtered.length > 0 ? filtered[0].id : null;
      }
      return { sessions: filtered, activeSessionId: nextActive };
    });
  },

  renameSession: async (id: string, title: string) => {
    // 先更新本地（乐观更新）
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, title, updatedAt: Date.now() } : s,
      ),
    }));

    // 再同步到后端
    try {
      await renameSessionAPI(id, title);
    } catch (err) {
      console.error("[store] 重命名 API 失败:", err);
    }
  },

  setActiveSession: (id: string) => {
    set({ activeSessionId: id });

    // 如果切换到的会话还没有消息，尝试从后端加载历史
    const session = get().getSession(id);
    if (session && session.messages.length === 0 && !session.isStreaming) {
      get().loadMessages(id);
    }
  },

  // ---- 输入草稿 ----
  setDraftInput: (sessionId: string, value: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, draftInput: value } : s,
      ),
    }));
  },

  // ---- 消息操作 ----

  flushMessages: (
    sessionId: string,
    localId: string,
    contentBlocks: MessageContent[],
    thinkingStages: ThinkingStage[],
    isStreaming: boolean,
  ) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;

        const { messages } = s;
        const lastIdx = messages.length - 1;
        const targetMsg = messages[lastIdx];

        // 快速路径：assistant 消息保证是最后一条（sendMessage 保证）
        if (targetMsg && targetMsg.id === localId && targetMsg.role === "assistant") {
          const updatedMessages = [...messages];
          updatedMessages[lastIdx] = {
            ...targetMsg,
            contentBlocks: [...contentBlocks],
            thinkingStages: [...thinkingStages],
            content: contentBlocks
              .filter((b): b is TextContent => b.type === "text")
              .map((b) => b.text)
              .join(""),
            isStreaming,
          };
          return {
            ...s,
            messages: updatedMessages,
            isStreaming,
            updatedAt: Date.now(),
          };
        }

        // 安全带：若不变式被破坏（极端情况），回退到 findIndex 扫描
        const idx = messages.findIndex((m) => m.id === localId);
        if (idx === -1) return s;
        const updatedMessages = [...messages];
        updatedMessages[idx] = {
          ...updatedMessages[idx],
          contentBlocks: [...contentBlocks],
          thinkingStages: [...thinkingStages],
          content: contentBlocks
            .filter((b): b is TextContent => b.type === "text")
            .map((b) => b.text)
            .join(""),
          isStreaming,
        };
        return {
          ...s,
          messages: updatedMessages,
          isStreaming,
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  // ---- 流式控制 ----
  sendMessage: async (sessionId: string, content: string) => {
    const session = get().getSession(sessionId);
    if (!session) return;
    if (!content.trim()) return;

    const localId = generateId("msg");
    // 在写入本轮 user/assistant 之前截取历史，供 DeepSeek 多轮
    const history = buildChatHistory(session.messages);

    // Step 1: 添加用户消息 + AI 占位消息
    const userMsg: ChatMessage = {
      id: generateId("msg"),
      role: "user",
      content,
      createdAt: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: localId,
      role: "assistant",
      content: "",
      contentBlocks: [],
      thinkingStages: [],
      isStreaming: true,
      createdAt: Date.now(),
    };

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: [...s.messages, userMsg, assistantMsg],
          isStreaming: true,
          updatedAt: Date.now(),
        };
      }),
    }));

    // Step 2: SSE 流式请求（支持断线重连，最多 3 次）
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 2000, 4000];

    // 追踪当前流式状态（在重试循环外声明，保留最终状态）
    const contentBlocks: MessageContent[] = [];
    const thinkingStages: ThinkingStage[] = [];
    let pendingLoadingBlock: {
      type: "table" | "chart";
      message: string;
    } | null = null;
    let lastFlushTime = 0;
    let pendingFlush = false;
    const blockIdMap = new Map<string, number>();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // ---- 重试：重置局部状态 ----
      if (attempt > 0) {
        contentBlocks.length = 0;
        thinkingStages.length = 0;
        pendingLoadingBlock = null;
        blockIdMap.clear();
        lastFlushTime = 0;
        pendingFlush = false;

        contentBlocks.push({
          type: "text",
          text: `\n\n🔄 连接断开，正在重连...（${attempt}/${MAX_RETRIES}）\n\n`,
        });

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, isReconnecting: true } : s,
          ),
        }));
        get().flushMessages(sessionId, localId, contentBlocks, thinkingStages, true);

        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, isReconnecting: false } : s,
          ),
        }));
      }

      // ---- 创建独立的 AbortController ----
      const controller = new AbortController();
      abortControllers.set(sessionId, controller);

      // ---- 节流状态 ----
      const FLUSH_INTERVAL_MS = 33;

      const throttledFlush = () => {
        const now = Date.now();
        if (now - lastFlushTime >= FLUSH_INTERVAL_MS) {
          lastFlushTime = now;
          get().flushMessages(sessionId, localId, contentBlocks, thinkingStages, true);
          pendingFlush = false;
        } else {
          pendingFlush = true;
        }
      };


      const handleDataChunk = (chunk: SSEDataChunkData) => {
        if (pendingLoadingBlock) pendingLoadingBlock = null;

        if (chunk.chunkType === "table") {
          if (chunk.index === 0) {
            const idx = contentBlocks.length;
            blockIdMap.set(chunk.blockId, idx);
            contentBlocks.push({
              type: "table",
              columns: chunk.columns!,
              data: chunk.rows || [],
              title: chunk.title,
            } as TableContent);
          } else {
            const idx = blockIdMap.get(chunk.blockId);
            if (idx === undefined) return;
            const block = contentBlocks[idx] as TableContent;
            contentBlocks[idx] = {
              ...block,
              data: [...block.data, ...(chunk.rows || [])],
            } as TableContent;
          }
        } else if (chunk.chunkType === "chart") {
          if (chunk.index === 0) {
            const baseConfig =
              chunk.config ||
              (chunk.xAxisData
                ? {
                  xAxis: { type: "category", data: chunk.xAxisData },
                  series: chunk.series || [],
                }
                : { series: chunk.series || [] });
            const idx = contentBlocks.length;
            blockIdMap.set(chunk.blockId, idx);
            contentBlocks.push({
              type: "chart",
              chartType: chunk.chartType!,
              title: chunk.title,
              config: baseConfig,
            } as ChartContent);
          } else {
            const idx = blockIdMap.get(chunk.blockId);
            if (idx === undefined) return;
            const existing = contentBlocks[idx] as ChartContent;
            const newSeries = [
              ...(existing.config.series || []),
              ...(chunk.series || []),
            ];
            const newXAxis = chunk.xAxisData
              ? {
                ...(existing.config.xAxis || {}),
                data: [
                  ...((existing.config.xAxis as any)?.data || []),
                  ...chunk.xAxisData,
                ],
              }
              : existing.config.xAxis;
            contentBlocks[idx] = {
              ...existing,
              config: { ...existing.config, xAxis: newXAxis, series: newSeries },
            } as ChartContent;
          }
        }
      };

      // ---- SSE 读取循环 ----
      let sseEventCount = 0;
      try {
        const response = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, sessionId, history }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error("不支持 ReadableStream");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let lineBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          lineBuffer += chunk;

          const events = lineBuffer.split("\n\n");
          lineBuffer = events.pop() || "";

          let hasUpdates = false;

          for (const rawEvent of events) {
            for (const line of rawEvent.split("\n")) {
              if (!line.startsWith("data: ")) continue;

              const payload = line.slice(6);
              if (payload === "[DONE]") continue;

              try {
                const event = JSON.parse(payload) as {
                  type: string;
                  data: any;
                };

                switch (event.type) {
                  case "thinking": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    thinkingStages.push({
                      type: event.data.stage,
                      message: event.data.message,
                      timestamp: Date.now(),
                    });
                    hasUpdates = true;
                    break;
                  }

                  case "text": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    const textContent = event.data.content as string;
                    const lastBlock = contentBlocks[contentBlocks.length - 1];
                    if (lastBlock && lastBlock.type === "text") {
                      contentBlocks[contentBlocks.length - 1] = {
                        type: "text",
                        text: (lastBlock as TextContent).text + textContent,
                      };
                    } else {
                      contentBlocks.push({ type: "text", text: textContent });
                    }
                    hasUpdates = true;
                    break;
                  }

                  case "table_loading": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    pendingLoadingBlock = {
                      type: "table",
                      message: event.data.message,
                    };
                    hasUpdates = true;
                    break;
                  }

                  case "table_data": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    handleDataChunk({
                      chunkType: "table",
                      blockId: `table_${generateId("blk")}`,
                      index: 0,
                      columns: event.data.columns,
                      rows: event.data.data,
                      title: event.data.title,
                    });
                    hasUpdates = true;
                    break;
                  }

                  case "chart_loading": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    pendingLoadingBlock = {
                      type: "chart",
                      message: event.data.message,
                    };
                    hasUpdates = true;
                    break;
                  }

                  case "chart_data": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    handleDataChunk({
                      chunkType: "chart",
                      blockId: `chart_${generateId("blk")}`,
                      index: 0,
                      chartType: event.data.chartType,
                      config: event.data.config,
                      title: event.data.title,
                    });
                    hasUpdates = true;
                    break;
                  }

                  case "data_chunk": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    handleDataChunk(event.data as SSEDataChunkData);
                    hasUpdates = true;
                    break;
                  }

                  case "done": {
                    sseEventCount++;
                    streamEventCounts.set(sessionId, sseEventCount);
                    break;
                  }
                }
              } catch {
                contentBlocks.push({ type: "text", text: payload });
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates) {
            throttledFlush();
          }
        }

        // 处理缓冲区中的最后一段
        if (lineBuffer.trim()) {
          for (const line of lineBuffer.split("\n")) {
            if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
              const payload = line.slice(6);
              try {
                const event = JSON.parse(payload);
                if (event.type === "text") {
                  const lastBlock = contentBlocks[contentBlocks.length - 1];
                  if (lastBlock && lastBlock.type === "text") {
                    contentBlocks[contentBlocks.length - 1] = {
                      type: "text",
                      text: (lastBlock as TextContent).text + event.data.content,
                    };
                  } else {
                    contentBlocks.push({ type: "text", text: event.data.content });
                  }
                }
              } catch {
                contentBlocks.push({ type: "text", text: payload });
              }
            }
          }
        }

        // 排空节流中积压的最后一次刷新
        if (pendingFlush) {
          get().flushMessages(sessionId, localId, contentBlocks, thinkingStages, true);
        }

        // 成功：退出重试循环
        break;
      } catch (err: any) {
        // 用户主动停止：立即退出
        if (err.name === "AbortError") {
          break;
        }

        // 最后一次尝试失败：写入错误提示
        if (attempt === MAX_RETRIES) {
          const errMsg = err instanceof Error ? err.message : String(err);
          contentBlocks.push({
            type: "text",
            text: `\n\n❌ 重连失败（已尝试 ${MAX_RETRIES + 1} 次）：${errMsg}`,
          });
        }
        // 否则继续下一次重试
      } finally {
        abortControllers.delete(sessionId);
      }
    }

    // ---- 最终清理（重试循环结束后执行） ----
    const stillExists = get().getSession(sessionId);
    if (stillExists) {
      get().flushMessages(sessionId, localId, contentBlocks, thinkingStages, false);
      get().persistMessages(sessionId);
    }
  },

  pauseStreaming: (sessionId: string) => {
    const session = get().getSession(sessionId);
    const ctrl = abortControllers.get(sessionId);
    if (ctrl) {
      // 保存当前事件计数
      const count = streamEventCounts.get(sessionId) || 0;
      resumeEventCounts.set(sessionId, count);
      streamEventCounts.delete(sessionId);

      ctrl.abort();
      abortControllers.delete(sessionId);
    }

    // 找到触发流式的用户消息
    const userMsg = session?.messages.find((m) => m.role === "user" && m.content);
    const pausedMessage = userMsg?.content;

    // 标记为暂停状态
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, isStreaming: false, isPaused: true, pausedMessage }
          : s,
      ),
    }));

    // 持久化：保存部分消息 + 暂停状态到后端
    const count = resumeEventCounts.get(sessionId);
    get().persistMessages(sessionId);
    updatePauseStateAPI(sessionId, {
      isPaused: true,
      pausedMessage: pausedMessage || null,
      resumeEventCount: count ?? null,
    }).catch((err) => console.error("[store] 持久化暂停状态失败:", err));
  },

  resumeStreaming: async (sessionId: string) => {
    const session = get().getSession(sessionId);
    if (!session || !session.isPaused) return;

    const lastMsg = session.messages[session.messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;

    const localId = lastMsg.id;
    const message = session.pausedMessage;
    if (!message) return;

    // 恢复已接收的内容状态
    const contentBlocks: MessageContent[] = lastMsg.contentBlocks
      ? [...lastMsg.contentBlocks]
      : [];
    const thinkingStages = lastMsg.thinkingStages
      ? [...lastMsg.thinkingStages]
      : [];
    // 优先用内存中的计数，其次用 session 上恢复的（刷新后场景）
    const resumeFrom =
      resumeEventCounts.get(sessionId) || session.resumeEventCount || 0;
    resumeEventCounts.delete(sessionId);
    streamEventCounts.delete(sessionId);

    // 标记为继续中，清除后端暂停状态
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, isStreaming: true, isPaused: false, isReconnecting: false }
          : s,
      ),
    }));
    updatePauseStateAPI(sessionId, {
      isPaused: false,
      pausedMessage: null,
      resumeEventCount: null,
    }).catch((err) => console.error("[store] 清除暂停状态失败:", err));

    // 创建独立的 AbortController
    const controller = new AbortController();
    abortControllers.set(sessionId, controller);

    let lastFlushTime = 0;
    const FLUSH_INTERVAL_MS = 33;
    let pendingFlush = false;

    const throttledFlush = () => {
      const now = Date.now();
      if (now - lastFlushTime >= FLUSH_INTERVAL_MS) {
        lastFlushTime = now;
        get().flushMessages(sessionId, localId, contentBlocks, thinkingStages, true);
        pendingFlush = false;
      } else {
        pendingFlush = true;
      }
    };

    const blockIdMap = new Map<string, number>();
    // 从已有 contentBlocks 重建 blockIdMap
    for (let i = 0; i < contentBlocks.length; i++) {
      const b = contentBlocks[i];
      if (b.type === "table") {
        blockIdMap.set(`resume_table_${i}`, i);
      } else if (b.type === "chart") {
        blockIdMap.set(`resume_chart_${i}`, i);
      }
    }

    const handleDataChunk = (chunk: SSEDataChunkData) => {
      if (chunk.chunkType === "table") {
        if (chunk.index === 0) {
          const idx = contentBlocks.length;
          blockIdMap.set(chunk.blockId, idx);
          contentBlocks.push({
            type: "table", columns: chunk.columns!,
            data: chunk.rows || [], title: chunk.title,
          } as TableContent);
        } else {
          const idx = blockIdMap.get(chunk.blockId);
          if (idx === undefined) return;
          const block = contentBlocks[idx] as TableContent;
          contentBlocks[idx] = {
            ...block,
            data: [...block.data, ...(chunk.rows || [])],
          } as TableContent;
        }
      } else if (chunk.chunkType === "chart") {
        if (chunk.index === 0) {
          const baseConfig = chunk.config ||
            (chunk.xAxisData
              ? { xAxis: { type: "category", data: chunk.xAxisData }, series: chunk.series || [] }
              : { series: chunk.series || [] });
          const idx = contentBlocks.length;
          blockIdMap.set(chunk.blockId, idx);
          contentBlocks.push({
            type: "chart", chartType: chunk.chartType!,
            title: chunk.title, config: baseConfig,
          } as ChartContent);
        } else {
          const idx = blockIdMap.get(chunk.blockId);
          if (idx === undefined) return;
          const existing = contentBlocks[idx] as ChartContent;
          const newSeries = [...(existing.config.series || []), ...(chunk.series || [])];
          const newXAxis = chunk.xAxisData
            ? { ...(existing.config.xAxis || {}), data: [...((existing.config.xAxis as any)?.data || []), ...chunk.xAxisData] }
            : existing.config.xAxis;
          contentBlocks[idx] = {
            ...existing,
            config: { ...existing.config, xAxis: newXAxis, series: newSeries },
          } as ChartContent;
        }
      }
    };

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId, resumeFrom }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("不支持 ReadableStream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;

        const events = lineBuffer.split("\n\n");
        lineBuffer = events.pop() || "";

        let hasUpdates = false;

        for (const rawEvent of events) {
          for (const line of rawEvent.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload) as { type: string; data: any };

              switch (event.type) {
                case "thinking": {
                  thinkingStages.push({ type: event.data.stage, message: event.data.message, timestamp: Date.now() });
                  hasUpdates = true;
                  break;
                }
                case "text": {
                  const textContent = event.data.content as string;
                  const lastBlock = contentBlocks[contentBlocks.length - 1];
                  if (lastBlock && lastBlock.type === "text") {
                    contentBlocks[contentBlocks.length - 1] = { type: "text", text: (lastBlock as TextContent).text + textContent };
                  } else {
                    contentBlocks.push({ type: "text", text: textContent });
                  }
                  hasUpdates = true;
                  break;
                }
                case "table_data": {
                  handleDataChunk({ chunkType: "table", blockId: `table_${generateId("blk")}`, index: 0, columns: event.data.columns, rows: event.data.data, title: event.data.title });
                  hasUpdates = true;
                  break;
                }
                case "chart_data": {
                  handleDataChunk({ chunkType: "chart", blockId: `chart_${generateId("blk")}`, index: 0, chartType: event.data.chartType, config: event.data.config, title: event.data.title });
                  hasUpdates = true;
                  break;
                }
                case "data_chunk": {
                  handleDataChunk(event.data as SSEDataChunkData);
                  hasUpdates = true;
                  break;
                }
                case "done": { break; }
              }
            } catch {
              contentBlocks.push({ type: "text", text: payload });
              hasUpdates = true;
            }
          }
        }

        if (hasUpdates) throttledFlush();
      }

      if (lineBuffer.trim()) {
        for (const line of lineBuffer.split("\n")) {
          if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
            const payload = line.slice(6);
            try {
              const event = JSON.parse(payload);
              if (event.type === "text") {
                const lastBlock = contentBlocks[contentBlocks.length - 1];
                if (lastBlock && lastBlock.type === "text") {
                  contentBlocks[contentBlocks.length - 1] = { type: "text", text: (lastBlock as TextContent).text + event.data.content };
                } else {
                  contentBlocks.push({ type: "text", text: event.data.content });
                }
              }
            } catch {
              contentBlocks.push({ type: "text", text: payload });
            }
          }
        }
      }

      if (pendingFlush) {
        get().flushMessages(sessionId, localId, contentBlocks, thinkingStages, true);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        const errMsg = err instanceof Error ? err.message : String(err);
        contentBlocks.push({ type: "text", text: `\n\n❌ 继续请求失败：${errMsg}` });
      }
    } finally {
      abortControllers.delete(sessionId);
      streamEventCounts.delete(sessionId);

      const stillExists = get().getSession(sessionId);
      if (stillExists) {
        get().flushMessages(sessionId, localId, contentBlocks, thinkingStages, false);
        get().persistMessages(sessionId);
      }
    }
  },

  stopStreaming: (sessionId: string) => {
    const ctrl = abortControllers.get(sessionId);
    if (ctrl) {
      ctrl.abort();
      abortControllers.delete(sessionId);
    }
    streamEventCounts.delete(sessionId);
    resumeEventCounts.delete(sessionId);
    // 立即更新 isStreaming 状态（清除暂停标记）
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, isStreaming: false, isPaused: false } : s,
      ),
    }));
    // 停止时持久化消息 + 清除后端暂停状态
    get().persistMessages(sessionId);
    updatePauseStateAPI(sessionId, {
      isPaused: false,
      pausedMessage: null,
      resumeEventCount: null,
    }).catch((err) => console.error("[store] 清除暂停状态失败:", err));
  },

  stopAllStreaming: () => {
    abortControllers.forEach((ctrl) => ctrl.abort());
    abortControllers.clear();
    set((state) => ({
      sessions: state.sessions.map((s) => ({ ...s, isStreaming: false })),
    }));
  },
})));
