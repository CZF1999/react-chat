import { Readable } from 'node:stream';
import { Router, type Request, type Response } from 'express';
import {
  generateStream,
  isMockDemoMessage,
  type SSEEvent,
} from '../services/aiService.js';
import {
  hasDeepSeekKey,
  streamDeepSeekChat,
  type ChatHistoryMessage,
} from '../services/deepseekService.js';

const router = Router();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupSseHeaders(req: Request, res: Response): void {
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
}

function createSseReadable(res: Response): {
  readable: Readable;
  pushEvent: (event: SSEEvent | string) => void;
  end: () => void;
} {
  const readable = new Readable({
    read() {
      /* 由外部 push 驱动 */
    },
  });
  readable.pipe(res);

  return {
    readable,
    pushEvent(event) {
      if (typeof event === 'string') {
        readable.push(`data: ${event}\n\n`);
      } else {
        readable.push(`data: ${JSON.stringify(event)}\n\n`);
      }
    },
    end() {
      readable.push(null);
    },
  };
}

async function pushMockStream(options: {
  message: string;
  sessionId?: string;
  resumeFrom?: number;
  isAborted: () => boolean;
  pushEvent: (event: SSEEvent | string) => void;
  end: () => void;
}): Promise<void> {
  const { message, sessionId, resumeFrom, isAborted, pushEvent, end } = options;

  const allEvents = generateStream(message);
  const events =
    resumeFrom && resumeFrom > 0 ? allEvents.slice(resumeFrom) : allEvents;
  console.log(
    `[chat:mock] session=${sessionId || 'anonymous'} 总事件 ${allEvents.length}，` +
      (resumeFrom
        ? `跳过前 ${resumeFrom} 个，剩余 ${events.length} 个`
        : `全部 ${events.length} 个`) +
      `，SSE 结构化流式输出`,
  );

  const isJsonFallbackTest = /json.*错误|容错|fallback/.test(
    message.toLowerCase(),
  );

  let eventIndex = 0;
  for (const event of events) {
    if (isAborted()) break;

    pushEvent(event);
    eventIndex++;

    if (isJsonFallbackTest && eventIndex === 3) {
      await sleep(200);
      pushEvent(
        '这是一段原始文本（未包装为 JSON），用于测试前端 JSON.parse 容错。',
      );
      console.log('[chat:mock] 已注入原始文本（JSON 容错测试）');
      await sleep(150);
      pushEvent('{"type":"unknown_event","data":{"x":1}');
      console.log('[chat:mock] 已注入不完整 JSON（JSON 容错测试）');
    }

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

  if (
    !isAborted() &&
    (events.length === 0 || events[events.length - 1].type !== 'done')
  ) {
    pushEvent({ type: 'done', data: null });
  }

  end();
  console.log('[chat:mock] SSE 结构化输出完成');
}

async function pushDeepSeekStream(options: {
  message: string;
  sessionId?: string;
  history?: ChatHistoryMessage[];
  isAborted: () => boolean;
  signal: AbortSignal;
  pushEvent: (event: SSEEvent | string) => void;
  end: () => void;
}): Promise<void> {
  const { message, sessionId, history, isAborted, signal, pushEvent, end } =
    options;

  console.log(
    `[chat:deepseek] session=${sessionId || 'anonymous'} model=${process.env.DEEPSEEK_MODEL || 'deepseek-chat'} history=${history?.length ?? 0}`,
  );

  try {
    for await (const event of streamDeepSeekChat(message, signal, history)) {
      if (isAborted() || signal.aborted) break;
      pushEvent(event);
    }
  } catch (err) {
    if (signal.aborted || isAborted()) {
      console.log('[chat:deepseek] 客户端已中止');
      end();
      return;
    }
    console.error('[chat:deepseek] 调用失败:', err);
    const msg = err instanceof Error ? err.message : String(err);
    pushEvent({
      type: 'text',
      data: { content: `\n\n⚠️ DeepSeek 调用失败：${msg}` },
    });
    pushEvent({ type: 'done', data: null });
  }

  end();
  console.log('[chat:deepseek] SSE 输出完成');
}

// POST /api/chat - SSE 流式聊天（DeepSeek 真模型 / mock 演示双模式）
router.post('/', async (req: Request, res: Response) => {
  const { message, sessionId, resumeFrom, demo, history } = req.body as {
    message?: string;
    sessionId?: string;
    resumeFrom?: number;
    demo?: boolean;
    history?: ChatHistoryMessage[];
  };

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message 字段不能为空' });
    return;
  }

  const trimmed = message.trim();
  const useMock =
    demo === true ||
    !hasDeepSeekKey() ||
    isMockDemoMessage(trimmed);

  setupSseHeaders(req, res);
  const { readable, pushEvent, end } = createSseReadable(res);

  let aborted = false;
  const upstreamAbort = new AbortController();

  req.on('aborted', () => {
    aborted = true;
    upstreamAbort.abort();
    readable.destroy();
    console.log('[chat] 客户端已中止');
  });

  const isAborted = () => aborted || Boolean(req.aborted);

  try {
    if (useMock) {
      await pushMockStream({
        message: trimmed,
        sessionId,
        resumeFrom,
        isAborted,
        pushEvent,
        end,
      });
    } else {
      // 真实模型不支持按事件下标 resumeFrom
      await pushDeepSeekStream({
        message: trimmed,
        sessionId,
        history,
        isAborted,
        signal: upstreamAbort.signal,
        pushEvent,
        end,
      });
    }
  } catch (err) {
    console.error('[chat] SSE 推送错误:', err);
    try {
      pushEvent({
        type: 'text',
        data: {
          content: `\n\n⚠️ 服务错误：${err instanceof Error ? err.message : String(err)}`,
        },
      });
      pushEvent({ type: 'done', data: null });
      end();
    } catch {
      // ignore
    }
  }
});

export default router;
