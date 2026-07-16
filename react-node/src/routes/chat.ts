import { Readable } from 'node:stream';
import { Router, type Request, type Response } from 'express';
import { generateStream, type SSEEvent } from '../services/aiService.js';

const router = Router();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// POST /api/chat - SSE 流式聊天接口（结构化事件）
router.post('/', async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

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
  res.set('X-Accel-Buffering', 'no');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.socket) {
    req.socket.setNoDelay(true);
  }

  // 生成结构化事件数组
  const events = generateStream(message.trim());
  console.log(`[chat] session=${sessionId || 'anonymous'} 共 ${events.length} 个事件，SSE 结构化流式输出`);

  // JSON 容错测试：在事件流中注入原始文本
  const isJsonFallbackTest = /json.*错误|容错|fallback/.test(message.trim().toLowerCase());

  // Node.js Readable 流
  const readable = new Readable({
    read() { /* 由外部 push 驱动 */ },
  });
  readable.pipe(res);

  let isAborted = false;
  req.on('aborted', () => {
    isAborted = true;
    readable.destroy();
    console.log('[chat] 客户端已中止');
  });

  // 异步推送 SSE 事件
  (async () => {
    try {
      let eventIndex = 0;
      for (const event of events) {
        if (isAborted) break;

        // 每个事件以 JSON 格式发送
        const payload = JSON.stringify(event);
        readable.push(`data: ${payload}\n\n`);
        eventIndex++;

        // JSON 容错测试：在特定位置注入原始非 JSON 文本
        if (isJsonFallbackTest && eventIndex === 3) {
          // 注入一条非 JSON 的原始文本（模拟旧版 SSE）
          await sleep(200);
          readable.push('data: 这是一段原始文本（未包装为 JSON），用于测试前端 JSON.parse 容错。\n\n');
          console.log('[chat] 已注入原始文本（JSON 容错测试）');
          // 再注入一条半损数据
          await sleep(150);
          readable.push('data: {"type":"unknown_event","data":{"x":1}\n\n'); // 故意不闭合 JSON
          console.log('[chat] 已注入不完整 JSON（JSON 容错测试）');
        }

        // 根据事件类型调整延迟，模拟真实场景
        let delay = 30;
        if (event.type === 'thinking') {
          delay = 600;
        } else if (event.type === 'table_loading' || event.type === 'chart_loading') {
          delay = 800;
        } else if (event.type === 'data_chunk') {
          delay = 400;
        } else if (event.type === 'text') {
          const hasChinese = /[一-鿿]/.test(event.data.content);
          delay = hasChinese ? 50 : 25;
        } else if (event.type === 'table_data' || event.type === 'chart_data') {
          delay = 100;
        } else if (event.type === 'done') {
          delay = 10;
        }

        await sleep(delay);
      }

      // 确保发送 done 事件
      if (!isAborted && (events.length === 0 || events[events.length - 1].type !== 'done')) {
        readable.push('data: {"type":"done","data":null}\n\n');
      }

      readable.push(null);
      console.log('[chat] SSE 结构化输出完成');
    } catch (err) {
      console.error('[chat] SSE 推送错误:', err);
      readable.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();
});

export default router;
