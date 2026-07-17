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
  fetchSessions,
  createSessionAPI,
  deleteSessionAPI,
  renameSessionAPI,
  fetchMessages,
  saveMessagesAPI,
} from "@/api/chat";
import { devtools } from 'zustand/middleware';
// ==================== 模块级闭包（不可序列化） ====================

/** 每个会话独立的 AbortController，支持多 SSE 连接并发 */
const abortControllers = new Map<string, AbortController>();

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
    assistantId: string,
    contentBlocks: MessageContent[],
    thinkingStages: ThinkingStage[],
    isStreaming: boolean,
  ) => void;
  /** 将内存中的消息持久化到后端 */
  persistMessages: (sessionId: string) => Promise<void>;

  // ---- 流式控制 ----
  sendMessage: (sessionId: string, content: string) => Promise<void>;
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
      const pageNum = Math.floor(session.messages.length / 2) + 1;
      const { messages, hasMoreOlder } = await fetchMessages(
        sessionId,
        pageNum,
        2,
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
    assistantId: string,
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
        if (targetMsg && targetMsg.id === assistantId && targetMsg.role === "assistant") {
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
        const idx = messages.findIndex((m) => m.id === assistantId);
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

    const assistantId = generateId("msg");

    // Step 1: 添加用户消息 + AI 占位消息
    const userMsg: ChatMessage = {
      id: generateId("msg"),
      role: "user",
      content,
      createdAt: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: assistantId,
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

    // Step 2: 创建独立的 AbortController
    const controller = new AbortController();
    abortControllers.set(sessionId, controller);

    // 追踪当前流式状态
    const contentBlocks: MessageContent[] = [];
    const thinkingStages: ThinkingStage[] = [];
    let pendingLoadingBlock: {
      type: "table" | "chart";
      message: string;
    } | null = null;

    // 节流状态：限制 flushMessages 调用频率到 ~30fps
    let lastFlushTime = 0;
    const FLUSH_INTERVAL_MS = 33;
    let pendingFlush = false;

    const throttledFlush = () => {
      const now = Date.now();
      if (now - lastFlushTime >= FLUSH_INTERVAL_MS) {
        lastFlushTime = now;
        get().flushMessages(sessionId, assistantId, contentBlocks, thinkingStages, true);
        pendingFlush = false;
      } else {
        pendingFlush = true;
      }
    };

    /**
     * 统一的数据块处理函数
     * - index===0：创建新 block 并 push
     * - index>0：找到同类 block，以新对象替换（追加数据）
     */
    const handleDataChunk = (chunk: SSEDataChunkData) => {
      if (pendingLoadingBlock) pendingLoadingBlock = null;

      if (chunk.chunkType === "table") {
        if (chunk.index === 0) {
          contentBlocks.push({
            type: "table",
            columns: chunk.columns!,
            data: chunk.rows || [],
            title: chunk.title,
          } as TableContent);
        } else {
          for (let i = contentBlocks.length - 1; i >= 0; i--) {
            const block = contentBlocks[i];
            if (block.type === "table") {
              contentBlocks[i] = {
                ...block,
                data: [
                  ...(block as TableContent).data,
                  ...(chunk.rows || []),
                ],
              } as TableContent;
              break;
            }
          }
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
          contentBlocks.push({
            type: "chart",
            chartType: chunk.chartType!,
            title: chunk.title,
            config: baseConfig,
          } as ChartContent);
        } else {
          for (let i = contentBlocks.length - 1; i >= 0; i--) {
            const block = contentBlocks[i];
            if (block.type === "chart") {
              const existing = block as ChartContent;
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
              contentBlocks[i] = {
                ...existing,
                config: { ...existing.config, xAxis: newXAxis, series: newSeries },
              } as ChartContent;
              break;
            }
          }
        }
      }
    };

    // SSE 读取循环
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId }),
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
                  thinkingStages.push({
                    type: event.data.stage,
                    message: event.data.message,
                    timestamp: Date.now(),
                  });
                  hasUpdates = true;
                  break;
                }

                case "text": {
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
                  pendingLoadingBlock = {
                    type: "table",
                    message: event.data.message,
                  };
                  hasUpdates = true;
                  break;
                }

                case "table_data": {
                  handleDataChunk({
                    chunkType: "table",
                    index: 0,
                    columns: event.data.columns,
                    rows: event.data.data,
                    title: event.data.title,
                  });
                  hasUpdates = true;
                  break;
                }

                case "chart_loading": {
                  pendingLoadingBlock = {
                    type: "chart",
                    message: event.data.message,
                  };
                  hasUpdates = true;
                  break;
                }

                case "chart_data": {
                  handleDataChunk({
                    chunkType: "chart",
                    index: 0,
                    chartType: event.data.chartType,
                    config: event.data.config,
                    title: event.data.title,
                  });
                  hasUpdates = true;
                  break;
                }

                case "data_chunk": {
                  handleDataChunk(event.data as SSEDataChunkData);
                  hasUpdates = true;
                  break;
                }

                case "done": {
                  break;
                }
              }
            } catch {
              // JSON 解析失败，当作纯文本处理
              contentBlocks.push({ type: "text", text: payload });
              hasUpdates = true;
            }
          }
        }

        // 批量更新消息状态（节流到 ~30fps）
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
                  contentBlocks.push({
                    type: "text",
                    text: event.data.content,
                  });
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
        get().flushMessages(sessionId, assistantId, contentBlocks, thinkingStages, true);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        const errMsg = err instanceof Error ? err.message : String(err);
        contentBlocks.push({ type: "text", text: `❌ 请求失败：${errMsg}` });
      }
    } finally {
      // 清理 AbortController
      abortControllers.delete(sessionId);

      // 确认会话仍存在再更新
      const stillExists = get().getSession(sessionId);
      if (stillExists) {
        get().flushMessages(sessionId, assistantId, contentBlocks, thinkingStages, false);
        // SSE 流结束后持久化消息到后端
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
    // 立即更新 isStreaming 状态
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, isStreaming: false } : s,
      ),
    }));
    // 停止时也持久化当前消息
    get().persistMessages(sessionId);
  },

  stopAllStreaming: () => {
    abortControllers.forEach((ctrl) => ctrl.abort());
    abortControllers.clear();
    set((state) => ({
      sessions: state.sessions.map((s) => ({ ...s, isStreaming: false })),
    }));
  },
})));
