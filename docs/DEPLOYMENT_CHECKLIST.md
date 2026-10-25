# Vercel 部署清单

## ✅ 部署前检查

- [ ] 代码已提交到 GitHub
- [ ] 数据库信息已准备好（用户名、密码）
- [ ] 已注册 Vercel 账号

## 📝 部署步骤

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "feat: 准备部署到 Vercel"
git push origin main
```

### 2. 在 Vercel 创建项目

1. 访问 https://vercel.com
2. 登录（使用 GitHub 账号）
3. 点击 "Add New..." → "Project"
4. 选择 `kegel` 仓库
5. 点击 "Import"

### 3. 配置环境变量

在 Vercel 项目设置中添加：

```
DB_HOST=mysql.sqlpub.com
DB_PORT=3306
DB_USER=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_NAME=cloudlib
```

### 4. 部署

点击 "Deploy" 按钮，等待完成。

### 5. 测试

访问你的 Vercel URL：
- 前端：`https://你的域名.vercel.app`
- API：`https://你的域名.vercel.app/api/health`

## 🎯 快速命令

```bash
# 测试 API
curl https://你的域名.vercel.app/api/health

# 测试保存记录
curl -X POST https://你的域名.vercel.app/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","date":"2025-12-08","sets":3,"reps":10,"duration":5.0,"contract_time":5,"relax_time":5}'
```

## 📋 部署后检查

- [ ] 前端页面正常显示
- [ ] API 健康检查返回 OK
- [ ] 能够保存训练记录
- [ ] 能够读取训练记录
- [ ] 统计数据正确显示

## 🔧 常见问题

### API 返回 500 错误
→ 检查环境变量是否正确配置

### 前端无法连接 API
→ 检查浏览器控制台，查看网络请求

### 数据库连接失败
→ 确认数据库用户名和密码正确

## 📞 需要帮助？

查看详细文档：`VERCEL_DEPLOYMENT.md`
