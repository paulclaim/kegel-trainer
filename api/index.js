// Vercel Serverless Function 入口
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { securityHeaders, createRateLimiter } = require('./security');
const routes = require('./routes');

const app = express();

// 中间件
app.use(securityHeaders);
app.use(createRateLimiter({ windowMs: 60000, max: 120 }));

// 跨域白名单：默认仅同源；分离部署时通过 CORS_ORIGINS 配置（逗号分隔）
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : { origin: false }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api', routes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 根路径
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

// 导出为 Vercel Serverless Function
module.exports = app;
