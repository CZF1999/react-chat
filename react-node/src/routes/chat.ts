import { Router, type Request, type Response } from 'express';
import { generateStream } from '../services/aiService.js';

const router = Router();

/**
 * 辅助函数：带延迟的异步 sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// POST /api/chat - 流式聊天接口
router.post('/', async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };

  // 校验输入
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message 字段不能为空' });
    return;
  }

  // 设置流式响应头
  res.status(200);
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Transfer-Encoding', 'chunked');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'no-cache, no-transform');

  // 禁用 Nagle 算法，确保小数据包立即发送
  if (req.socket) {
    req.socket.setNoDelay(true);
  }

  // 生成 token 数组
  const tokens = generateStream(message.trim());

  // 检测客户端断开：使用 aborted 事件（客户端主动取消）
  // 注意：不要使用 req.on('close')，在 Express 5 中它会在请求体解析完成后立即触发
  let isAborted = false;
  req.on('aborted', () => {
    isAborted = true;
    console.log('[chat] 客户端已中止连接');
  });

  try {
    for (let i = 0; i < tokens.length; i++) {
      // 检查客户端是否已断开
      if (isAborted || res.writableEnded) {
        console.log(`[chat] 停止发送 (已发送 ${i}/${tokens.length}, aborted=${isAborted})`);
        return;
      }

      // 写入 token 到响应流
      res.write(tokens[i]);

      // 模拟打字延迟
      const isChinese = /[一-鿿]/.test(tokens[i]);
      const delay = isChinese
        ? 30 + Math.random() * 30   // 中文：30-60ms
        : 10 + Math.random() * 20;  // 英文/标点：10-30ms

      await sleep(delay);
    }

    res.end();
  } catch (err) {
    console.error('[chat] 流式发送错误:', err);
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
