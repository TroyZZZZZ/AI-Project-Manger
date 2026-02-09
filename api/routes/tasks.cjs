const express = require('express');
const { TaskService } = require('../services/taskService.cjs');
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
router.get('/', validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      project_id,
      projectId, // 支持前端发送的projectId参数
      priority,
      assigned_to,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    // 统一处理项目ID参数（支持两种命名方式）
    const finalProjectId = projectId || project_id;
    
    const userId = 1; // 单用户系统，固定用户ID为1
    
    console.log('Route params:', {
      userId,
      projectId: finalProjectId,
      originalProjectId: projectId,
      originalProject_id: project_id,
      page: parseInt(page),
      limit: parseInt(limit),
      assignedTo: assigned_to,
      search,
      sortBy: sort_by,
      sortOrder: sort_order
    });
    
    const result = await TaskService.getTasks({
      userId,
      projectId: finalProjectId,
      page: parseInt(page),
      limit: parseInt(limit),
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
router.post('/', validateTaskCreation, handleValidationErrors, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      created_by: 1 // 单用户系统，固定用户ID为1
    };
    
    const task = await TaskService.createTask(taskData);
    
    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: task
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    
    if (error.message.includes('不存在')) {
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
router.get('/:id', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await TaskService.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
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
router.put('/:id', validateId(), validateTaskUpdate, handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;
    
    // 检查任务是否存在
    const existingTask = await TaskService.getTaskById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    const task = await TaskService.updateTask(taskId, updateData);
    
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
    
    res.status(500).json({
      success: false,
      message: '更新任务失败'
    });
  }
});

// 删除任务
router.delete('/:id', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // 检查任务是否存在
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    await TaskService.deleteTask(taskId);
    
    res.json({
      success: true,
      message: '任务删除成功'
    });
  } catch (error) {
    console.error('删除任务失败:', error);
    res.status(500).json({
      success: false,
      message: '删除任务失败'
    });
  }
});

// 添加任务评论
router.post('/:id/comments', validateId(), validateTaskComment, handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { content } = req.body;
    const userId = 1; // 单用户系统，固定用户ID为1
    
    // 检查任务是否存在
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    const comment = await TaskService.addComment(taskId, userId, content);
    
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

// 获取任务评论
router.get('/:id/comments', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    
    // 检查任务是否存在
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    const result = await TaskService.getComments(taskId, {
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

// 更新评论
router.put('/:id/comments/:commentId', validateId(), validateTaskComment, handleValidationErrors, async (req, res) => {
  try {
    const { id: taskId, commentId } = req.params;
    const { content } = req.body;
    const userId = 1; // 单用户系统，固定用户ID为1
    
    // 检查任务是否存在
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    const comment = await TaskService.updateComment(commentId, userId, content);
    
    res.json({
      success: true,
      message: '评论更新成功',
      data: comment
    });
  } catch (error) {
    console.error('更新任务评论失败:', error);
    
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
      message: '更新任务评论失败'
    });
  }
});

// 删除评论
router.delete('/:id/comments/:commentId', validateId(), handleValidationErrors, async (req, res) => {
  try {
    const { id: taskId, commentId } = req.params;
    const userId = 1; // 单用户系统，固定用户ID为1
    
    // 检查任务是否存在
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    await TaskService.deleteComment(commentId, userId);
    
    res.json({
      success: true,
      message: '评论删除成功'
    });
  } catch (error) {
    console.error('删除任务评论失败:', error);
    
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
      message: '删除任务评论失败'
    });
  }
});

module.exports = router;
