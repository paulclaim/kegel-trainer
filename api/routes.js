// API 路由模块
const express = require('express');
const router = express.Router();
const { pool } = require('./db');

// 获取训练记录
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 user_id 参数'
      });
    }

    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

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
      error: '获取训练记录失败',
      message: error.message
    });
  }
});

// 保存训练记录
router.post('/sessions', async (req, res) => {
  try {
    const { date, sets, reps, duration, contract_time, relax_time, user_id } = req.body;
    const clientId = typeof req.body.client_id === 'string' ? req.body.client_id.slice(0, 36) : null;

    // 验证必填字段
    if (!date || !sets || !reps || !duration || !contract_time || !relax_time || !user_id) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段'
      });
    }

    // 带 client_id 时按其幂等去重：重复提交不会产生新记录
    const [result] = await pool.query(
      `INSERT INTO kegel_sessions
       (user_id, client_id, date, sets, reps, duration, contract_time, relax_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ${clientId ? 'ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)' : ''}`,
      [
        user_id,
        clientId,
        date,
        sets,
        reps,
        duration,
        contract_time,
        relax_time
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
      error: '保存训练记录失败',
      message: error.message
    });
  }
});

// 获取统计数据
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 user_id 参数'
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
      error: '获取统计数据失败',
      message: error.message
    });
  }
});

// 获取用户设置
router.get('/settings', async (req, res) => {
  try {
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 user_id 参数'
      });
    }

    const [rows] = await pool.query(
      `SELECT * FROM kegel_settings WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到用户设置'
      });
    }

    res.json({
      success: true,
      data: {
        repsPerSet: rows[0].reps_per_set,
        totalSets: rows[0].total_sets,
        contractTime: rows[0].contract_time,
        relaxTime: rows[0].relax_time,
        soundEnabled: rows[0].sound_enabled,
        reminderEnabled: rows[0].reminder_enabled,
        reminderTime: rows[0].reminder_time
      }
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取设置失败',
      message: error.message
    });
  }
});

// 保存用户设置
router.post('/settings', async (req, res) => {
  try {
    const {
      user_id,
      repsPerSet,
      totalSets,
      contractTime,
      relaxTime
    } = req.body;
    const soundEnabled = req.body.soundEnabled !== undefined ? !!req.body.soundEnabled : true;
    const reminderEnabled = req.body.reminderEnabled !== undefined ? !!req.body.reminderEnabled : false;
    const reminderTime = req.body.reminderTime || '09:00';

    // 验证必填字段
    if (!user_id || repsPerSet === undefined || totalSets === undefined ||
        contractTime === undefined || relaxTime === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段'
      });
    }

    await pool.query(
      `INSERT INTO kegel_settings
       (user_id, reps_per_set, total_sets, contract_time, relax_time,
        sound_enabled, reminder_enabled, reminder_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       reps_per_set = VALUES(reps_per_set),
       total_sets = VALUES(total_sets),
       contract_time = VALUES(contract_time),
       relax_time = VALUES(relax_time),
       sound_enabled = VALUES(sound_enabled),
       reminder_enabled = VALUES(reminder_enabled),
       reminder_time = VALUES(reminder_time)`,
      [
        user_id,
        repsPerSet,
        totalSets,
        contractTime,
        relaxTime,
        soundEnabled,
        reminderEnabled,
        reminderTime
      ]
    );

    res.json({
      success: true,
      message: '设置保存成功'
    });
  } catch (error) {
    console.error('保存设置失败:', error);
    res.status(500).json({
      success: false,
      error: '保存设置失败',
      message: error.message
    });
  }
});

// 删除训练记录
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 user_id 参数'
      });
    }

    const [result] = await pool.query(
      `DELETE FROM kegel_sessions WHERE id = ? AND user_id = ?`,
      [id, userId]
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
      error: '删除记录失败',
      message: error.message
    });
  }
});

// 计算连续天数的辅助函数
function calculateStreak(dates) {
  if (dates.length === 0) return 0;

  const sortedDates = dates.map(d => new Date(d)).sort((a, b) => b - a);
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let date of sortedDates) {
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

module.exports = router;
