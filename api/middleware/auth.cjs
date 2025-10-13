const { jwtService } = require('../lib/jwt.cjs');
const { db } = require('../lib/database.cjs');

// 认证中间件
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '缺少认证令牌'
      });
    }
    
    // 检查Bearer格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: '认证令牌格式错误'
      });
    }
    
    const token = parts[1];
    
    // 验证token
    const verifyResult = jwtService.verifyToken(token);
    if (!verifyResult.success) {
      return res.status(401).json({
        success: false,
        message: verifyResult.message
      });
    }
    
    const { payload } = verifyResult;
    
    // 检查token类型
    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: '无效的令牌类型'
      });
    }
    
    // 从数据库获取用户信息
    const [userRows] = await db.query(
      'SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ?',
      [payload.userId]
    );
    
    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const user = userRows[0];
    
    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户账户已被禁用'
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '认证服务错误'
    });
  }
};

// 可选认证中间件（不强制要求登录）
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // 没有token，继续执行，但不设置用户信息
      return next();
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // token格式错误，继续执行，但不设置用户信息
      return next();
    }
    
    const token = parts[1];
    const verifyResult = jwtService.verifyToken(token);
    
    if (verifyResult.success && verifyResult.payload.type === 'access') {
      // 获取用户信息
      const [userRows] = await db.query(
        'SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ?',
        [verifyResult.payload.userId]
      );
      
      if (userRows.length > 0 && userRows[0].status === 'active') {
        req.user = userRows[0];
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    // 出错时继续执行，但不设置用户信息
    next();
  }
};

// 角色权限检查中间件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
};

// 管理员权限检查
const requireAdmin = requireRole('admin');

// 项目经理权限检查
const requireManager = requireRole(['admin', 'manager']);

// 项目成员权限检查中间件
const requireProjectMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }
    
    const userId = req.user.id;
    const userRole = req.user.role;
    const projectId = req.params.projectId || req.body.project_id || req.query.project_id;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: '缺少项目ID'
      });
    }
    
    // 管理员有所有权限
    if (userRole === 'admin') {
      return next();
    }
    
    // 检查是否为项目成员
    const [memberRows] = await db.query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: '不是项目成员'
      });
    }
    
    // 将项目角色添加到请求对象
    req.projectRole = memberRows[0].role;
    
    next();
  } catch (error) {
    console.error('项目成员权限检查错误:', error);
    res.status(500).json({
      success: false,
      message: '权限检查服务错误'
    });
  }
};

// 项目管理员权限检查
const requireProjectAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }
    
    const userId = req.user.id;
    const userRole = req.user.role;
    const projectId = req.params.projectId || req.body.project_id || req.query.project_id;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: '缺少项目ID'
      });
    }
    
    // 系统管理员有所有权限
    if (userRole === 'admin') {
      return next();
    }
    
    // 检查是否为项目管理员
    const [memberRows] = await db.query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ("admin", "manager")',
      [projectId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: '需要项目管理员权限'
      });
    }
    
    req.projectRole = memberRows[0].role;
    
    next();
  } catch (error) {
    console.error('项目管理员权限检查错误:', error);
    res.status(500).json({
      success: false,
      message: '权限检查服务错误'
    });
  }
};

// 任务权限检查中间件
const requireTaskAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }
    
    const userId = req.user.id;
    const userRole = req.user.role;
    const taskId = req.params.taskId || req.body.task_id || req.query.task_id;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: '缺少任务ID'
      });
    }
    
    // 系统管理员有所有权限
    if (userRole === 'admin') {
      return next();
    }
    
    // 检查任务访问权限
    const [taskRows] = await db.query(
      `SELECT t.*, pm.role as project_role 
       FROM tasks t
       LEFT JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
       WHERE t.id = ?`,
      [userId, taskId]
    );
    
    if (taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    const task = taskRows[0];
    
    // 检查权限：任务创建者、任务负责人或项目成员
    const hasAccess = task.user_id === userId || 
                     task.assignee_id === userId || 
                     task.project_role;
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '没有访问此任务的权限'
      });
    }
    
    req.task = task;
    req.projectRole = task.project_role;
    
    next();
  } catch (error) {
    console.error('任务权限检查错误:', error);
    res.status(500).json({
      success: false,
      message: '权限检查服务错误'
    });
  }
};

// 资源所有者权限检查
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '需要登录'
        });
      }
      
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // 系统管理员有所有权限
      if (userRole === 'admin') {
        return next();
      }
      
      // 根据资源类型检查所有权
      let resourceId, tableName, ownerField;
      
      switch (resourceType) {
        case 'project':
          resourceId = req.params.projectId || req.body.project_id;
          tableName = 'projects';
          ownerField = 'user_id';
          break;
        case 'task':
          resourceId = req.params.taskId || req.body.task_id;
          tableName = 'tasks';
          ownerField = 'user_id';
          break;
        case 'file':
          resourceId = req.params.fileId || req.body.file_id;
          tableName = 'files';
          ownerField = 'uploader_id';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: '不支持的资源类型'
          });
      }
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: '缺少资源ID'
        });
      }
      
      const [rows] = await db.query(
        `SELECT ${ownerField} FROM ${tableName} WHERE id = ?`,
        [resourceId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '资源不存在'
        });
      }
      
      if (rows[0][ownerField] !== userId) {
        return res.status(403).json({
          success: false,
          message: '只有资源所有者可以执行此操作'
        });
      }
      
      next();
    } catch (error) {
      console.error('资源所有权检查错误:', error);
      res.status(500).json({
        success: false,
        message: '权限检查服务错误'
      });
    }
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAdmin,
  requireManager,
  requireProjectMember,
  requireProjectAdmin,
  requireTaskAccess,
  requireOwnership
};