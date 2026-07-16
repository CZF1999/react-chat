import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: process.env.MYSQL_PASSWORD || 'chenzhifei',
};

let pool: mysql.Pool;

/**
 * 初始化数据库和表
 * 在服务器启动时调用
 */
export async function initDB(): Promise<void> {
  // Step 1: 用临时连接创建数据库（使用 query 而非 execute，因为 DDL 不支持 prepared statements）
  const initConn = await mysql.createConnection(MYSQL_CONFIG);

  try {
    await initConn.query(
      `CREATE DATABASE IF NOT EXISTS \`cms_chat\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('[db] 数据库 cms_chat 已就绪');
  } finally {
    await initConn.end();
  }

  // Step 2: 创建带数据库名的连接池，用 query 建表
  pool = mysql.createPool({
    ...MYSQL_CONFIG,
    database: 'cms_chat',
    waitForConnections: true,
    connectionLimit: 10,
  });

  // 创建会话表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`sessions\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`title\` VARCHAR(255) NOT NULL DEFAULT '新对话',
      \`created_at\` BIGINT NOT NULL,
      \`updated_at\` BIGINT NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 创建消息表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`messages\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`session_id\` VARCHAR(64) NOT NULL,
      \`role\` ENUM('user', 'assistant') NOT NULL,
      \`content\` TEXT NOT NULL,
      \`content_blocks\` JSON DEFAULT NULL,
      \`thinking_stages\` JSON DEFAULT NULL,
      \`created_at\` BIGINT NOT NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_session_id\` (\`session_id\`),
      CONSTRAINT \`fk_messages_session\`
        FOREIGN KEY (\`session_id\`)
        REFERENCES \`sessions\` (\`id\`)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('[db] 表 sessions / messages 已就绪');
}

export default {
  get pool() {
    return pool;
  },
};
