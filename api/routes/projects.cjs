const express = require('express');
const { ProjectService } = require('../services/projectService.cjs');
const { authenticate, requireRole, requireProjectMember } = require('../middleware/auth.cjs');
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
router.get('/', authenticate, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, priority } = req.query;
    const userId = req.user.id;
    
    const result = await ProjectService.getProjects({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      priority
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

// 创建项目
router.post('/', authenticate, validateProjectCreation, handleValidationErrors, async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      created_by: req.user.id
    };
    
    const project = await ProjectService.createProject(projectData);
    
    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: project
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    
    if (error.message.includes('已存在')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '创建项目失败'
    });
  }
});

// 获取项目详情
router.get('/:id', authenticate, validateId(), handleValidationErrors, requireProjectMember, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await ProjectService.getProjectById(projectId);
    
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
router.put('/:id', authenticate, validateId(), validateProjectUpdate, handleValidationErrors, requireProjectMember, async (req, res) => {
  try {
    const projectId = req.params.id;
    const updateData = req.body;
    
    // 检查用户是否有权限更新项目（项目管理员或创建者）
    const hasPermission = await ProjectService.checkProjectPermission(projectId, req.user.id, ['admin', 'owner']);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限更新此项目'
      });
    }
    
    const project = await ProjectService.updateProject(projectId, updateData);
    
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
    
    res.status(500).json({
      success: false,
      message: '更新项目失败'
    });
  }
});

// 删除项目
router.delete('/:id', authenticate, validateId(), handleValidationErrors, requireProjectMember, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // 检查用户是否有权限删除项目（只有创建者可以删除）
    const hasPermission = await ProjectService.checkProjectPermission(projectId, req.user.id, ['owner']);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '只有项目创建者可以删除项目'
      });
    }
    
    await ProjectService.deleteProject(projectId);
    
    res.json({
      success: true,
      message: '项目删除成功'
    });
  } catch (error) {
    console.error('删除项目失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('存在关联')) {
      return res.status(400).json({
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

// 获取项目成员
router.get('/:id/members', authenticate, validateId(), handleValidationErrors, requireProjectMember, async (req, res) => {
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

// 添加项目成员
router.post('/:id/members', authenticate, validateId(), validateProjectMember, handleValidationErrors, requireProjectMember, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id, role = 'member' } = req.body;
    
    // 检查用户是否有权限添加成员（项目管理员或创建者）
    const hasPermission = await ProjectService.checkProjectPermission(projectId, req.user.id, ['admin', 'owner']);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限添加项目成员'
      });
    }
    
    await ProjectService.addProjectMember(projectId, user_id, role);
    
    res.status(201).json({
      success: true,
      message: '项目成员添加成功'
    });
  } catch (error) {
    console.error('添加项目成员失败:', error);
    
    if (error.message.includes('已是成员')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '添加项目成员失败'
    });
  }
});

// 更新成员角色
router.put('/:id/members/:userId', authenticate, validateId(), handleValidationErrors, requireProjectMember, async (req, res) => {
  try {
    const { id: projectId, userId } = req.params;
    const { role } = req.body;
    
    if (!role || !['member', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色类型'
      });
    }
    
    // 检查用户是否有权限更新成员角色（项目管理员或创建者）
    const hasPermission = await ProjectService.checkProjectPermission(projectId, req.user.id, ['admin', 'owner']);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限更新成员角色'
      });
    }
    
    // 不能修改项目创建者的角色
    const project = await ProjectService.getProjectById(projectId);
    if (project.created_by === parseInt(userId)) {
      return res.status(400).json({
        success: false,
        message: '不能修改项目创建者的角色'
      });
    }
    
    await ProjectService.updateMemberRole(projectId, userId, role);
    
    res.json({
      success: true,
      message: '成员角色更新成功'
    });
  } catch (error) {
    console.error('更新成员角色失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '更新成员角色失败'
    });
  }
});

// 移除项目成员
router.delete('/:id/members/:userId', authenticate, validateId(), handleValidationErrors, requireProjectMember, async (req, res) => {
  try {
    const { id: projectId, userId } = req.params;
    
    // 检查用户是否有权限移除成员（项目管理员或创建者）
    const hasPermission = await ProjectService.checkProjectPermission(projectId, req.user.id, ['admin', 'owner']);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限移除项目成员'
      });
    }
    
    // 不能移除项目创建者
    const project = await ProjectService.getProjectById(projectId);
    if (project.created_by === parseInt(userId)) {
      return res.status(400).json({
        success: false,
        message: '不能移除项目创建者'
      });
    }
    
    await ProjectService.removeProjectMember(projectId, userId);
    
    res.json({
      success: true,
      message: '项目成员移除成功'
    });
  } catch (error) {
    console.error('移除项目成员失败:', error);
    
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '移除项目成员失败'
    });
  }
});

// 获取项目统计信息
router.get('/:id/stats', authenticate, validateId(), handleValidationErrors, requireProjectMember, async (req, res) => {
  try {
    const projectId = req.params.id;
    const stats = await ProjectService.getProjectStats(projectId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取项目统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目统计失败'
    });
  }
});

// 获取用户参与的所有项目
router.get('/user/all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await ProjectService.getUserProjects(userId);
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('获取用户项目失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户项目失败'
    });
  }
});

// 搜索项目
router.get('/search/:keyword', authenticate, async (req, res) => {
  try {
    const { keyword } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    
    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词至少需要2个字符'
      });
    }
    
    const result = await ProjectService.searchProjects({
      keyword: keyword.trim(),
      userId,
      page: parseInt(page),
      limit: parseInt(limit)
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
    console.error('搜索项目失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索项目失败'
    });
  }
});

module.exports = router;