import { Readable } from 'node:stream';
import { Router, type Request, type Response } from 'express';
import { generateStream } from '../services/aiService.js';

const router = Router();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// POST /api/chat - SSE 流式聊天接口
router.post('/', async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };

  // 校验输入
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message 字段不能为空' });
    return;
  }

  // SSE 响应头
  res.status(200);
  res.set('Content-Type', 'text/event-stream; charset=utf-8');
  res.set('Cache-Control', 'no-cache');
  res.set('Connection', 'keep-alive');
  res.set('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  // 禁用 Nagle 算法
  if (req.socket) {
    req.socket.setNoDelay(true);
  }

  // 生成 token 数组
  const tokens = generateStream(message.trim());
  console.log(`[chat] 共 ${tokens.length} 个 token，SSE 流式输出`);

  // Node.js Readable 流 → pipe 到响应
  const readable = new Readable({
    read() { /* 由外部 push 驱动 */ },
  });
  readable.pipe(res);

  // 客户端断开检测
  let isAborted = false;
  req.on('aborted', () => {
    isAborted = true;
    readable.destroy();
    console.log('[chat] 客户端已中止');
  });

  // 异步推送 SSE 事件
  (async () => {
    try {
      const BATCH_SIZE = 5;
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        if (isAborted) break;

        const batch = tokens.slice(i, i + BATCH_SIZE).join('');
        // SSE 格式: data: <内容>\n\n
        readable.push(`data: ${batch}\n\n`);

        const hasChinese = /[一-鿿]/.test(batch);
        const delayPerChar = hasChinese ? 50 : 25;
        await sleep(batch.length * delayPerChar);
      }

      // 发送结束标记
      if (!isAborted) {
        readable.push('data: [DONE]\n\n');
      }
      readable.push(null);
      console.log('[chat] SSE 输出完成');
    } catch (err) {
      console.error('[chat] SSE 推送错误:', err);
      readable.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();
});

export default router;
