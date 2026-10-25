const test = require('node:test');
const assert = require('node:assert');
const { createRateLimiter, securityHeaders } = require('../security');

function fakeRes() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function fakeReq(ip) {
  return { ip, socket: { remoteAddress: ip } };
}

test('限流器在限额内放行', () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
  for (let i = 0; i < 3; i++) {
    const res = fakeRes();
    let passed = false;
    limiter(fakeReq('10.0.0.1'), res, () => { passed = true; });
    assert.ok(passed, `第 ${i + 1} 次请求应放行`);
    assert.strictEqual(res.statusCode, 200);
  }
});

test('限流器超限返回 429 并带 Retry-After', () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 2 });
  const res = fakeRes();
  limiter(fakeReq('10.0.0.2'), res, () => {});
  limiter(fakeReq('10.0.0.2'), res, () => {});
  limiter(fakeReq('10.0.0.2'), res, () => {});
  assert.strictEqual(res.statusCode, 429);
  assert.ok(res.headers['Retry-After']);
  assert.strictEqual(res.body.error, '请求过于频繁，请稍后再试');
});

test('限流器按 IP 隔离计数', () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
  const blocked = fakeRes();
  limiter(fakeReq('10.0.0.3'), blocked, () => {});
  limiter(fakeReq('10.0.0.3'), blocked, () => {});
  assert.strictEqual(blocked.statusCode, 429);

  const other = fakeRes();
  let passed = false;
  limiter(fakeReq('10.0.0.4'), other, () => { passed = true; });
  assert.ok(passed, '不同 IP 不受影响');
});

test('securityHeaders 设置基础安全响应头', () => {
  const res = fakeRes();
  securityHeaders(fakeReq('10.0.0.5'), res, () => {});
  assert.strictEqual(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(res.headers['X-Frame-Options'], 'DENY');
  assert.strictEqual(res.headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
});
