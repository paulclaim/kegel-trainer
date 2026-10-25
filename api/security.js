// 安全中间件（无依赖，单实例部署适用）

// 基础安全响应头
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// 按来源 IP 的固定窗口限流；超限返回 429。
// 内存实现：重启清零，多实例部署时各实例独立计数
function createRateLimiter({ windowMs = 60000, max = 120 } = {}) {
  const hits = new Map();

  function prune(now) {
    for (const [key, entry] of hits) {
      if (entry.reset <= now) hits.delete(key);
    }
  }

  return function rateLimiter(req, res, next) {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    const now = Date.now();
    if (hits.size > 5000) prune(now);

    let entry = hits.get(ip);
    if (!entry || now > entry.reset) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count++;

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({
        success: false,
        error: '请求过于频繁，请稍后再试'
      });
    }
    next();
  };
}

module.exports = {
  securityHeaders,
  createRateLimiter
};
