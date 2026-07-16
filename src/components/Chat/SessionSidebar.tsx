import React, { useState, useCallback, memo } from "react";
import { useChatStore } from "@/store/useChatStore";
import type { ChatSession } from "@/types/chat";
import "./SessionSidebar.css";

// ==================== SessionItem（memo 隔离） ====================

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  editTitle: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onConfirmDelete: (id: string, e: React.MouseEvent) => void;
  onCancelDelete: (e: React.MouseEvent) => void;
  onStartRename: (id: string, currentTitle: string, e: React.MouseEvent) => void;
  onRenameKeyDown: (id: string, e: React.KeyboardEvent) => void;
  onEditTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlurRename: (id: string) => void;
  onStop: (id: string, e: React.MouseEvent) => void;
}

const SessionItem = memo(function SessionItem({
  session,
  isActive,
  isEditing,
  isConfirmingDelete,
  editTitle,
  onSwitch,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onStartRename,
  onRenameKeyDown,
  onEditTitleChange,
  onBlurRename,
  onStop,
}: SessionItemProps) {
  return (
    <div
      className={`session-sidebar__item ${
        isActive ? "session-sidebar__item--active" : ""
      }`}
      onClick={() => onSwitch(session.id)}
    >
      {/* 流式指示器 */}
      {session.isStreaming && (
        <span className="session-sidebar__streaming-indicator" title="正在回答中...">
          🌀
        </span>
      )}

      {/* 标题区域 */}
      <div className="session-sidebar__item-content">
        {isEditing ? (
          <input
            className="session-sidebar__rename-input"
            value={editTitle}
            onChange={onEditTitleChange}
            onBlur={() => onBlurRename(session.id)}
            onKeyDown={(e) => onRenameKeyDown(session.id, e)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className="session-sidebar__item-title"
            onDoubleClick={(e) => onStartRename(session.id, session.title, e)}
            title="双击重命名"
          >
            {session.title}
          </span>
        )}

        <span className="session-sidebar__item-meta">
          {session.messages.length > 0 && (
            <span className="session-sidebar__msg-count">
              {session.messages.length}
            </span>
          )}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="session-sidebar__item-actions">
        {/* 非活跃但正在流式：显示停止按钮 */}
        {session.isStreaming && !isActive && (
          <button
            className="session-sidebar__stop-btn"
            onClick={(e) => onStop(session.id, e)}
            title="停止生成"
          >
            ⏹
          </button>
        )}

        {/* 删除按钮 */}
        {isConfirmingDelete ? (
          <span className="session-sidebar__delete-confirm">
            <button
              className="session-sidebar__delete-yes"
              onClick={(e) => onConfirmDelete(session.id, e)}
            >
              ✓
            </button>
            <button
              className="session-sidebar__delete-no"
              onClick={onCancelDelete}
            >
              ✕
            </button>
          </span>
        ) : (
          <button
            className="session-sidebar__delete-btn"
            onClick={(e) => onDelete(session.id, e)}
            title="删除会话"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
});

// ==================== SessionSidebar 容器 ====================

const SessionSidebar: React.FC = () => {
  // 用 Zustand 默认的 Object.is 比较（稳定引用），不用 useShallow
  // React.memo(SessionItem) 负责按 item 阻止不必要的重渲染
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const sessionsCount = useChatStore((s) => s.sessions.length);

  const createSession = useChatStore((s) => s.createSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const stopStreaming = useChatStore((s) => s.stopStreaming);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- 稳定回调 ----
  const handleCreate = useCallback(() => {
    createSession();
  }, [createSession]);

  const handleSwitch = useCallback(
    (id: string) => {
      setActiveSession(id);
    },
    [setActiveSession],
  );

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (sessionsCount <= 1) {
        deleteSession(id);
        return;
      }
      setDeletingId(id);
    },
    [sessionsCount, deleteSession],
  );

  const confirmDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteSession(id);
      setDeletingId(null);
    },
    [deleteSession],
  );

  const cancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  }, []);

  const startRename = useCallback(
    (id: string, currentTitle: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(id);
      setEditTitle(currentTitle);
    },
    [],
  );

  const submitRename = useCallback(
    (id: string) => {
      const trimmed = editTitle.trim();
      if (trimmed && editingId) {
        renameSession(id, trimmed);
      }
      setEditingId(null);
      setEditTitle("");
    },
    [editTitle, editingId, renameSession],
  );

  const handleRenameKeyDown = useCallback(
    (id: string, e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        submitRename(id);
      } else if (e.key === "Escape") {
        setEditingId(null);
        setEditTitle("");
      }
    },
    [submitRename],
  );

  const handleStop = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      stopStreaming(id);
    },
    [stopStreaming],
  );

  const handleEditTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditTitle(e.target.value);
    },
    [],
  );

  const handleBlurRename = useCallback(
    (id: string) => {
      submitRename(id);
    },
    [submitRename],
  );

  return (
    <div className="session-sidebar">
      <div className="session-sidebar__header">
        <button className="session-sidebar__new-btn" onClick={handleCreate}>
          + 新建会话
        </button>
      </div>

      <div className="session-sidebar__list">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            isEditing={session.id === editingId}
            isConfirmingDelete={session.id === deletingId}
            editTitle={editTitle}
            onSwitch={handleSwitch}
            onDelete={handleDelete}
            onConfirmDelete={confirmDelete}
            onCancelDelete={cancelDelete}
            onStartRename={startRename}
            onRenameKeyDown={handleRenameKeyDown}
            onEditTitleChange={handleEditTitleChange}
            onBlurRename={handleBlurRename}
            onStop={handleStop}
          />
        ))}

        {sessions.length === 0 && (
          <div className="session-sidebar__empty">
            暂无会话，点击上方按钮创建
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionSidebar;
