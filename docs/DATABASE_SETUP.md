# 数据库存储功能使用指南

## 概述

凯格尔运动训练器现已支持 MySQL 数据库存储功能，可以将训练数据保存到云端数据库，实现多设备同步。

## 功能特性

- ✅ **云端存储**：训练记录保存到 MySQL 数据库
- ✅ **自动同步**：完成训练后自动同步到云端
- ✅ **离线支持**：无网络时自动使用本地存储
- ✅ **数据安全**：通过后端 API 访问，不暴露数据库凭证
- ✅ **多用户支持**：每个用户有独立的数据空间

## 快速开始

### 第一步：配置数据库

1. 进入 `api` 目录：
```bash
cd api
```

2. 复制配置文件模板：
```bash
cp .env.example .env
```

3. 编辑 `.env` 文件，填入你的数据库信息：
```env
DB_HOST=mysql.sqlpub.com
DB_PORT=3306
DB_USER=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_NAME=cloudlib
PORT=3000
```

### 第二步：安装依赖

```bash
npm install
```

### 第三步：启动 API 服务器

```bash
# 开发模式（推荐）
npm run dev

# 或生产模式
npm start
```

看到以下信息表示启动成功：
```
=================================
✓ 数据库连接成功
✓ 数据库表初始化成功
✓ 服务器运行在 http://localhost:3000
✓ API 文档: http://localhost:3000/
✓ 健康检查: http://localhost:3000/health
=================================
```

### 第四步：配置前端

打开 `api-client.js`，确认 API 地址正确：

```javascript
constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    // ...
}
```

如果你的 API 服务器部署在其他地址，修改 `baseURL`。

### 第五步：使用应用

1. 打开 `index.html`
2. 开始训练
3. 完成训练后，数据会自动同步到云端

## 工作原理

### 数据流程

```
前端应用 (index.html)
    ↓
API 客户端 (api-client.js)
    ↓
后端 API (api/server.js)
    ↓
MySQL 数据库 (mysql.sqlpub.com)
```

### 智能同步策略

1. **保存训练记录时**：
   - 先保存到本地 LocalStorage（确保数据不丢失）
   - 检查 API 服务器连接状态
   - 如果在线，同步到云端数据库
   - 如果离线，仅保存到本地

2. **加载统计数据时**：
   - 优先从云端加载最新数据
   - 如果云端不可用，使用本地数据
   - 自动降级，确保应用始终可用

### 用户识别

每个用户会自动生成一个唯一 ID（存储在 LocalStorage），用于区分不同用户的数据。

## 数据库表结构

### 训练记录表 (kegel_sessions)

存储每次训练的详细记录：

| 字段 | 说明 |
|------|------|
| id | 记录ID |
| user_id | 用户ID |
| date | 训练日期 |
| sets | 组数 |
| reps | 每组次数 |
| duration | 时长（分钟） |
| contract_time | 收缩时间（秒） |
| relax_time | 放松时间（秒） |
| created_at | 创建时间 |

### 用户设置表 (kegel_settings)

存储用户的训练偏好设置：

| 字段 | 说明 |
|------|------|
| user_id | 用户ID |
| reps_per_set | 每组次数 |
| total_sets | 总组数 |
| contract_time | 收缩时间 |
| relax_time | 放松时间 |
| sound_enabled | 音效开关 |
| reminder_enabled | 提醒开关 |
| reminder_time | 提醒时间 |

## API 接口

### 训练记录

- `GET /api/sessions` - 获取训练记录
- `POST /api/sessions` - 保存训练记录
- `DELETE /api/sessions/:id` - 删除训练记录

### 统计数据

- `GET /api/stats` - 获取统计数据（总天数、总次数、连续天数等）

### 用户设置

- `GET /api/settings` - 获取用户设置
- `POST /api/settings` - 保存用户设置

详细 API 文档请查看 `api/README.md`。

## 部署到生产环境

### 方案一：本地服务器

使用 PM2 管理进程：

```bash
npm install -g pm2
cd api
pm2 start server.js --name kegel-api
pm2 save
pm2 startup
```

### 方案二：云服务

推荐使用以下平台：

1. **Heroku**
   - 免费套餐可用
   - 自动部署
   - 内置 SSL

2. **Railway**
   - 简单易用
   - 支持环境变量
   - 自动 HTTPS

3. **DigitalOcean App Platform**
   - 稳定可靠
   - 价格合理

4. **Vercel / Netlify**
   - 需要配置 Serverless Functions
   - 适合前后端一起部署

### 配置 HTTPS

生产环境强烈建议使用 HTTPS：

1. 使用 Nginx 反向代理 + Let's Encrypt
2. 使用云服务自带的 SSL 证书
3. 使用 Cloudflare CDN

## 故障排查

### 问题：无法连接到数据库

**解决方案**：
1. 检查 `.env` 文件配置是否正确
2. 确认数据库服务器地址可访问
3. 检查用户名和密码是否正确
4. 查看防火墙设置

### 问题：前端无法连接到 API

**解决方案**：
1. 确认 API 服务器正在运行
2. 检查 `api-client.js` 中的 `baseURL` 配置
3. 查看浏览器控制台的错误信息
4. 检查 CORS 配置

### 问题：数据没有同步

**解决方案**：
1. 打开浏览器控制台查看日志
2. 检查网络连接
3. 确认 API 服务器状态
4. 查看 API 服务器日志

## 数据迁移

### 从本地迁移到云端

如果你之前使用本地存储，现在想迁移到云端：

1. 启动 API 服务器
2. 打开浏览器控制台
3. 运行以下代码：

```javascript
// 获取本地数据
const records = StorageManager.get('kegel_records', []);

// 同步到云端
const apiClient = new APIClient();
for (const record of records) {
    await apiClient.saveSession(record);
}

console.log('迁移完成！');
```

### 导出数据

使用应用内的"导出"功能，可以导出 JSON 或 CSV 格式的数据备份。

## 安全建议

1. ✅ **不要提交 .env 文件到 Git**
   - `.env` 已在 `.gitignore` 中
   - 只提交 `.env.example` 模板

2. ✅ **使用强密码**
   - 数据库密码应足够复杂
   - 定期更换密码

3. ⚠️ **添加用户认证**（可选）
   - 当前版本使用自动生成的用户ID
   - 如需多用户登录，建议添加 JWT 认证

4. ⚠️ **限制 API 访问频率**（可选）
   - 防止滥用
   - 可使用 express-rate-limit

## 成本估算

### 数据库存储

假设每天训练 1 次，每次记录约 200 字节：
- 1 年数据：365 × 200 字节 ≈ 73 KB
- 10 年数据：≈ 730 KB

MySQL 数据库通常提供几 GB 的免费额度，完全够用。

### API 服务器

- 本地运行：免费
- Heroku 免费套餐：每月 550 小时（够用）
- Railway：每月 $5 起
- DigitalOcean：每月 $5 起

## 常见问题

**Q: 必须使用数据库吗？**
A: 不是必须的。如果不启动 API 服务器，应用会自动使用本地存储（LocalStorage），功能完全正常。

**Q: 数据会丢失吗？**
A: 不会。数据会先保存到本地，然后才尝试同步到云端。即使云端同步失败，本地数据也是安全的。

**Q: 可以在多个设备间同步吗？**
A: 可以。只要使用相同的用户ID（可以手动设置），就能在多个设备间同步数据。

**Q: 如何更换数据库？**
A: 修改 `.env` 文件中的数据库配置，重启 API 服务器即可。

**Q: 支持其他数据库吗？**
A: 当前版本仅支持 MySQL。如需支持 PostgreSQL、MongoDB 等，需要修改 `api/db.js` 中的数据库连接代码。

## 技术支持

如有问题，请查看：
- `api/README.md` - API 详细文档
- 浏览器控制台 - 查看错误日志
- API 服务器日志 - 查看后端错误

## 更新日志

### v1.0.0 (2025-12-08)
- ✅ 初始版本
- ✅ 支持 MySQL 数据库存储
- ✅ 自动同步功能
- ✅ 离线支持
- ✅ 多用户支持
