/**
 * DeepSeek Chat Completions 流式客户端（OpenAI 兼容协议）
 * 将 delta.content 映射为现有 SSE text / done 事件
 */

import type { SSEEvent } from './aiService.js';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export type ChatHistoryMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const DEFAULT_EDU_SYSTEM_PROMPT = `你是面向 K12 师生的学习助手，目标是把模型能力变成「真的会用、愿意用」的讲解与练习支持。

原则：
1. 讲解清晰、分步骤，优先启发思考，而不是直接甩出最终答案应付交差。
2. 对学生：鼓励独立思考；对明显作业代写请求，给出思路与步骤，避免整题代做。
3. 对老师：可协助生成讲解稿、变式练习建议、易错点提醒，表述专业简洁。
4. 必要时使用 Markdown（标题、列表、公式）；回答聚焦、避免空话。
5. 若信息不足，先澄清题目或年级/知识点，再作答。`;

export function hasDeepSeekKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

function resolveSystemPrompt(): string {
  const fromEnv = process.env.DEEPSEEK_SYSTEM_PROMPT?.trim();
  return fromEnv || DEFAULT_EDU_SYSTEM_PROMPT;
}

function normalizeHistory(
  history: ChatHistoryMessage[] | undefined,
): ChatHistoryMessage[] {
  if (!Array.isArray(history) || history.length === 0) return [];

  return history
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim(),
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }))
    .slice(-20);
}

export async function* streamDeepSeekChat(
  message: string,
  signal?: AbortSignal,
  history?: ChatHistoryMessage[],
): AsyncGenerator<SSEEvent> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set');
  }

  const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
  const prior = normalizeHistory(history);

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: resolveSystemPrompt() },
        ...prior,
        { role: 'user', content: message },
      ],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `DeepSeek API error ${response.status}: ${errText.slice(0, 300)}`,
    );
  }

  if (!response.body) {
    throw new Error('DeepSeek response body is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sentDone = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          yield { type: 'done', data: null };
          sentDone = true;
          return;
        }

        try {
          const json = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            yield { type: 'text', data: { content } };
          }
        } catch {
          // 跳过无法解析的分片
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!sentDone) {
    yield { type: 'done', data: null };
  }
}
