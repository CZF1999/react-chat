import React, { useState, useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import "./SessionSidebar.css";

const SessionSidebar: React.FC = () => {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const stopStreaming = useChatStore((s) => s.stopStreaming);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      if (sessions.length <= 1) {
        // 至少保留一个会话，直接删除并自动创建新会话
        deleteSession(id);
        return;
      }
      setDeletingId(id);
    },
    [sessions.length, deleteSession],
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

  return (
    <div className="session-sidebar">
      <div className="session-sidebar__header">
        <button className="session-sidebar__new-btn" onClick={handleCreate}>
          + 新建会话
        </button>
      </div>

      <div className="session-sidebar__list">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const isEditing = session.id === editingId;
          const isConfirmingDelete = session.id === deletingId;

          return (
            <div
              key={session.id}
              className={`session-sidebar__item ${
                isActive ? "session-sidebar__item--active" : ""
              }`}
              onClick={() => handleSwitch(session.id)}
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
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => submitRename(session.id)}
                    onKeyDown={(e) => handleRenameKeyDown(session.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="session-sidebar__item-title"
                    onDoubleClick={(e) => startRename(session.id, session.title, e)}
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
                    onClick={(e) => handleStop(session.id, e)}
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
                      onClick={(e) => confirmDelete(session.id, e)}
                    >
                      ✓
                    </button>
                    <button
                      className="session-sidebar__delete-no"
                      onClick={cancelDelete}
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <button
                    className="session-sidebar__delete-btn"
                    onClick={(e) => handleDelete(session.id, e)}
                    title="删除会话"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}

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
