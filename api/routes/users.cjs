const express = require('express');
const { AuthService } = require('../services/authService.cjs');
const { authenticate, optionalAuthenticate, requireRole } = require('../middleware/auth.cjs');
const {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
  validateId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation.cjs');

const router = express.Router();

// 用户注册
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: result
    });
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '注册失败'
    });
  }
});

// 用户登录
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    
    res.json({
      success: true,
      message: '登录成功',
      data: result
    });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(401).json({
      success: false,
      message: error.message || '登录失败'
    });
  }
});

// 刷新token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '缺少refresh token'
      });
    }
    
    const result = await AuthService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      message: 'Token刷新成功',
      data: result
    });
  } catch (error) {
    console.error('Token刷新失败:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Token刷新失败'
    });
  }
});

// 用户登出
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('用户登出失败:', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await AuthService.getCurrentUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 更新当前用户信息
router.put('/me', authenticate, validateUserUpdate, async (req, res) => {
  try {
    const user = await AuthService.updateUser(req.user.id, req.body);
    
    res.json({
      success: true,
      message: '用户信息更新成功',
      data: user
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新用户信息失败'
    });
  }
});

// 修改密码
router.put('/me/password', authenticate, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '修改密码失败'
    });
  }
});

// 请求密码重置
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱地址不能为空'
      });
    }
    
    const result = await AuthService.requestPasswordReset(email);
    
    res.json({
      success: true,
      message: result.message,
      // 开发环境返回token，生产环境不应该返回
      ...(process.env.NODE_ENV === 'development' && { resetToken: result.resetToken })
    });
  } catch (error) {
    console.error('请求密码重置失败:', error);
    res.status(500).json({
      success: false,
      message: '请求密码重置失败'
    });
  }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '重置令牌和新密码不能为空'
      });
    }
    
    const result = await AuthService.resetPassword(token, newPassword);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '重置密码失败'
    });
  }
});

// 获取用户列表（管理员功能）
router.get('/', authenticate, requireRole(['admin']), validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = ''
    } = req.query;
    
    const result = await AuthService.getUsers(
      parseInt(page),
      parseInt(limit),
      search,
      role
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 获取指定用户信息（管理员功能）
router.get('/:id', authenticate, requireRole(['admin']), validateId(), async (req, res) => {
  try {
    const user = await AuthService.getCurrentUser(parseInt(req.params.id));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 更新用户信息（管理员功能）
router.put('/:id', authenticate, requireRole(['admin']), validateId(), validateUserUpdate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await AuthService.updateUser(userId, req.body);
    
    res.json({
      success: true,
      message: '用户信息更新成功',
      data: user
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新用户信息失败'
    });
  }
});

// 更新用户状态（管理员功能）
router.put('/:id/status', authenticate, requireRole(['admin']), validateId(), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户状态'
      });
    }
    
    const userId = parseInt(req.params.id);
    const user = await AuthService.updateUserStatus(userId, status);
    
    res.json({
      success: true,
      message: '用户状态更新成功',
      data: user
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新用户状态失败'
    });
  }
});

// 更新用户角色（管理员功能）
router.put('/:id/role', authenticate, requireRole(['admin']), validateId(), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['admin', 'manager', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户角色'
      });
    }
    
    const userId = parseInt(req.params.id);
    
    // 防止用户修改自己的角色
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能修改自己的角色'
      });
    }
    
    const user = await AuthService.updateUserRole(userId, role);
    
    res.json({
      success: true,
      message: '用户角色更新成功',
      data: user
    });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新用户角色失败'
    });
  }
});

// 验证token（用于前端验证）
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '缺少token'
      });
    }
    
    const user = await AuthService.verifyToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '无效的token'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('验证token失败:', error);
    res.status(401).json({
      success: false,
      message: '无效的token'
    });
  }
});

// 清理过期token（系统维护接口）
router.post('/cleanup-tokens', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    await AuthService.cleanupExpiredTokens();
    
    res.json({
      success: true,
      message: '过期token清理完成'
    });
  } catch (error) {
    console.error('清理过期token失败:', error);
    res.status(500).json({
      success: false,
      message: '清理过期token失败'
    });
  }
});

module.exports = router;