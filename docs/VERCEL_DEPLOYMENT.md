# Vercel 部署指南

本指南将帮助你将凯格尔运动训练器部署到 Vercel，包括前端和后端 API。

## 📋 前置要求

1. GitHub 账号
2. Vercel 账号（可以用 GitHub 登录）
3. 项目已推送到 GitHub

## 🚀 部署步骤

### 第一步：准备 GitHub 仓库

1. 确保你的代码已经提交到 GitHub：

```bash
git add .
git commit -m "feat: 准备部署到 Vercel"
git push origin main
```

### 第二步：登录 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Sign Up" 或 "Log In"
3. 选择 "Continue with GitHub" 使用 GitHub 账号登录

### 第三步：导入项目

1. 在 Vercel 控制台，点击 "Add New..." → "Project"
2. 选择 "Import Git Repository"
3. 找到你的 `kegel` 仓库，点击 "Import"

### 第四步：配置项目

#### 4.1 基本设置

- **Framework Preset**: 选择 "Other"（或保持默认）
- **Root Directory**: 保持默认（`.`）
- **Build Command**: 留空
- **Output Directory**: 留空
- **Install Command**: `npm install`

#### 4.2 配置环境变量

点击 "Environment Variables"，添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DB_HOST` | `mysql.sqlpub.com` | 数据库主机 |
| `DB_PORT` | `3306` | 数据库端口 |
| `DB_USER` | `你的数据库用户名` | 数据库用户 |
| `DB_PASSWORD` | `你的数据库密码` | 数据库密码 |
| `DB_NAME` | `cloudlib` | 数据库名称 |

**重要**：确保所有环境变量都添加到 "Production"、"Preview" 和 "Development" 环境。

### 第五步：部署

1. 点击 "Deploy" 按钮
2. 等待部署完成（通常需要 1-2 分钟）
3. 部署成功后，你会看到一个 URL，例如：`https://kegel.vercel.app`

### 第六步：验证部署

1. 访问你的 Vercel URL
2. 测试前端页面是否正常显示
3. 测试 API 接口：
   - 访问 `https://你的域名.vercel.app/api/health`
   - 应该返回：`{"status":"ok","timestamp":"..."}`

## 🔧 配置自定义域名（可选）

1. 在 Vercel 项目设置中，点击 "Domains"
2. 输入你的域名（例如：`kegel.yourdomain.com`）
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效（通常几分钟到几小时）

## 📝 项目结构说明

部署后的项目结构：

```
kegel/
├── index.html          # 前端页面（自动部署）
├── style.css           # 样式文件
├── config.js           # 配置文件
├── utils.js            # 工具函数
├── api-client.js       # API 客户端（自动检测环境）
├── script.js           # 主逻辑
├── api/                # 后端 API
│   ├── index.js        # Serverless Function 入口
│   ├── db.js           # 数据库连接
│   ├── routes.js       # API 路由
│   └── package.json    # 依赖配置
└── vercel.json         # Vercel 配置
```

## 🌐 API 端点

部署后，你的 API 端点将是：

- `https://你的域名.vercel.app/api/sessions` - 训练记录
- `https://你的域名.vercel.app/api/stats` - 统计数据
- `https://你的域名.vercel.app/api/settings` - 用户设置
- `https://你的域名.vercel.app/api/health` - 健康检查

## 🔄 自动部署

配置完成后，每次你推送代码到 GitHub，Vercel 会自动：

1. 检测到代码变更
2. 自动构建和部署
3. 生成预览 URL
4. 部署成功后更新生产环境

## 🐛 故障排查

### 问题 1：API 返回 500 错误

**原因**：数据库连接失败

**解决方案**：
1. 检查 Vercel 环境变量是否正确配置
2. 确认数据库用户名和密码正确
3. 查看 Vercel 部署日志：项目 → Deployments → 点击最新部署 → Functions

### 问题 2：前端无法连接 API

**原因**：CORS 或路径配置问题

**解决方案**：
1. 检查 `api-client.js` 中的 baseURL 配置
2. 确认 `vercel.json` 路由配置正确
3. 查看浏览器控制台错误信息

### 问题 3：数据库表未创建

**原因**：首次访问 API 时表未自动创建

**解决方案**：
1. 访问 `https://你的域名.vercel.app/api/health`
2. 这会触发数据库连接和表初始化
3. 查看 Vercel 函数日志确认表创建成功

### 问题 4：部署失败

**原因**：依赖安装失败或配置错误

**解决方案**：
1. 检查 `api/package.json` 是否正确
2. 确认 `vercel.json` 配置无误
3. 查看 Vercel 构建日志

## 📊 监控和日志

### 查看部署日志

1. 进入 Vercel 项目
2. 点击 "Deployments"
3. 选择一个部署
4. 查看 "Building" 和 "Functions" 日志

### 查看运行时日志

1. 进入 Vercel 项目
2. 点击 "Functions"
3. 选择一个函数（如 `api/index.js`）
4. 查看实时日志

### 监控性能

1. 进入 Vercel 项目
2. 点击 "Analytics"
3. 查看访问量、响应时间等指标

## 💰 费用说明

### Vercel 免费套餐包含：

- ✅ 无限部署
- ✅ 100GB 带宽/月
- ✅ 100 次 Serverless Function 调用/天
- ✅ 自动 HTTPS
- ✅ 全球 CDN

对于个人项目完全够用！

### 如果超出免费额度：

- Pro 套餐：$20/月
- 包含更多带宽和函数调用次数

## 🔒 安全建议

1. ✅ **环境变量**：敏感信息（数据库密码）已通过环境变量保护
2. ✅ **HTTPS**：Vercel 自动提供 SSL 证书
3. ⚠️ **API 认证**：建议添加用户认证（JWT）
4. ⚠️ **速率限制**：建议添加 API 请求频率限制

## 🔄 更新部署

### 方式 1：通过 Git 推送（推荐）

```bash
# 修改代码
git add .
git commit -m "更新功能"
git push origin main
# Vercel 会自动部署
```

### 方式 2：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

## 📱 测试部署

部署完成后，使用以下命令测试：

```bash
# 替换为你的 Vercel URL
VERCEL_URL="https://你的域名.vercel.app"

# 测试健康检查
curl "$VERCEL_URL/api/health"

# 测试保存记录
curl -X POST "$VERCEL_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "date": "2025-12-08",
    "sets": 3,
    "reps": 10,
    "duration": 5.0,
    "contract_time": 5,
    "relax_time": 5
  }'

# 测试获取记录
curl "$VERCEL_URL/api/sessions?user_id=test_user"
```

## 🎉 完成！

恭喜！你的凯格尔运动训练器已经成功部署到 Vercel。

现在你可以：
- ✅ 通过 URL 访问应用
- ✅ 数据保存到云端数据库
- ✅ 在任何设备上使用
- ✅ 自动 HTTPS 加密
- ✅ 全球 CDN 加速

## 📞 获取帮助

- Vercel 文档：https://vercel.com/docs
- Vercel 社区：https://github.com/vercel/vercel/discussions
- 项目 Issues：https://github.com/你的用户名/kegel/issues

## 🔗 相关链接

- [Vercel 官网](https://vercel.com)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [Serverless Functions 文档](https://vercel.com/docs/functions)
- [环境变量文档](https://vercel.com/docs/environment-variables)
