# 凯格尔运动训练器

一个功能完善的凯格尔运动训练网页应用，支持自定义训练计划、音效提示、数据管理等多项功能。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zhanghaonan11/kegel-trainer&env=DB_HOST,DB_USER,DB_PASSWORD,DB_NAME&envDescription=MySQL%20database%20connection%20settings&envLink=https://github.com/zhanghaonan11/kegel-trainer/blob/main/docs/DATABASE_SETUP.md)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/zhanghaonan11/kegel-trainer)

## ✨ 核心功能

### 训练功能
- ✅ **科学训练计划**: 可自定义每组次数、总组数、收缩/放松时间
- ✅ **训练预设**: 初级/中级/高级三种预设方案，快速开始训练
- ✅ **动画指导**: 直观的圆圈动画指导收缩和放松
- ✅ **文字提醒**: 清晰的"夹紧"、"放松"文字提示
- ✅ **音效提示**: 收缩和放松时的声音提醒（可关闭）
- ✅ **振动反馈**: 移动端支持振动提示
- ✅ **后台运行**: 支持macOS后台运行，标题栏显示进度
- ✅ **防休眠**: 训练时防止屏幕休眠

### 数据管理
- ✅ **进度跟踪**: 实时显示训练进度和完成度
- ✅ **训练统计**: 训练天数、总次数、连续天数、总时长
- ✅ **历史热力图**: 最近 15 周训练热力图与最近记录列表
- ✅ **数据导出**: 支持 JSON 和 CSV 格式导出
- ✅ **数据导入**: 支持从 JSON 文件导入历史数据（与现有记录合并去重）
- ✅ **本地存储**: 自动保存用户设置和训练记录
- ✅ **云端同步**: 训练记录支持 MySQL 存储、多设备同步（可选），
  每条记录带客户端 UUID 幂等去重，离线完成的训练自动进入待同步队列，
  联网后自动补传；统计统一基于「本地∪云端」合并结果
- ✅ **同步开关**: 前端可一键开启/关闭云端同步，显示在线/离线状态

### 用户体验
- ✅ **PWA**: 支持添加到主屏幕安装、离线打开（静态资源 Service Worker 缓存）
- ✅ **多主题**: 暗夜霓虹/清新日光/樱花粉/海洋蓝/极简黑白/跟随系统
- ✅ **自定义模态框**: 美观的提示和确认对话框
- ✅ **每日提醒**: 可设置每日训练提醒（需授权通知权限）
- ✅ **响应式设计**: 完美适配移动端和桌面端
- ✅ **错误处理**: 完善的错误处理和用户提示
- ✅ **同步状态提示**: Toast 显示同步失败/离线提示，不打扰训练

## 🚀 使用方法

### 方式 1：本地使用（纯前端）
直接在浏览器中打开 `index.html` 文件，数据保存在本地浏览器。

### 方式 2：本地使用（带数据库）
1. 配置数据库（参考 `docs/DATABASE_SETUP.md`）
2. 启动 API 服务器：
   ```bash
   cd api
   npm install
   npm start
   ```
3. 打开 `index.html`，数据自动同步到云端数据库

### 方式 3：macOS 后台服务（推荐 Mac 用户）

使用 launchd 创建用户级后台服务，开机自动启动：

```bash
# 加载并启动服务
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.shan.kegel-trainer.plist

# 查看服务状态
launchctl print gui/$(id -u)/com.shan.kegel-trainer

# 重启服务
launchctl kickstart -k gui/$(id -u)/com.shan.kegel-trainer

# 停止服务
launchctl bootout gui/$(id -u)/com.shan.kegel-trainer
```

详细命令请参考 `docs/launchctl-kegel.markdown`

### 方式 4：生产部署（Oracle VPS + GitHub Actions，当前线上架构）

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy-oracle.yml`）自动：
1. 语法检查 API 代码
2. 通过 SSH 将 `git archive` 发布包与部署脚本上传到 VPS
3. 执行 `scripts/deploy_oracle.py`：rsync 发布 → `npm install` → 重启 systemd 服务
   （`kegel-trainer.service`）→ 健康检查（`http://127.0.0.1:3010/health`），
   失败自动回滚到上一版本

需要的 Repository Secrets：`ORACLE_SSH_KEY`、`ORACLE_KNOWN_HOSTS`、`ORACLE_HOST`、
`ORACLE_USER`（、可选 `ORACLE_PORT`），以及 VPS 上的 `api/.env` 数据库配置。

### 方式 5：部署到 Vercel

一键部署到 Vercel，支持前后端一体化部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zhanghaonan11/kegel-trainer&env=DB_HOST,DB_USER,DB_PASSWORD,DB_NAME&envDescription=MySQL%20database%20connection%20settings)

**部署步骤**：
1. 点击上方按钮，登录 Vercel
2. 填写数据库环境变量：
   - `DB_HOST` - 数据库地址（如 mysql.sqlpub.com）
   - `DB_USER` - 数据库用户名
   - `DB_PASSWORD` - 数据库密码
   - `DB_NAME` - 数据库名称
3. 点击 Deploy，等待部署完成
4. 访问分配的域名即可使用

**Vercel 优势**：
- 前端 + API 一体化部署
- 自动 HTTPS
- 全球 CDN 加速
- 自动构建部署

详细步骤请查看：`docs/VERCEL_DEPLOYMENT.md`

### 方式 6：部署到 Render（一键部署）

点击下方按钮一键部署到 Render：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/zhanghaonan11/kegel-trainer)

**部署后配置**：
1. 点击按钮后，Render 会自动创建服务
2. 在 Dashboard 中配置环境变量：
   - `DB_HOST` - 数据库地址
   - `DB_USER` - 数据库用户名
   - `DB_PASSWORD` - 数据库密码
   - `DB_NAME` - 数据库名称
3. 服务会自动重新部署

### 方式 7：Python 服务器（简单）
1. 运行服务器:
   ```bash
   python3 server.py
   ```
   或指定端口:
   ```bash
   python3 server.py 8080
   ```

2. 访问地址:
   - 本地: http://localhost:8080
   - 网络: http://[你的IP地址]:8080

## ⚙️ 训练设置

### 基础设置
- **每组次数**: 5-20次 (默认10次)
- **总组数**: 1-5组 (默认3组)
- **收缩时间**: 3-10秒 (默认5秒)
- **放松时间**: 3-10秒 (默认5秒)
- **组间休息**: 10秒（固定）

### 训练预设
- **初级**: 5次/组 × 2组，收缩3秒，放松3秒
- **中级**: 10次/组 × 3组，收缩5秒，放松5秒
- **高级**: 15次/组 × 4组，收缩8秒，放松5秒

### 辅助功能
- **音效提示**: 开启/关闭训练音效
- **每日提醒**: 设置每日训练提醒时间

## 📊 数据管理

### 导出数据
1. 点击"导出"按钮
2. 选择导出格式（JSON 或 CSV）
3. 文件自动下载到本地

### 导入数据
1. 点击"导入"按钮
2. 选择之前导出的 JSON 文件
3. 确认导入（与现有记录合并去重，不会覆盖丢数据）

## 🛠️ 技术实现

### 架构优化
- **模块化设计**: 配置、工具、主逻辑分离
- **错误处理**: 完善的 try-catch 和错误提示
- **内存管理**: 正确的资源清理和释放
- **代码复用**: 提取公共函数，减少重复代码
- **前后端分离**: 前端 + RESTful API 架构

### 前端技术
- 纯前端实现，无外部依赖
- 响应式设计，适配移动端
- CSS动画 + JavaScript计时器
- LocalStorage 数据持久化
- Wake Lock API 防止休眠
- Vibration API 振动反馈
- Notification API 每日提醒
- Page Visibility API 后台运行

### 后端技术（可选）
- Node.js + Express
- MySQL 数据库
- RESTful API 设计
- Vercel Serverless Functions
- 智能同步策略（在线/离线自动切换）

## 📁 文件结构

```
kegel/
├── index.html                  # 主页面
├── style.css                   # 样式文件（主题令牌）
├── config.js                   # 配置常量
├── utils.js                    # 工具函数模块（存储/音频/日期/导出）
├── api-client.js               # API 客户端与数据同步管理器
├── script.js                   # 核心逻辑
├── manifest.webmanifest        # PWA 清单
├── sw.js                       # Service Worker（离线缓存）
├── icons/                      # PWA 图标（scripts/generate_icons.py 生成）
├── server.py                   # Python HTTP服务器（简单）
├── api/                        # 后端 API（Node.js + Express + MySQL）
│   ├── server.js               # Express 服务器（本地/VPS）
│   ├── index.js                # Vercel Serverless 入口
│   ├── db.js                   # 数据库连接与建表迁移
│   ├── routes.js               # API 路由
│   ├── validate.js             # 输入校验
│   ├── security.js             # 安全中间件（限流/响应头）
│   └── README.md               # API 文档
├── scripts/
│   ├── deploy_oracle.py        # VPS 部署脚本（Actions 调用）
│   └── generate_icons.py       # PWA 图标生成
├── .github/workflows/          # GitHub Actions 自动部署
├── docs/                       # 部署与运维文档
└── README.md                   # 项目说明
```

## 🔧 优化内容

### 代码质量
- ✅ 添加完善的错误处理
- ✅ 修复内存泄漏风险
- ✅ 消除代码重复
- ✅ 提取配置常量

### 功能增强
- ✅ 自定义模态框替代 alert
- ✅ 音效和振动反馈
- ✅ CSV 格式导出
- ✅ 数据导入功能
- ✅ 训练预设方案
- ✅ 每日提醒功能

### 性能优化
- ✅ 模块化代码结构
- ✅ 优化 DOM 操作
- ✅ 改进存储管理

## 📱 浏览器兼容性

- Chrome/Edge: 完全支持
- Safari: 完全支持
- Firefox: 完全支持（Wake Lock 可能不支持）
- 移动浏览器: 完全支持（振动功能需设备支持）

## 📝 使用建议

1. **首次使用**: 建议从初级预设开始
2. **渐进训练**: 适应后逐步提升到中级、高级
3. **坚持训练**: 每天训练，保持连续天数
4. **数据备份**: 定期导出数据以防丢失
5. **提醒设置**: 开启每日提醒，养成训练习惯

## 🔒 隐私说明

### 纯前端模式
- 所有数据仅存储在本地浏览器
- 不会上传任何数据到服务器
- 导出的数据文件由用户自行保管

### 云端同步模式（可选）
- 数据加密传输（HTTPS）
- 每个用户有独立的数据空间
- 数据库凭证通过环境变量保护
- 支持随时导出和删除数据

## 📚 文档

- **快速开始**: 查看本 README
- **当前生产部署（Oracle VPS + Actions）**: 见上文「方式 4」
- **数据库配置**: `docs/DATABASE_SETUP.md`
- **Vercel 部署**: `docs/VERCEL_DEPLOYMENT.md`
- **部署清单**: `docs/DEPLOYMENT_CHECKLIST.md`
- **macOS 服务管理**: `docs/launchctl-kegel.markdown`
- **1Panel 部署**: `docs/1PANEL_DEPLOYMENT.md`
- **API 文档**: `api/README.md`

## 🌐 在线演示

部署到 Vercel 后，你将获得一个类似这样的 URL：
- `https://kegel.vercel.app`

## 🚀 快速部署

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/kegel.git
cd kegel

# 2. 推送到你的 GitHub
git remote set-url origin https://github.com/你的用户名/kegel.git
git push

# 3. 在 Vercel 导入项目
# 访问 vercel.com，导入 GitHub 仓库

# 4. 配置环境变量并部署
# 完成！
```

## 📄 许可证

MIT License
