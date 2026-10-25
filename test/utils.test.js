const test = require('node:test');
const assert = require('node:assert');
const { HTMLEscaper, UUID, DateUtils, DataExporter } = require('../utils.js');

test('HTMLEscaper 转义全部危险字符', () => {
  assert.strictEqual(
    HTMLEscaper.escape(`<img src=x onerror="a">'&/`),
    '&lt;img src=x onerror=&quot;a&quot;&gt;&#x27;&amp;&#x2F;'
  );
  assert.strictEqual(HTMLEscaper.escape(123), 123, '非字符串原样返回');
});

test('UUID 生成符合格式且不重复', () => {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const seen = new Set();
  for (let i = 0; i < 100; i++) {
    const id = UUID.generate();
    assert.match(id, pattern);
    assert.ok(!seen.has(id), 'UUID 不应重复');
    seen.add(id);
  }
});

test('DateUtils.formatDate 输出本地 YYYY-MM-DD', () => {
  assert.strictEqual(DateUtils.formatDate(new Date(2026, 9, 5)), '2026-10-05');
  assert.strictEqual(DateUtils.formatDate(new Date(2026, 0, 1)), '2026-01-01');
});

test('DateUtils.streakFromDates 连续天数计算', () => {
  const day = n => {
    const t = new Date();
    t.setDate(t.getDate() - n);
    return DateUtils.formatDate(t);
  };

  assert.strictEqual(DateUtils.streakFromDates([day(2), day(1), day(0)]), 3, '连续三天');
  assert.strictEqual(DateUtils.streakFromDates([day(3), day(1), day(0)]), 2, '中间断链即停止');
  assert.strictEqual(DateUtils.streakFromDates([day(1), day(0), day(0)]), 2, '重复日期去重');
  assert.strictEqual(DateUtils.streakFromDates([day(0)]), 1, '仅今天');
  assert.strictEqual(DateUtils.streakFromDates([day(1)]), 0, '今天未训练则清零（保持历史行为）');
  assert.strictEqual(DateUtils.streakFromDates([]), 0, '空输入');
  assert.strictEqual(DateUtils.streakFromDates(['not-a-date']), 0, '非法输入忽略');
});

test('DataExporter.toCSV 表头与逗号转义', () => {
  const csv = DataExporter.toCSV([
    { date: '2026-10-25', duration: 5.5, note: 'a,b' },
    { date: '2026-10-26', duration: 3, note: 'plain' }
  ]);
  const lines = csv.split('\n');
  assert.strictEqual(lines[0], 'date,duration,note');
  assert.strictEqual(lines[1], '2026-10-25,5.5,"a,b"');
  assert.strictEqual(lines[2], '2026-10-26,3,plain');
  assert.strictEqual(DataExporter.toCSV([]), '', '空记录返回空串');
});
