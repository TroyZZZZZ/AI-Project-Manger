const { validationResult, body, param, query } = require('express-validator');

// 处理验证结果的中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errorMessages
    });
  }
  
  next();
};

// 用户注册验证规则
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .withMessage('用户名只能包含字母、数字、下划线和中文字符'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]+$/)
    .withMessage('密码必须包含至少一个大写字母、一个小写字母和一个数字'),
  
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('角色必须是admin、manager或member之一'),
  
  handleValidationErrors
];

// 用户登录验证规则
const validateUserLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  
  handleValidationErrors
];

// 用户更新验证规则
const validateUserUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .withMessage('用户名只能包含字母、数字、下划线和中文字符'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('角色必须是admin、manager或member之一'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('状态必须是active或inactive'),
  
  handleValidationErrors
];

// 密码修改验证规则
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('新密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]+$/)
    .withMessage('新密码必须包含至少一个大写字母、一个小写字母和一个数字'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码与新密码不匹配');
      }
      return true;
    }),
  
  handleValidationErrors
];

// 项目创建验证规则
const validateProjectCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('项目名称长度必须在1-100个字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('项目描述不能超过1000个字符'),
  
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('项目状态必须是有效值'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('项目优先级必须是有效值'),
  
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式无效'),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式无效')
    .custom((value, { req }) => {
      if (value && req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('结束日期必须晚于开始日期');
      }
      return true;
    }),
  
  handleValidationErrors
];

// 项目更新验证规则
const validateProjectUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('项目名称长度必须在1-100个字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('项目描述不能超过1000个字符'),
  
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('项目状态必须是有效值'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('项目优先级必须是有效值'),
  
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式无效'),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式无效'),
  
  handleValidationErrors
];

// 任务创建验证规则
const validateTaskCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('任务标题长度必须在1-200个字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('任务描述不能超过2000个字符'),
  
  body('project_id')
    .isInt({ min: 1 })
    .withMessage('项目ID必须是有效的正整数'),
  
  body('assignee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('负责人ID必须是有效的正整数'),
  
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done', 'cancelled'])
    .withMessage('任务状态必须是有效值'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('任务优先级必须是有效值'),
  
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('截止日期格式无效'),
  
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('预估工时必须是非负数'),
  
  handleValidationErrors
];

// 任务更新验证规则
const validateTaskUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('任务标题长度必须在1-200个字符之间'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('任务描述不能超过2000个字符'),
  
  body('assignee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('负责人ID必须是有效的正整数'),
  
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'done', 'cancelled'])
    .withMessage('任务状态必须是有效值'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('任务优先级必须是有效值'),
  
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('截止日期格式无效'),
  
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('预估工时必须是非负数'),
  
  body('actual_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('实际工时必须是非负数'),
  
  handleValidationErrors
];

// ID参数验证
const validateId = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName}必须是有效的正整数`),
  
  handleValidationErrors
];

// 分页参数验证
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须是1-100之间的整数'),
  
  query('sortBy')
    .optional()
    .isAlpha()
    .withMessage('排序字段只能包含字母'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('排序方向必须是ASC或DESC'),
  
  handleValidationErrors
];

// 文件上传验证
const validateFileUpload = [
  body('category')
    .optional()
    .isIn(['document', 'image', 'video', 'audio', 'other'])
    .withMessage('文件分类必须是有效值'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('文件描述不能超过500个字符'),
  
  body('project_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('项目ID必须是有效的正整数'),
  
  body('task_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('任务ID必须是有效的正整数'),
  
  handleValidationErrors
];

// 项目成员验证
const validateProjectMember = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是有效的正整数'),
  
  body('role')
    .isIn(['admin', 'manager', 'member', 'viewer'])
    .withMessage('项目角色必须是有效值'),
  
  handleValidationErrors
];

// 项目成员角色更新验证
const validateProjectMemberRoleUpdate = [
  body('role')
    .isIn(['admin', 'manager', 'member', 'viewer'])
    .withMessage('项目角色必须是有效值'),
  
  handleValidationErrors
];

// 任务评论验证
const validateTaskComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('评论内容长度必须在1-1000个字符之间'),
  
  handleValidationErrors
];

// 批量操作验证
const validateBatchOperation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('必须提供至少一个ID')
    .custom((ids) => {
      if (!ids.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('所有ID必须是有效的正整数');
      }
      return true;
    }),
  
  handleValidationErrors
];

// 搜索参数验证
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在1-100个字符之间'),
  
  query('type')
    .optional()
    .isIn(['project', 'task', 'user', 'file'])
    .withMessage('搜索类型必须是有效值'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
  validateProjectCreation,
  validateProjectUpdate,
  validateTaskCreation,
  validateTaskUpdate,
  validateId,
  validatePagination,
  validateFileUpload,
  validateProjectMember,
  validateProjectMemberRoleUpdate,
  validateTaskComment,
  validateBatchOperation,
  validateSearch
};