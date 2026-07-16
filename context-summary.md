# 会话上下文总结

> 本次会话完成：多会话架构 + MySQL 持久化 + 文档全面更新 + CLAUDE.md 修正

---

## 一、本次做了什么

### 核心功能

1. **多会话支持**：基于 Zustand Store 实现多会话架构，切换会话不中断 SSE
2. **MySQL 持久化**：会话 + 消息存入 MySQL，支持刷新恢复
3. **前端 API 层**：会话 CRUD + 消息持久化的完整 API 调用封装
4. **文档更新**：`AI对话功能-完整学习文档.md` 从 1457 行扩展到 1670+ 行
5. **CLAUDE.md 修正**：移除不可靠的"上下文使用率报告"规则

---

## 二、多会话架构核心设计

### 切换不中断原理（三层分离）

| 层级 | 机制 | 效果 |
|------|------|------|
| 物理层 | `Map<string, AbortController>` 每会话独立 | 关闭 A 不影响 B |
| 数据层 | SSE 循环在 Zustand action 中，不依赖组件 | 组件卸载数据不丢 |
| 视图层 | `activeSessionId` 仅一个字符串指针 | 切换 = O(1) |

### 历史加载判断

```
setActiveSession(id)
  → messages.length === 0 && !isStreaming → 调 GET /api/sessions/:id/messages
  → messages.length > 0 → 直接用内存数据（不调接口）
  → isStreaming → 不调接口（SSE 正在流入）
```

---

## 三、MySQL 持久化

### 数据库：cms_chat，2 张表

- `sessions`：id, title, created_at, updated_at
- `messages`：id, session_id, role, content, content_blocks(JSON), thinking_stages(JSON), created_at，带 CASCADE 删除

### 6 个 API 端点

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/sessions | 会话列表 |
| POST | /api/sessions | 创建会话 |
| PATCH | /api/sessions/:id | 重命名 |
| DELETE | /api/sessions/:id | 删除（级联） |
| GET | /api/sessions/:id/messages | 加载历史 |
| POST | /api/sessions/:id/messages | 保存消息（覆盖写入，事务） |

### 保存时机

- SSE 流结束（finally 块自动触发）
- 用户点击"停止"按钮
- 降级策略：数据库故障不阻塞聊天，静默降级为纯内存模式

---

## 四、涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/store/useChatStore.ts` | Zustand Store（~612 行） |
| 新建 | `src/api/chat.ts` | 前端 API 调用 |
| 新建 | `src/components/Chat/SessionSidebar.tsx + .css` | 会话侧边栏 |
| 新建 | `src/components/Chat/ChatPanel.tsx` | 聊天面板 |
| 新建 | `react-node/src/db.ts` | MySQL 连接池 + 建表 |
| 新建 | `react-node/src/routes/sessions.ts` | 会话 CRUD API |
| 重写 | `src/pages/sbsjjc/index.tsx` | 453 行 → 30 行编排 |
| 重写 | `src/pages/sbsjjc/index.css` | column → row 布局 |
| 修改 | `react-node/src/index.ts` | 挂载 sessions 路由 + initDB |
| 修改 | `react-node/src/routes/chat.ts` | 接受可选 sessionId |
| 修改 | `src/types/chat.ts` | 新增 ChatSession 接口 |
| 修改 | `CLAUDE.md` | 移除上下文使用率报告 |
| 更新 | `AI对话功能-完整学习文档.md` | 1457 → 1670+ 行 |

---

## 五、关键设计决策

1. **消息不包含 sessionId**：通过 `sessions[id].messages` 自然归属，避免跨类型侵入
2. **SSE 循环不放在组件中**：放在 Store action 中，独立于 React 生命周期
3. **消息保存用覆盖写入**：事务内先删后插，避免增量同步复杂度
4. **乐观更新**：renameSession 先改本地再同步后端，即改即见
5. **数据库降级策略**：initDB 失败仅日志警告，服务继续运行

---

## 六、进行中/待办

### 建议优化（本次会话讨论但未做）

- **SSE 解析逻辑抽取**：`handleDataChunk` + switch-case + line buffer（~180 行）可从 `useChatStore.ts` 抽到 `src/utils/sseParser.ts`，提升 sendMessage 可读性和可测试性
- Store 其他模块（CRUD、消息操作）暂不建议拆分，碎片化会增加跳转成本

### 后续可做

- 历史消息分页加载（当前全量加载）
- 并发 SSE 数量限制（当前无限制）
- 实际对接真实 LLM API 替换 mock 数据
