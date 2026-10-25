const test = require('node:test');
const assert = require('node:assert');
const {
  isValidDateString,
  validateUserId,
  sanitizePagination,
  validateSessionPayload
} = require('../validate');

test('isValidDateString 接受合法日期', () => {
  assert.ok(isValidDateString('2026-10-25'));
  assert.ok(isValidDateString('2020-02-29'));
  assert.ok(isValidDateString('1999-01-01') === false, '2000 年以前视为无效');
});

test('isValidDateString 拒绝非法日期', () => {
  assert.ok(!isValidDateString('2026-13-01'));
  assert.ok(!isValidDateString('2026-02-30'));
  assert.ok(!isValidDateString('2026/10/25'));
  assert.ok(!isValidDateString('2026-10-25T00:00:00Z'));
  assert.ok(!isValidDateString(''));
  assert.ok(!isValidDateString(20261025));
  assert.ok(!isValidDateString(null));
});

test('validateUserId 接受新旧两种格式', () => {
  assert.ok(validateUserId('user_550e8400-e29b-41d4-a716-446655440000'));
  assert.ok(validateUserId('user_1730000000000_abc123xyz'));
});

test('validateUserId 拒绝非法输入', () => {
  assert.ok(!validateUserId(''));
  assert.ok(!validateUserId('user; DROP TABLE kegel_sessions'));
  assert.ok(!validateUserId('user with space'));
  assert.ok(!validateUserId('a'.repeat(65)));
  assert.ok(!validateUserId(undefined));
  assert.ok(!validateUserId(123));
});

test('sanitizePagination 默认值与上限', () => {
  assert.deepStrictEqual(sanitizePagination({}), { limit: 100, offset: 0 });
  assert.deepStrictEqual(sanitizePagination({ limit: '50', offset: '10' }), { limit: 50, offset: 10 });
  assert.deepStrictEqual(sanitizePagination({ limit: '99999', offset: '-5' }), { limit: 100, offset: 0 });
  assert.strictEqual(sanitizePagination({ limit: '500' }).limit, 500);
  assert.strictEqual(sanitizePagination({ limit: '501' }).limit, 100);
});

test('validateSessionPayload 接受合法载荷并保留 client_id', () => {
  const result = validateSessionPayload({
    user_id: 'user_abc',
    date: '2026-10-25',
    sets: 3,
    reps: 10,
    duration: 5.5,
    contract_time: 5,
    relax_time: 5,
    client_id: '550e8400-e29b-41d4-a716-446655440000'
  });
  assert.ok(result.valid, JSON.stringify(result.errors));
  assert.strictEqual(result.values.client_id, '550e8400-e29b-41d4-a716-446655440000');
  assert.strictEqual(result.values.duration, 5.5);
});

test('validateSessionPayload 拒绝越界与非法字段', () => {
  const cases = [
    { sets: 0 }, { sets: 21 }, { reps: 0 }, { reps: 101 },
    { contract_time: 0 }, { relax_time: 601 }, { duration: -1 }, { duration: 1441 },
    { date: '2026-02-30' }, { user_id: 'bad id' }
  ];
  for (const override of cases) {
    const body = {
      user_id: 'user_abc', date: '2026-10-25', sets: 3, reps: 10,
      duration: 5.5, contract_time: 5, relax_time: 5, ...override
    };
    const result = validateSessionPayload(body);
    assert.ok(!result.valid, `应拒绝: ${JSON.stringify(override)}`);
  }
});

test('validateSessionPayload 超长与非法 client_id 被拒绝', () => {
  const body = {
    user_id: 'user_abc', date: '2026-10-25', sets: 3, reps: 10,
    duration: 5.5, contract_time: 5, relax_time: 5,
    client_id: 'x'.repeat(37)
  };
  assert.ok(!validateSessionPayload(body).valid);
  assert.ok(validateSessionPayload({ ...body, client_id: 'client-abc_123' }).valid);
});

test('validateSessionPayload duration 保留一位小数', () => {
  const result = validateSessionPayload({
    user_id: 'user_abc', date: '2026-10-25', sets: 3, reps: 10,
    duration: 5.555, contract_time: 5, relax_time: 5
  });
  assert.ok(result.valid);
  assert.strictEqual(result.values.duration, 5.6);
});
