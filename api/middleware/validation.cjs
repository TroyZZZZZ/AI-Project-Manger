// 数据验证中间件
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `缺少必填字段: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
};

// 验证项目数据
const validateProject = (req, res, next) => {
  const { name } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '项目名称不能为空'
    });
  }
  
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: '项目名称不能超过100个字符'
    });
  }
  
  next();
};

// 验证任务数据
const validateTask = (req, res, next) => {
  const { title, priority } = req.body;
  
  if (!title || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '任务标题不能为空'
    });
  }
  
  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: '任务标题不能超过200个字符'
    });
  }
  
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: `无效的任务优先级，有效值: ${validPriorities.join(', ')}`
    });
  }
  
  next();
};

// 用户认证相关验证函数已移除，因为系统改为单用户模式

// 密码修改验证函数已移除，因为系统改为单用户模式

// 验证分页参数
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      message: '页码必须是大于0的整数'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: '每页数量必须是1-100之间的整数'
    });
  }
  
  req.query.page = pageNum;
  req.query.limit = limitNum;
  
  next();
};

// 验证项目创建数据
const validateProjectCreation = (req, res, next) => {
  const { name, description } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '项目名称不能为空'
    });
  }
  
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: '项目名称不能超过100个字符'
    });
  }
  
  next();
};

// 验证项目更新数据
const validateProjectUpdate = (req, res, next) => {
  const { name } = req.body;
  
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '项目名称不能为空'
      });
    }
    
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: '项目名称不能超过100个字符'
      });
    }
  }
  
  next();
};

// 验证项目成员数据
const validateProjectMember = (req, res, next) => {
  const { userId, role } = req.body;
  
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({
      success: false,
      message: '用户ID必须是有效的数字'
    });
  }
  
  const validRoles = ['admin', 'manager', 'member'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `无效的角色，有效值: ${validRoles.join(', ')}`
    });
  }
  
  next();
};

// 验证任务创建数据
const validateTaskCreation = (req, res, next) => {
  const { title, priority } = req.body;
  
  if (!title || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '任务标题不能为空'
    });
  }
  
  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: '任务标题不能超过200个字符'
    });
  }
  
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: `无效的任务优先级，有效值: ${validPriorities.join(', ')}`
    });
  }
  
  next();
};

// 验证任务更新数据
const validateTaskUpdate = (req, res, next) => {
  const { title, priority } = req.body;
  
  if (title !== undefined) {
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '任务标题不能为空'
      });
    }
    
    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: '任务标题不能超过200个字符'
      });
    }
  }
  
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: `无效的任务优先级，有效值: ${validPriorities.join(', ')}`
    });
  }
  
  next();
};

// 验证批量操作数据
const validateBatchOperation = (req, res, next) => {
  const { taskIds } = req.body;
  
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '任务ID列表不能为空'
    });
  }
  
  for (const id of taskIds) {
    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '任务ID必须是有效的数字'
      });
    }
  }
  
  next();
};

// 验证任务评论数据
const validateTaskComment = (req, res, next) => {
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '评论内容不能为空'
    });
  }
  
  if (content.length > 1000) {
    return res.status(400).json({
      success: false,
      message: '评论内容不能超过1000个字符'
    });
  }
  
  next();
};

// 验证子项目创建数据
const validateSubprojectCreation = (req, res, next) => {
  const { name, description } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '子项目名称不能为空'
    });
  }
  
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: '子项目名称不能超过100个字符'
    });
  }
  
  next();
};

// 验证子项目更新数据
const validateSubprojectUpdate = (req, res, next) => {
  const { name } = req.body;
  
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '子项目名称不能为空'
      });
    }
    
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: '子项目名称不能超过100个字符'
      });
    }
  }
  
  next();
};

// 验证故事线创建数据
const validateStorylineCreation = (req, res, next) => {
  const { title, description } = req.body;
  
  if (!title || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '故事线标题不能为空'
    });
  }
  
  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: '故事线标题不能超过200个字符'
    });
  }
  
  next();
};

// 验证故事线更新数据
const validateStorylineUpdate = (req, res, next) => {
  const { title } = req.body;
  
  if (title !== undefined) {
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '故事线标题不能为空'
      });
    }
    
    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: '故事线标题不能超过200个字符'
      });
    }
  }
  
  next();
};

// 验证干系人创建数据
const validateStakeholderCreation = (req, res, next) => {
  const { name, role, company } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '干系人姓名不能为空'
    });
  }
  
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: '干系人姓名不能超过100个字符'
    });
  }
  
  if (company && company.length > 100) {
    return res.status(400).json({
      success: false,
      message: '公司名称不能超过100个字符'
    });
  }
  
  next();
};

// 验证干系人更新数据
const validateStakeholderUpdate = (req, res, next) => {
  const { name, role, company } = req.body;
  
  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '干系人姓名不能为空'
      });
    }
    
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: '干系人姓名不能超过100个字符'
      });
    }
  }
  
  if (company !== undefined && company && company.length > 100) {
    return res.status(400).json({
      success: false,
      message: '公司名称不能超过100个字符'
    });
  }
  
  next();
};

// 验证邮箱格式
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 验证ID参数
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: `无效的${paramName}参数`
      });
    }
    
    next();
  };
};

// 清理和标准化输入数据
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // 去除首尾空格
        req.body[key] = req.body[key].trim();
        
        // 如果是空字符串，转换为null
        if (req.body[key] === '') {
          req.body[key] = null;
        }
      }
    }
  }
  
  next();
};

// 处理验证错误的中间件
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: errors.array()
    });
  }
  
  next();
};

module.exports = {
  validateRequired,
  validateProject,
  validateTask,
  validatePagination,
  validateProjectCreation,
  validateProjectUpdate,
  validateProjectMember,
  validateTaskCreation,
  validateTaskUpdate,
  validateBatchOperation,
  validateTaskComment,
  validateSubprojectCreation,
  validateSubprojectUpdate,
  validateStorylineCreation,
  validateStorylineUpdate,
  validateStakeholderCreation,
  validateStakeholderUpdate,
  validateId,
  sanitizeInput,
  handleValidationErrors
};
