const express = require('express');
const { StorylineService } = require('../services/storylineService.cjs');
const {
  validateStorylineCreation,
  validateStorylineUpdate,
  validateId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation.cjs');

const router = express.Router();

// 获取项目的故事线列表
router.get('/:projectId/storylines', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const { page = 1, limit = 20, sortBy = 'event_time', sortOrder = 'DESC' } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await StorylineService.getStorylines(projectId, userId, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取故事线列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取故事线列表失败'
    });
  }
});

// 创建故事线
router.post('/:projectId/storylines', validateStorylineCreation, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const { title, content = '', event_time, stakeholder_ids } = req.body || {};
    console.log('[Route][Storylines][POST] 创建请求:', { projectId, body: req.body });

    // 直接执行插入，绕过可疑实现差异
    const { db } = require('../lib/database.cjs');
    const stakeJson = Array.isArray(stakeholder_ids) && stakeholder_ids.length > 0
      ? JSON.stringify(stakeholder_ids.map((id) => parseInt(id, 10)).filter(Number.isFinite))
      : null;
    const eventTime = event_time && typeof event_time === 'string' && event_time.length >= 10
      ? (event_time.length === 10 ? `${event_time} 00:00:00` : event_time)
      : null;
    const sql = `INSERT INTO storylines (project_id, title, content, event_time, stakeholder_ids, created_by, created_at, updated_at)
                 VALUES (?, ?, ?, ${eventTime ? '?' : 'NOW()'}, ${stakeJson === null ? 'NULL' : '?'}, ?, NOW(), NOW())`;
    const params = eventTime
      ? (stakeJson === null
        ? [projectId, title, content, eventTime, userId]
        : [projectId, title, content, eventTime, stakeJson, userId])
      : (stakeJson === null
        ? [projectId, title, content, userId]
        : [projectId, title, content, stakeJson, userId]);

    console.log('[Route][Storylines][POST] 将执行SQL:', sql);
    console.log('[Route][Storylines][POST] 参数:', params);

    const undefinedIndex = params.findIndex(v => v === undefined);
    if (undefinedIndex !== -1) {
      throw new Error(`参数包含 undefined (index=${undefinedIndex})`);
    }

    const [result] = await db.query(sql, params);
    const created = await StorylineService.getStorylineById(result.insertId);

    res.status(201).json({ success: true, data: created, message: '故事线创建成功' });
  } catch (error) {
    console.error('创建故事线失败:', error);
    if (error && error.sql) { console.error('SQL语句:', error.sql); }
    const debug = process.env.NODE_ENV === 'development' ? { sql: error && error.sql ? error.sql : undefined } : undefined;
    res.status(400).json({ success: false, message: error.message || '创建故事线失败', ...(debug ? { debug } : {}) });
  }
});

// 获取故事线详情
router.get('/:projectId/storylines/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    const storyline = await StorylineService.getStorylineById(id, projectId, userId);

    if (!storyline) {
      return res.status(404).json({
        success: false,
        message: '故事线不存在'
      });
    }

    res.json({
      success: true,
      data: storyline
    });
  } catch (error) {
    console.error('获取故事线详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取故事线详情失败'
    });
  }
});

// 更新故事线
router.put('/:projectId/storylines/:id', validateStorylineUpdate, async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const updateData = req.body;

    const storyline = await StorylineService.updateStoryline(id, updateData, userId);

    res.json({
      success: true,
      data: storyline,
      message: '故事线更新成功'
    });
  } catch (error) {
    console.error('更新故事线失败:', error);
    if (error && error.sql) {
      console.error('SQL语句:', error.sql);
    }
    res.status(400).json({
      success: false,
      message: error.message || '更新故事线失败'
    });
  }
});

// 删除故事线
router.delete('/:projectId/storylines/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    await StorylineService.deleteStoryline(id, userId);

    res.json({
      success: true,
      message: '故事线删除成功'
    });
  } catch (error) {
    console.error('删除故事线失败:', error);
    if (error && error.sql) {
      console.error('SQL语句:', error.sql);
    }
    res.status(400).json({
      success: false,
      message: error.message || '删除故事线失败'
    });
  }
});

// 获取故事线统计信息
router.get('/:projectId/storylines/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    const stats = await StorylineService.getStorylineStats(projectId, userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取故事线统计失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取故事线统计失败'
    });
  }
});

module.exports = router;
