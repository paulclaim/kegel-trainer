// API 输入校验（无依赖，便于单元测试）
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{1,36}$/;

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  // new Date 对溢出日期会自动进位（如 2026-02-30 → 3 月 2 日），
  // 需要往返比对各字段才能识别
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return false;
  }
  return year >= 2000 && year <= 2100;
}

function toIntInRange(value, min, max, fallback = null) {
  const num = parseInt(value, 10);
  if (Number.isNaN(num) || num < min || num > max) return fallback;
  return num;
}

function validateUserId(userId) {
  return typeof userId === 'string' && USER_ID_RE.test(userId);
}

// 分页参数：limit 1-500（默认 100），offset >= 0（默认 0）
function sanitizePagination(query = {}) {
  return {
    limit: toIntInRange(query.limit, 1, 500, 100),
    offset: toIntInRange(query.offset, 0, Number.MAX_SAFE_INTEGER, 0)
  };
}

// 训练记录载荷校验，返回 { valid, errors, values }
function validateSessionPayload(body = {}) {
  const errors = [];
  const values = {};

  if (!validateUserId(body.user_id)) {
    errors.push('user_id 缺失或格式无效');
  } else {
    values.user_id = body.user_id;
  }

  if (!isValidDateString(body.date)) {
    errors.push('date 应为合法的 YYYY-MM-DD 日期');
  } else {
    values.date = body.date;
  }

  const intFields = [
    ['sets', 1, 20],
    ['reps', 1, 100],
    ['contract_time', 1, 600],
    ['relax_time', 1, 600]
  ];
  for (const [name, min, max] of intFields) {
    const value = toIntInRange(body[name], min, max);
    if (value === null) {
      errors.push(`${name} 应为 ${min}-${max} 的整数`);
    } else {
      values[name] = value;
    }
  }

  const duration = Number(body.duration);
  if (!Number.isFinite(duration) || duration < 0 || duration > 1440) {
    errors.push('duration 应为 0-1440 的数值（分钟）');
  } else {
    values.duration = Math.round(duration * 10) / 10;
  }

  if (body.client_id !== undefined && body.client_id !== null) {
    if (typeof body.client_id !== 'string' || !CLIENT_ID_RE.test(body.client_id)) {
      errors.push('client_id 格式无效');
    } else {
      values.client_id = body.client_id;
    }
  }

  return { valid: errors.length === 0, errors, values };
}

module.exports = {
  isValidDateString,
  validateUserId,
  sanitizePagination,
  validateSessionPayload
};
