# 凯格尔运动训练器 API 服务

这是凯格尔运动训练器的后端 API 服务，提供数据库存储和云端同步功能。

## 功能特性

- ✅ 训练记录存储和查询（client_id 幂等去重）
- ✅ 统计数据计算
- ✅ 支持多用户
- ✅ RESTful API 设计
- ✅ 自动创建数据库表与存量表迁移
- ✅ 输入校验、限流与安全响应头

## 技术栈

- Node.js + Express
- MySQL 数据库

## 快速开始

### 1. 安装依赖

```bash
cd api
npm install
```

### 2. 配置数据库

复制 `.env.example` 为 `.env` 并填写你的数据库信息：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DB_HOST=mysql.sqlpub.com
DB_PORT=3306
DB_USER=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_NAME=cloudlib
PORT=3000

# 可选：跨域白名单（逗号分隔）。默认仅同源，分离部署前端时才需要
# CORS_ORIGINS=https://your-frontend.example.com
```

### 3. 启动服务器

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 4. 验证服务

访问 `http://localhost:3000/health` 检查服务状态。

## API 接口文档

### 训练记录

#### 获取训练记录
```
GET /api/sessions?user_id=xxx&limit=100&offset=0
```

响应示例：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "client_id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2025-12-08",
      "sets": 3,
      "reps": 10,
      "duration": 5.0,
      "contract_time": 5,
      "relax_time": 5,
      "created_at": "2025-12-08T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

`limit` 上限 500（默认 100），`offset` 从 0 开始。

#### 保存训练记录
```
POST /api/sessions
Content-Type: application/json

{
  "user_id": "user_xxx",
  "client_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2025-12-08",
  "sets": 3,
  "reps": 10,
  "duration": 5.0,
  "contract_time": 5,
  "relax_time": 5
}
```

带 `client_id` 时按其幂等去重：重复提交同一条记录不会产生新行
（响应中 `inserted: false` 表示已存在）。字段校验范围：
sets 1-20、reps 1-100、contract_time/relax_time 1-600 秒、duration 0-1440 分钟、
date 须为合法 `YYYY-MM-DD`。

#### 删除训练记录
```
DELETE /api/sessions/:id?user_id=xxx
```

### 统计数据

#### 获取统计数据
```
GET /api/stats?user_id=xxx
```

响应示例：
```json
{
  "success": true,
  "data": {
    "totalDays": 10,
    "totalSessions": 25,
    "totalTime": 125,
    "streak": 5
  }
}
```

## 数据库表结构

### kegel_sessions（训练记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键，自增 |
| user_id | VARCHAR(255) | 用户ID |
| client_id | VARCHAR(36) | 客户端记录 UUID（唯一，幂等去重键，可空为历史数据） |
| date | DATE | 训练日期 |
| sets | INT | 组数 |
| reps | INT | 每组次数 |
| duration | DECIMAL(5,1) | 时长（分钟） |
| contract_time | INT | 收缩时间（秒） |
| relax_time | INT | 放松时间（秒） |
| created_at | TIMESTAMP | 创建时间 |

## 部署建议

### 本地开发
直接使用 `npm run dev` 启动开发服务器。

### 生产部署

1. **使用 PM2 管理进程**
```bash
npm install -g pm2
pm2 start server.js --name kegel-api
pm2 save
pm2 startup
```

2. **使用 Nginx 反向代理**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **使用云服务**
   - Vercel / Netlify（需要配置 Serverless Functions）
   - Heroku
   - Railway
   - DigitalOcean App Platform

## 安全说明

1. ✅ 数据库凭证存储在 `.env` 文件中，不要提交到 Git
2. ✅ 输入校验：字段范围、日期格式、分页上限（`validate.js`）
3. ✅ 按 IP 限流：默认 120 次/分钟（`security.js`，内存实现）
4. ✅ CORS 默认仅同源，跨域需显式配置 `CORS_ORIGINS`
5. ✅ 错误响应不回传内部错误详情，仅保留服务端日志
6. ⚠️ user_id 目前为客户端自生成的随机 UUID（无鉴权），
   适用于个人/低敏感场景；如需更强隔离可引入访问令牌
7. ⚠️ 生产环境使用 HTTPS

## 故障排查

### 数据库连接失败
- 检查 `.env` 文件配置是否正确
- 确认数据库服务器可访问
- 检查防火墙设置

### 端口被占用
修改 `.env` 中的 `PORT` 配置。

### CORS 错误
确保前端 `api-client.js` 中的 `baseURL` 指向正确的 API 地址。

## 许可证

MIT
