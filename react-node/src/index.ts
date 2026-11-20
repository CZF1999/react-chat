import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';
import sessionsRouter from './routes/sessions.js';
import { initDB } from './db.js';
import { hasDeepSeekKey } from './services/deepseekService.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/** 合并本地默认源与 CORS_ORIGIN（逗号分隔，供 GitHub Pages 等） */
function resolveCorsOrigins(): string[] {
  const extra = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_CORS_ORIGINS, ...extra])];
}

const corsOrigins = resolveCorsOrigins();

const app = express();

// 中间件
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());

// 路由
app.use('/api/chat', chatRouter);
app.use('/api/sessions', sessionsRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    deepseek: hasDeepSeekKey(),
  });
});

// 启动服务器
async function start() {
  try {
    await initDB();
    console.log('[db] 数据库初始化完成');
  } catch (err) {
    console.error('[db] 数据库初始化失败，将以无持久化模式运行:', err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 聊天后端服务已启动: http://0.0.0.0:${PORT}`);
    console.log(`📡 API 端点: POST http://localhost:${PORT}/api/chat`);
    console.log(`📋 会话 API: http://localhost:${PORT}/api/sessions`);
    console.log(`❤️  健康检查: GET http://localhost:${PORT}/api/health`);
    console.log(`🤖 DeepSeek: ${hasDeepSeekKey() ? '已启用' : '未配置（走 mock）'}`);
    console.log(`🌐 CORS origins: ${corsOrigins.join(', ')}`);
  });
}

start();

export default app;
