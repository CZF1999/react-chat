import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = express();

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// 路由
app.use('/api/chat', chatRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 聊天后端服务已启动: http://localhost:${PORT}`);
  console.log(`📡 API 端点: POST http://localhost:${PORT}/api/chat`);
  console.log(`❤️  健康检查: GET http://localhost:${PORT}/api/health`);
});

export default app;
