# Kegel Trainer 服务管理命令

## 服务信息

- **服务标识**: `com.shan.kegel-trainer`
- **Domain Target**: `gui/501` (用户级服务)
- **配置文件**: `~/Library/LaunchAgents/com.shan.kegel-trainer.plist`
- **服务端口**: `10003`
- **日志文件**: `~/Library/Logs/kegel-trainer.log`
- **错误日志**: `~/Library/Logs/kegel-trainer.error.log`

---

## 常用命令

### 查看服务状态

```bash
launchctl print gui/501/com.shan.kegel-trainer
```

### 启动服务

```bash
# 如果服务已加载但未运行
launchctl kickstart gui/501/com.shan.kegel-trainer

# 强制重启（即使正在运行）
launchctl kickstart -k gui/501/com.shan.kegel-trainer
```

### 停止服务

```bash
# 停止服务（会被 KeepAlive 自动重启）
launchctl kill SIGTERM gui/501/com.shan.kegel-trainer

# 如果要完全停止，需要先卸载
launchctl bootout gui/501/com.shan.kegel-trainer
```

### 加载/卸载服务

```bash
# 加载服务（首次或重新加载）
launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.shan.kegel-trainer.plist

# 卸载服务（完全停止）
launchctl bootout gui/501/com.shan.kegel-trainer
```

### 重启服务

```bash
# 方式 1：使用 kickstart -k（推荐）
launchctl kickstart -k gui/501/com.shan.kegel-trainer

# 方式 2：卸载后重新加载
launchctl bootout gui/501/com.shan.kegel-trainer
launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.shan.kegel-trainer.plist
```

### 禁用/启用服务

```bash
# 禁用服务（不随登录自动启动）
launchctl disable gui/501/com.shan.kegel-trainer

# 启用服务（随登录自动启动）
launchctl enable gui/501/com.shan.kegel-trainer
```

---

## 日志查看

### 查看标准输出日志

```bash
tail -f ~/Library/Logs/kegel-trainer.log
```

### 查看错误日志

```bash
tail -f ~/Library/Logs/kegel-trainer.error.log
```

### 查看所有日志

```bash
tail -f ~/Library/Logs/kegel-trainer.log ~/Library/Logs/kegel-trainer.error.log
```

### 清空日志

```bash
> ~/Library/Logs/kegel-trainer.log
> ~/Library/Logs/kegel-trainer.error.log
```

---

## 健康检查

```bash
# 检查服务是否响应
curl http://localhost:10003/health

# 检查首页
curl -s http://localhost:10003/ | head -5
```

---

## 故障排查

### 检查服务是否在运行

```bash
launchctl list | grep kegel
```

### 查看详细状态

```bash
launchctl print gui/501/com.shan.kegel-trainer
```

### 检查端口占用

```bash
lsof -i :10003
```

### 验证 plist 语法

```bash
plutil -lint ~/Library/LaunchAgents/com.shan.kegel-trainer.plist
```

---

## 配置文件位置

```
~/Library/LaunchAgents/com.shan.kegel-trainer.plist
```

### 编辑配置后重新加载

```bash
# 1. 编辑配置
nano ~/Library/LaunchAgents/com.shan.kegel-trainer.plist

# 2. 卸载旧服务
launchctl bootout gui/501/com.shan.kegel-trainer

# 3. 加载新配置
launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.shan.kegel-trainer.plist
```

---

## 快速命令别名（可选）

添加到 `~/.zshrc` 或 `~/.bashrc`：

```bash
# Kegel Trainer 服务管理
alias kegel-status='launchctl print gui/501/com.shan.kegel-trainer'
alias kegel-start='launchctl kickstart gui/501/com.shan.kegel-trainer'
alias kegel-restart='launchctl kickstart -k gui/501/com.shan.kegel-trainer'
alias kegel-stop='launchctl bootout gui/501/com.shan.kegel-trainer'
alias kegel-log='tail -f ~/Library/Logs/kegel-trainer.log'
alias kegel-err='tail -f ~/Library/Logs/kegel-trainer.error.log'
```

保存后执行 `source ~/.zshrc` 生效。
