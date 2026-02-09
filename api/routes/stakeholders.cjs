const express = require('express');
const { StakeholderService } = require('../services/stakeholderService.cjs');
const {
  validateStakeholderCreation,
  validateStakeholderUpdate,
  validateId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation.cjs');

const router = express.Router();

// 获取项目的干系人列表
router.get('/:projectId/stakeholders', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const { page = 1, limit = 50, type, search, excludeResigned } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      search,
      excludeResigned: excludeResigned === 'true'
    };

    const result = await StakeholderService.getStakeholders(projectId, userId, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取干系人列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取干系人列表失败'
    });
  }
});

// 创建干系人
router.post('/:projectId/stakeholders', validateStakeholderCreation, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const stakeholderData = req.body;

    const stakeholder = await StakeholderService.createStakeholder(projectId, stakeholderData, userId);

    res.status(201).json({
      success: true,
      data: stakeholder,
      message: '干系人创建成功'
    });
  } catch (error) {
    console.error('创建干系人失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '创建干系人失败'
    });
  }
});

// 获取单个干系人详情
router.get('/:projectId/stakeholders/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    const stakeholder = await StakeholderService.getStakeholderById(id, projectId, userId);

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        message: '干系人不存在'
      });
    }

    res.json({
      success: true,
      data: stakeholder
    });
  } catch (error) {
    console.error('获取干系人详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取干系人详情失败'
    });
  }
});

// 更新干系人
router.put('/:projectId/stakeholders/:id', validateStakeholderUpdate, async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const updateData = req.body;

    // 修复参数顺序错误：updateStakeholder(id, updates, userId)
    const stakeholder = await StakeholderService.updateStakeholder(id, updateData, userId);

    res.json({
      success: true,
      data: stakeholder,
      message: '干系人更新成功'
    });
  } catch (error) {
    console.error('更新干系人失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新干系人失败'
    });
  }
});

// 删除干系人
router.delete('/:projectId/stakeholders/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    await StakeholderService.deleteStakeholder(id, projectId, userId);

    res.json({
      success: true,
      message: '干系人删除成功'
    });
  } catch (error) {
    console.error('删除干系人失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '删除干系人失败'
    });
  }
});

// 批量导入干系人
router.post('/:projectId/stakeholders/batch', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    const { stakeholders } = req.body;

    if (!Array.isArray(stakeholders) || stakeholders.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的干系人数据'
      });
    }

    const result = await StakeholderService.batchImportStakeholders(projectId, stakeholders, userId);

    res.json({
      success: true,
      data: result,
      message: `成功导入 ${result.success} 个干系人，失败 ${result.failed} 个`
    });
  } catch (error) {
    console.error('批量导入干系人失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '批量导入干系人失败'
    });
  }
});

// 获取干系人统计信息
router.get('/:projectId/stakeholders/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1

    // 验证projectId是否为有效数字
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({
        success: false,
        message: '无效的项目ID'
      });
    }

    const stats = await StakeholderService.getStakeholderStats(parseInt(projectId), userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取干系人统计失败:', error);
    
    // 根据错误类型返回不同的状态码
    if (error.message === '项目不存在或无权限') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '获取干系人统计失败'
    });
  }
});

module.exports = router;