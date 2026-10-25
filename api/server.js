// 凯格尔运动训练器 API 服务器
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection, initTables } = require('./db');
const { securityHeaders, createRateLimiter } = require('./security');
const routes = require('./routes');

const app = express();

// 仅公开前端静态资源：仓库内的 API 源码、文档等不允许被直接访问
const PUBLIC_PATHS = /^\/(index\.html|data-recovery\.html|style\.css|script\.js|utils\.js|config\.js|api-client\.js|manifest\.webmanifest|sw\.js|icons\/[A-Za-z0-9._-]+\.(png|svg))?$/;
app.use((req, res, next) => {
    if (req.path === '/health' || req.path.startsWith('/api')) return next();
    if (!PUBLIC_PATHS.test(req.path)) {
        return res.status(404).json({ success: false, error: 'Not Found' });
    }
    next();
});

// 静态文件服务（前端页面）：HTML/CSS/JS/manifest 每次回源校验，避免 CDN 与浏览器缓存新旧版本混用
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders(res, filePath) {
    if (/\.(html|css|js|webmanifest)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
const PORT = process.env.PORT || 3000;

// 中间件
app.use(securityHeaders);
app.use(createRateLimiter({ windowMs: 60000, max: 120 }));

// 跨域白名单：默认仅同源；静态站与 API 分离部署时通过 CORS_ORIGINS 配置（逗号分隔）
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : { origin: false }));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 根路径 - 由静态文件服务处理 index.html
// API 文档接口
app.get('/api', (req, res) => {
  res.json({
    name: '凯格尔运动训练器 API',
    version: '1.0.0',
    endpoints: {
      sessions: {
        get: 'GET /api/sessions - 获取训练记录',
        post: 'POST /api/sessions - 保存训练记录',
        delete: 'DELETE /api/sessions/:id - 删除训练记录'
      },
      stats: {
        get: 'GET /api/stats - 获取统计数据'
      }
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      console.error('无法连接到数据库，请检查配置');
      process.exit(1);
    }

    // 初始化数据库表
    await initTables();

    // 启动服务器
    app.listen(PORT, () => {
      console.log('=================================');
      console.log(`✓ 服务器运行在 http://localhost:${PORT}`);
      console.log(`✓ API 文档: http://localhost:${PORT}/`);
      console.log(`✓ 健康检查: http://localhost:${PORT}/health`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

// 启动
startServer();
