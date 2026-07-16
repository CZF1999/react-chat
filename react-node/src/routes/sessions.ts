import { Router, type Request, type Response } from 'express';
import db from '../db.js';

const router = Router();

// ==================== 会话 CRUD ====================

/** GET /api/sessions - 获取所有会话列表（不含消息） */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.pool.query(
      'SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC'
    );
    res.json({ sessions: rows });
  } catch (err) {
    console.error('[sessions] 获取列表失败:', err);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

/** POST /api/sessions - 创建新会话 */
router.post('/', async (req: Request, res: Response) => {
  const { id, title } = req.body as { id?: string; title?: string };

  if (!id || !title) {
    res.status(400).json({ error: 'id 和 title 字段不能为空' });
    return;
  }

  try {
    const now = Date.now();
    await db.pool.query(
      'INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, title || '新对话', now, now]
    );
    res.json({ id, title: title || '新对话', created_at: now, updated_at: now });
  } catch (err: any) {
    // 重复 ID 插入
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: '会话 ID 已存在' });
      return;
    }
    console.error('[sessions] 创建失败:', err);
    res.status(500).json({ error: '创建会话失败' });
  }
});

/** PATCH /api/sessions/:id - 重命名会话 */
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title } = req.body as { title?: string };

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'title 字段不能为空' });
    return;
  }

  try {
    const [result] = await db.pool.query(
      'UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?',
      [title.trim(), Date.now(), id]
    ) as any;

    if (result.affectedRows === 0) {
      res.status(404).json({ error: '会话不存在' });
      return;
    }
    res.json({ id, title: title.trim() });
  } catch (err) {
    console.error('[sessions] 重命名失败:', err);
    res.status(500).json({ error: '重命名失败' });
  }
});

/** DELETE /api/sessions/:id - 删除会话（CASCADE 自动删除消息） */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [result] = await db.pool.query('DELETE FROM sessions WHERE id = ?', [id]) as any;

    if (result.affectedRows === 0) {
      res.status(404).json({ error: '会话不存在' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[sessions] 删除失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ==================== 消息操作 ====================

/** GET /api/sessions/:id/messages - 获取某会话的所有消息 */
router.get('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [rows] = await db.pool.query(
      'SELECT id, session_id, role, content, content_blocks, thinking_stages, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [id]
    );

    // 将 DB 行转为 ChatMessage 格式
    const messages = (rows as any[]).map((row) => {
      // MySQL JSON 列可能已被 mysql2 自动解析为对象，也可能还是字符串
      const parseJSON = (val: any) => {
        if (val === null || val === undefined) return undefined;
        if (typeof val === 'object') return val;
        try { return JSON.parse(val); } catch { return undefined; }
      };

      return {
        id: row.id,
        role: row.role,
        content: row.content,
        contentBlocks: parseJSON(row.content_blocks),
        thinkingStages: parseJSON(row.thinking_stages),
        createdAt: row.created_at,
      };
    });

    res.json({ messages });
  } catch (err) {
    console.error('[sessions] 获取消息失败:', err);
    res.status(500).json({ error: '获取消息失败' });
  }
});

/** POST /api/sessions/:id/messages - 批量保存消息（覆盖写入） */
router.post('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { messages } = req.body as { messages?: any[] };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages 字段不能为空且必须为数组' });
    return;
  }

  try {
    // 使用事务：先删旧消息，再批量插入
    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();

      // 删除该会话的所有旧消息
      await conn.query('DELETE FROM messages WHERE session_id = ?', [id]);

      // 批量插入新消息
      const stmt = `
        INSERT INTO messages (id, session_id, role, content, content_blocks, thinking_stages, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      for (const msg of messages) {
        await conn.query(stmt, [
          msg.id,
          id,
          msg.role,
          msg.content || '',
          msg.contentBlocks ? JSON.stringify(msg.contentBlocks) : null,
          msg.thinkingStages ? JSON.stringify(msg.thinkingStages) : null,
          msg.createdAt || Date.now(),
        ]);
      }

      // 更新会话的 updated_at
      await conn.query('UPDATE sessions SET updated_at = ? WHERE id = ?', [Date.now(), id]);

      await conn.commit();
      res.json({ success: true, count: messages.length });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[sessions] 保存消息失败:', err);
    res.status(500).json({ error: '保存消息失败' });
  }
});

export default router;
