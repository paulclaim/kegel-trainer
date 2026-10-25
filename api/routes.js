// API 路由模块
const express = require('express');
const router = express.Router();
const { pool } = require('./db');
const {
  validateUserId,
  sanitizePagination,
  validateSessionPayload
} = require('./validate');

// 获取训练记录
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!validateUserId(userId)) {
      return res.status(400).json({
        success: false,
        error: '缺少 user_id 参数或格式无效'
      });
    }

    const { limit, offset } = sanitizePagination(req.query);

    const [rows] = await pool.query(
      `SELECT id, client_id, date, sets, reps, duration, contract_time, relax_time, created_at
       FROM kegel_sessions
       WHERE user_id = ?
       ORDER BY date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('获取训练记录失败:', error);
    res.status(500).json({
      success: false,
      error: '获取训练记录失败'
    });
  }
});

// 保存训练记录
router.post('/sessions', async (req, res) => {
  try {
    const { valid, errors, values } = validateSessionPayload(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: errors.join('；')
      });
    }
    const clientId = values.client_id || null;

    // 带 client_id 时按其幂等去重：重复提交不会产生新记录
    const [result] = await pool.query(
      `INSERT INTO kegel_sessions
       (user_id, client_id, date, sets, reps, duration, contract_time, relax_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ${clientId ? 'ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)' : ''}`,
      [
        values.user_id,
        clientId,
        values.date,
        values.sets,
        values.reps,
        values.duration,
        values.contract_time,
        values.relax_time
      ]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        inserted: result.affectedRows === 1,
        message: '训练记录保存成功'
      }
    });
  } catch (error) {
    console.error('保存训练记录失败:', error);
    res.status(500).json({
      success: false,
      error: '保存训练记录失败'
    });
  }
});

// 获取统计数据
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!validateUserId(userId)) {
      return res.status(400).json({
        success: false,
        error: '缺少 user_id 参数或格式无效'
      });
    }

    // 获取总训练天数
    const [daysResult] = await pool.query(
      `SELECT COUNT(DISTINCT date) as total_days FROM kegel_sessions WHERE user_id = ?`,
      [userId]
    );

    // 获取总训练次数
    const [sessionsResult] = await pool.query(
      `SELECT COUNT(*) as total_sessions FROM kegel_sessions WHERE user_id = ?`,
      [userId]
    );

    // 获取总时长
    const [timeResult] = await pool.query(
      `SELECT SUM(duration) as total_time FROM kegel_sessions WHERE user_id = ?`,
      [userId]
    );

    // 获取连续天数（需要获取所有日期来计算）
    const [datesResult] = await pool.query(
      `SELECT DISTINCT date FROM kegel_sessions WHERE user_id = ? ORDER BY date DESC`,
      [userId]
    );

    const streak = calculateStreak(datesResult.map(row => row.date));

    res.json({
      success: true,
      data: {
        totalDays: daysResult[0].total_days || 0,
        totalSessions: sessionsResult[0].total_sessions || 0,
        totalTime: Math.round(timeResult[0].total_time || 0),
        streak: streak
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

// 删除训练记录
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.user_id;

    if (!validateUserId(userId)) {
      return res.status(400).json({
        success: false,
        error: '缺少 user_id 参数或格式无效'
      });
    }

    const recordId = parseInt(id, 10);
    if (!Number.isInteger(recordId) || recordId < 1) {
      return res.status(400).json({
        success: false,
        error: '记录 id 无效'
      });
    }

    const [result] = await pool.query(
      `DELETE FROM kegel_sessions WHERE id = ? AND user_id = ?`,
      [recordId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: '记录不存在'
      });
    }

    res.json({
      success: true,
      message: '记录删除成功'
    });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({
      success: false,
      error: '删除记录失败'
    });
  }
});

// 计算连续天数：基于 'YYYY-MM-DD' 字符串按 UTC 日界换算，与前端
// DateUtils.streakFromDates 保持同一语义（当天未训练则连击清零）。
// 修复原先 new Date('YYYY-MM-DD') 按 UTC 解析 + setHours 按服务器本地
// 时区写入导致的跨时区差一天问题
function calculateStreak(dates) {
  const dayNumbers = [...new Set(dates)]
    .map(date => Date.parse(`${date}T00:00:00Z`))
    .filter(ms => !Number.isNaN(ms))
    .map(ms => Math.floor(ms / 86400000))
    .sort((a, b) => b - a);
  if (dayNumbers.length === 0) return 0;

  const now = new Date();
  const today = Math.floor(Date.parse(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00Z`
  ) / 86400000);

  let streak = 0;
  for (const day of dayNumbers) {
    if (today - day === streak) streak++;
    else break;
  }
  return streak;
}

module.exports = router;
