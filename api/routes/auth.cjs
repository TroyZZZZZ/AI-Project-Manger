const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth.cjs');
const { validateRequest } = require('../middleware/validation.cjs');
const { AuthService } = require('../services/authService.cjs');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 登录限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: {
    success: false,
    message: '登录尝试次数过多，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 注册限流
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次注册
  message: {
    success: false,
    message: '注册尝试次数过多，请1小时后再试'
  }
});

// 验证规则
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('新密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字')
];

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post('/register', registerLimiter, registerValidation, validateRequest, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const result = await AuthService.register({ username, email, password });
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: result.user,
        accessToken: result.token,
        refreshToken: result.refreshToken
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login', loginLimiter, loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await AuthService.login({ email, password });
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: result.user,
        accessToken: result.token,
        refreshToken: result.refreshToken
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '刷新令牌不能为空'
      });
    }
    
    const result = await AuthService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        accessToken: result.token,
        refreshToken: result.refreshToken
      }
    });
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    await AuthService.logout(refreshToken);
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await AuthService.getCurrentUser(userId);
    
    if (user) {
      res.json({
        success: true,
        data: {
          user: user
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route PUT /api/auth/profile
 * @desc 更新用户资料
 * @access Private
 */
router.put('/profile', authenticateToken, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('头像必须是有效的URL')
], validateRequest, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    const user = await AuthService.updateUser(userId, updateData);
    
    res.json({
      success: true,
      message: '资料更新成功',
      data: {
        user: user
      }
    });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route PUT /api/auth/password
 * @desc 修改密码
 * @access Private
 */
router.put('/password', authenticateToken, changePasswordValidation, validateRequest, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    await AuthService.changePassword(userId, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route POST /api/auth/verify-token
 * @desc 验证访问令牌
 * @access Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '令牌不能为空'
      });
    }
    
    const user = await AuthService.verifyToken(token);
    
    if (user) {
      res.json({
        success: true,
        message: '令牌有效',
        data: {
          user: user
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    }
  } catch (error) {
    console.error('验证令牌错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;