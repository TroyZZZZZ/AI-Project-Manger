const express = require('express');
const { TaskService } = require('../services/taskService.cjs');
const { authenticate, requireProjectMember } = require('../middleware/auth.cjs');
const {
  validateTaskCreation,
  validateTaskUpdate,
  validateTaskComment,
  validateId,
  validatePagination,
  validateBatchOperation,
  handleValidationErrors
} = require('../middleware/validation.cjs');

const router = express.Router();

// 获取任务列表
router.get('/', authenticate, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      project_id,
      status,
      priority,
      assigned_to,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    const userId = req.user.id;
    
    // 如果指定了项目ID，检查用户是否有权限访问该项目
    if (project_id) {
      const { ProjectService } = require('../services/projectService.cjs');
      const hasAccess = await ProjectService.isProjectMember(project_id, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: '没有权限访问该项目的任务'
        });
      }
    }
    
    const result = await TaskService.getTasks({
      userId,
      projectId: project_id,
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      priority,
      assignedTo: assigned_to,
      search,
      sortBy: sort_by,
      sortOrder: sort_order
    });
    
    res.json({
      success: true,
      data: result.tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败'
    });
  }
});

// 创建任务
router.post('/', authenticate, validateTaskCreation, handleValidationErrors, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      created_by: req.user.id
    };
    
    // 检查用户是否有权限在该项目中创建任务
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(taskData.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限在该项目中创建任务'
      });
    }
    
    const task = await TaskService.createTask(taskData);
    
    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: task
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('无效')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '创建任务失败'
    });
  }
});

// 获取任务详情
router.get('/:id', authenticate, validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await TaskService.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限访问该任务
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(task.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限访问该任务'
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败'
    });
  }
});

// 更新任务
router.put('/:id', authenticate, validateId(), validateTaskUpdate, handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;
    
    // 获取任务信息以检查权限
    const existingTask = await TaskService.getTaskById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限更新该任务
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(existingTask.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限更新该任务'
      });
    }
    
    const task = await TaskService.updateTask(taskId, updateData, req.user.id);
    
    res.json({
      success: true,
      message: '任务更新成功',
      data: task
    });
  } catch (error) {
    console.error('更新任务失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('无效')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '更新任务失败'
    });
  }
});

// 删除任务
router.delete('/:id', authenticate, validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // 获取任务信息以检查权限
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限删除该任务（任务创建者或项目管理员）
    const { ProjectService } = require('../services/projectService.cjs');
    const isCreator = task.created_by === req.user.id;
    const hasAdminAccess = await ProjectService.checkProjectPermission(task.project_id, req.user.id, ['admin', 'owner']);
    
    if (!isCreator && !hasAdminAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限删除该任务'
      });
    }
    
    await TaskService.deleteTask(taskId);
    
    res.json({
      success: true,
      message: '任务删除成功'
    });
  } catch (error) {
    console.error('删除任务失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '删除任务失败'
    });
  }
});

// 更新任务状态
router.put('/:id/status', authenticate, validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['todo', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的任务状态'
      });
    }
    
    // 获取任务信息以检查权限
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限更新该任务状态
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(task.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限更新该任务状态'
      });
    }
    
    const updatedTask = await TaskService.updateTaskStatus(taskId, status, req.user.id);
    
    res.json({
      success: true,
      message: '任务状态更新成功',
      data: updatedTask
    });
  } catch (error) {
    console.error('更新任务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新任务状态失败'
    });
  }
});

// 更新任务工时
router.put('/:id/hours', authenticate, validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { estimated_hours, actual_hours } = req.body;
    
    if (estimated_hours !== undefined && (isNaN(estimated_hours) || estimated_hours < 0)) {
      return res.status(400).json({
        success: false,
        message: '预估工时必须是非负数'
      });
    }
    
    if (actual_hours !== undefined && (isNaN(actual_hours) || actual_hours < 0)) {
      return res.status(400).json({
        success: false,
        message: '实际工时必须是非负数'
      });
    }
    
    // 获取任务信息以检查权限
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限更新该任务工时
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(task.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限更新该任务工时'
      });
    }
    
    const updatedTask = await TaskService.updateTaskHours(taskId, {
      estimated_hours,
      actual_hours
    }, req.user.id);
    
    res.json({
      success: true,
      message: '任务工时更新成功',
      data: updatedTask
    });
  } catch (error) {
    console.error('更新任务工时失败:', error);
    res.status(500).json({
      success: false,
      message: '更新任务工时失败'
    });
  }
});

// 获取任务评论
router.get('/:id/comments', authenticate, validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    
    // 获取任务信息以检查权限
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限访问该任务的评论
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(task.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限访问该任务的评论'
      });
    }
    
    const result = await TaskService.getTaskComments(taskId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: result.comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取任务评论失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务评论失败'
    });
  }
});

// 添加任务评论
router.post('/:id/comments', authenticate, validateId(), validateTaskComment, handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { content } = req.body;
    
    // 获取任务信息以检查权限
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限添加评论
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(task.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限添加评论'
      });
    }
    
    const comment = await TaskService.addTaskComment(taskId, {
      content,
      user_id: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: '评论添加成功',
      data: comment
    });
  } catch (error) {
    console.error('添加任务评论失败:', error);
    res.status(500).json({
      success: false,
      message: '添加任务评论失败'
    });
  }
});

// 获取任务历史
router.get('/:id/history', authenticate, validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    
    // 获取任务信息以检查权限
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 检查用户是否有权限访问该任务的历史
    const { ProjectService } = require('../services/projectService.cjs');
    const hasAccess = await ProjectService.isProjectMember(task.project_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有权限访问该任务的历史'
      });
    }
    
    const result = await TaskService.getTaskHistory(taskId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: result.history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取任务历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务历史失败'
    });
  }
});

// 批量更新任务
router.post('/batch-update', authenticate, validateBatchOperation, handleValidationErrors, async (req, res) => {
  try {
    const { task_ids, updates } = req.body;
    
    // 检查所有任务的权限
    for (const taskId of task_ids) {
      const task = await TaskService.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: `任务 ${taskId} 不存在`
        });
      }
      
      const { ProjectService } = require('../services/projectService.cjs');
      const hasAccess = await ProjectService.isProjectMember(task.project_id, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `没有权限更新任务 ${taskId}`
        });
      }
    }
    
    const result = await TaskService.batchUpdateTasks(task_ids, updates, req.user.id);
    
    res.json({
      success: true,
      message: `成功更新 ${result.updated_count} 个任务`,
      data: {
        updated_count: result.updated_count,
        failed_count: result.failed_count,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('批量更新任务失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新任务失败'
    });
  }
});

// 获取我的任务
router.get('/user/my-tasks', authenticate, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      project_id
    } = req.query;
    
    const result = await TaskService.getUserTasks(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      priority,
      projectId: project_id
    });
    
    res.json({
      success: true,
      data: result.tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取我的任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的任务失败'
    });
  }
});

// 搜索任务
router.get('/search/:keyword', authenticate, async (req, res) => {
  try {
    const { keyword } = req.params;
    const { page = 1, limit = 10, project_id } = req.query;
    
    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词至少需要2个字符'
      });
    }
    
    const result = await TaskService.searchTasks({
      keyword: keyword.trim(),
      userId: req.user.id,
      projectId: project_id,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: result.tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('搜索任务失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索任务失败'
    });
  }
});

module.exports = router;