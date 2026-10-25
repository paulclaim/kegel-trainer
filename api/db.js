// 数据库连接模块
const mysql = require('mysql2/promise');
require('dotenv').config();

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql.sqlpub.com',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'cloudlib',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✓ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    return false;
  }
}

// 初始化数据库表
async function initTables() {
  try {
    const connection = await pool.getConnection();

    // 创建训练记录表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kegel_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        client_id VARCHAR(36) DEFAULT NULL,
        date DATE NOT NULL,
        sets INT NOT NULL,
        reps INT NOT NULL,
        duration DECIMAL(5,1) NOT NULL,
        contract_time INT NOT NULL,
        relax_time INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, date),
        INDEX idx_date (date),
        UNIQUE KEY uk_client_id (client_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建用户设置表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kegel_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        reps_per_set INT NOT NULL,
        total_sets INT NOT NULL,
        contract_time INT NOT NULL,
        relax_time INT NOT NULL,
        sound_enabled BOOLEAN NOT NULL,
        reminder_enabled BOOLEAN NOT NULL,
        reminder_time TIME NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 存量表迁移：为已存在的 kegel_sessions 补充 client_id 幂等去重支持
    // （CREATE TABLE IF NOT EXISTS 不会更新旧表结构；重复执行时忽略 1060/1061 错误）
    await migrateTable(connection, 'kegel_sessions', [
      { sql: 'ALTER TABLE kegel_sessions ADD COLUMN client_id VARCHAR(36) DEFAULT NULL AFTER user_id', ignoreCodes: ['ER_DUP_FIELDNAME'] },
      { sql: 'ALTER TABLE kegel_sessions ADD UNIQUE KEY uk_client_id (client_id)', ignoreCodes: ['ER_DUP_KEYNAME'] }
    ]);

    console.log('✓ 数据库表初始化成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ 数据库表初始化失败:', error.message);
    return false;
  }
}

// 逐条执行迁移语句，忽略指定的"已存在"类错误
async function migrateTable(connection, table, statements) {
  for (const statement of statements) {
    try {
      await connection.query(statement.sql);
      console.log(`✓ 表 ${table} 迁移成功: ${statement.sql.slice(0, 60)}...`);
    } catch (error) {
      if (statement.ignoreCodes.includes(error.code)) continue;
      throw error;
    }
  }
}

module.exports = {
  pool,
  testConnection,
  initTables
};
