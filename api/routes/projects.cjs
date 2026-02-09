const express = require('express');
const { ProjectService } = require('../services/projectService.cjs');
const {
  validateProjectCreation,
  validateProjectUpdate,
  validateProjectMember,
  validateId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation.cjs');

const router = express.Router();

// 获取项目列表
router.get('/', validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, priority } = req.query;
    const userId = 1; // 固定用户ID为1，单用户系统
    
    const result = await ProjectService.getProjects({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });
    
    res.json({
      success: true,
      data: result.projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目列表失败'
    });
  }
});

// 获取项目下的子项目
router.get('/:id/subprojects', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { db } = require('../lib/database.cjs');
    
    // 从 projects 表中查找作为子项目的记录 (parent_id = projectId)
    const [subprojects] = await db.query(
      `SELECT id, name, description, status, progress 
       FROM projects 
       WHERE parent_id = ? 
       ORDER BY created_at DESC`,
      [projectId]
    );

    // 同时查找 subprojects 表 (以防万一数据分散)
    const [otherSubprojects] = await db.query(
      `SELECT id, name, description, status, progress 
       FROM subprojects 
       WHERE parent_id = ? 
       ORDER BY created_at DESC`,
      [projectId]
    );

    // 合并结果，标记来源
    const combined = [
      ...subprojects.map(p => ({ ...p, source: 'project_table' })),
      ...otherSubprojects.map(p => ({ ...p, source: 'subproject_table' }))
    ];

    res.json({
      success: true,
      data: combined
    });
  } catch (error) {
    console.error('获取子项目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取子项目列表失败'
    });
  }
});

// 创建项目
router.post('/', validateProjectCreation, handleValidationErrors, async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      created_by: 1 // 固定用户ID为1，单用户系统
    };
    
    const project = await ProjectService.createProject(projectData);
    
    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: project
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    
    // 根据错误类型返回不同的状态码和消息
    if (error.message === '项目名称已存在') {
      res.status(409).json({
        success: false,
        message: error.message
      });
    } else if (error.message === '项目名称不能为空' || error.message === '创建者ID不能为空') {
      res.status(400).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message || '创建项目失败'
      });
    }
  }
});

// 获取项目详情
router.get('/:id', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = 1; // 固定用户ID为1，单用户系统
    
    const project = await ProjectService.getProjectById(projectId, userId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目详情失败'
    });
  }
});

// 更新项目
router.put('/:id', validateId(), validateProjectUpdate, handleValidationErrors, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = 1; // 固定用户ID为1，单用户系统
    const updateData = req.body;
    
    const project = await ProjectService.updateProject(projectId, updateData, userId);
    
    res.json({
      success: true,
      message: '项目更新成功',
      data: project
    });
  } catch (error) {
    console.error('更新项目失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('权限')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '更新项目失败'
    });
  }
});

// 删除项目
router.delete('/:id', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = 1; // 固定用户ID为1，单用户系统
    
    await ProjectService.deleteProject(projectId, userId);
    
    res.json({
      success: true,
      message: '项目删除成功'
    });
  } catch (error) {
    console.error('删除项目失败:', error);

    // 记录详细错误信息到日志文件，便于排查
    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, 'api-errors.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] 删除项目失败 - 项目ID: ${req.params.id}, 用户ID: 1, 错误: ${error.message}\n堆栈: ${error.stack}\n\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (logErr) {
      console.error('写入API错误日志失败:', logErr);
    }
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('权限')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '删除项目失败'
    });
  }
});

// 获取项目统计
router.get('/:id/stats', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = 1; // 固定用户ID为1，单用户系统
    
    const stats = await ProjectService.getProjectStats(projectId, userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取项目统计失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '获取项目统计失败'
    });
  }
});

// 获取项目成员
router.get('/:id/members', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const projectId = req.params.id;
    const members = await ProjectService.getProjectMembers(projectId);
    
    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('获取项目成员失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目成员失败'
    });
  }
});

module.exports = router;
