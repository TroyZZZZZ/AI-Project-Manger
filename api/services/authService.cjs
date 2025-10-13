const { db } = require('../lib/database.cjs');
const { jwtService } = require('../lib/jwt.cjs');
const bcrypt = require('bcryptjs');

class AuthService {
  // 用户注册
  static async register(userData) {
    try {
      // 检查邮箱是否已存在
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );
      
      if (existingUsers.length > 0) {
        throw new Error('邮箱已被注册');
      }

      // 检查用户名是否已存在
      const [existingUsernames] = await db.query(
        'SELECT id FROM users WHERE username = ?',
        [userData.username]
      );
      
      if (existingUsernames.length > 0) {
        throw new Error('用户名已被使用');
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // 创建用户
      const now = new Date();
      const [result] = await db.query(
        `INSERT INTO users (username, email, password, role, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.username,
          userData.email,
          hashedPassword,
          userData.role || 'member',
          'active',
          now,
          now
        ]
      );
      
      const userId = result.insertId;
      
      // 获取创建的用户信息
      const [users] = await db.query(
        'SELECT id, username, email, avatar, role, status, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );
      
      const user = users[0];
      
      // 生成token
      const { accessToken, refreshToken } = jwtService.generateTokenPair(user.id);
      
      // 保存refresh token
      await this.saveRefreshToken(user.id, refreshToken);
      
      return {
        user,
        token: accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('用户注册失败:', error);
      throw error;
    }
  }

  // 用户登录
  static async login(credentials) {
    try {
      // 查找用户
      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ? AND status = ?',
        [credentials.email, 'active']
      );
      
      if (users.length === 0) {
        throw new Error('邮箱或密码错误');
      }
      
      const user = users[0];
      
      // 验证密码
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new Error('邮箱或密码错误');
      }
      
      // 更新最后登录时间
      await db.query(
        'UPDATE users SET last_login = ? WHERE id = ?',
        [new Date(), user.id]
      );
      
      // 生成token
      const { accessToken, refreshToken } = jwtService.generateTokenPair(user.id);
      
      // 保存refresh token
      await this.saveRefreshToken(user.id, refreshToken);
      
      // 移除密码字段
      const { password, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        token: accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('用户登录失败:', error);
      throw error;
    }
  }

  // 刷新token
  static async refreshToken(refreshToken) {
    try {
      // 验证refresh token
      const decoded = jwtService.verifyToken(refreshToken);
      
      if (!decoded || decoded.type !== 'refresh') {
        throw new Error('无效的refresh token');
      }
      
      // 检查refresh token是否存在且有效
      const [tokens] = await db.query(
        'SELECT user_id FROM refresh_tokens WHERE token = ? AND expires_at > ? AND is_revoked = ?',
        [refreshToken, new Date(), false]
      );
      
      if (tokens.length === 0) {
        throw new Error('无效的refresh token');
      }
      
      const userId = tokens[0].user_id;
      
      // 生成新的token
      const { accessToken: newToken, refreshToken: newRefreshToken } = jwtService.generateTokenPair(userId);
      
      // 撤销旧的refresh token
      await db.query(
        'UPDATE refresh_tokens SET is_revoked = ? WHERE token = ?',
        [true, refreshToken]
      );
      
      // 保存新的refresh token
      await this.saveRefreshToken(userId, newRefreshToken);
      
      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('刷新token失败:', error);
      throw new Error('无效的refresh token');
    }
  }

  // 用户登出
  static async logout(refreshToken) {
    try {
      // 撤销refresh token
      await db.query(
        'UPDATE refresh_tokens SET is_revoked = ? WHERE token = ?',
        [true, refreshToken]
      );
    } catch (error) {
      console.error('用户登出失败:', error);
      throw error;
    }
  }

  // 验证token
  static async verifyToken(token) {
    try {
      const decoded = jwtService.verifyToken(token);
      
      if (!decoded || decoded.type === 'refresh') {
        return null;
      }
      
      // 获取用户信息
      const [users] = await db.query(
        'SELECT id, username, email, avatar, role, status, created_at, updated_at FROM users WHERE id = ? AND status = ?',
        [decoded.userId, 'active']
      );
      
      if (users.length === 0) {
        return null;
      }
      
      return users[0];
    } catch (error) {
      return null;
    }
  }

  // 获取当前用户信息
  static async getCurrentUser(userId) {
    try {
      const [users] = await db.query(
        'SELECT id, username, email, avatar, role, status, last_login, created_at, updated_at FROM users WHERE id = ? AND status = ?',
        [userId, 'active']
      );
      
      if (users.length === 0) {
        return null;
      }
      
      return users[0];
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  // 更新用户信息
  static async updateUser(userId, updates) {
    try {
      const allowedFields = ['username', 'email', 'avatar'];
      const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
      
      if (fields.length === 0) {
        throw new Error('没有可更新的字段');
      }
      
      const values = fields.map(key => updates[key]);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      await db.query(
        `UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, new Date(), userId]
      );
      
      return await this.getCurrentUser(userId);
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  // 修改密码
  static async changePassword(userId, oldPassword, newPassword) {
    try {
      // 获取用户当前密码
      const [users] = await db.query(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = users[0];
      
      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        throw new Error('原密码错误');
      }
      
      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      
      // 更新密码
      await db.query(
        'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
        [hashedNewPassword, new Date(), userId]
      );
      
      // 撤销所有refresh token
      await db.query(
        'UPDATE refresh_tokens SET is_revoked = ? WHERE user_id = ?',
        [true, userId]
      );
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  // 重置密码请求
  static async requestPasswordReset(email) {
    try {
      // 查找用户
      const [users] = await db.query(
        'SELECT id, username, email FROM users WHERE email = ? AND status = ?',
        [email, 'active']
      );
      
      if (users.length === 0) {
        // 为了安全，即使用户不存在也返回成功
        return { success: true, message: '如果邮箱存在，重置链接已发送' };
      }
      
      const user = users[0];
      
      // 生成重置token
      const resetToken = jwtService.generatePasswordResetToken(user.id);
      
      // 保存重置token到数据库
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1小时后过期
      
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at), created_at = VALUES(created_at)`,
        [user.id, resetToken, expiresAt, new Date()]
      );
      
      // 这里应该发送邮件，暂时返回token用于测试
      return {
        success: true,
        message: '重置链接已发送到您的邮箱',
        resetToken // 生产环境中应该通过邮件发送
      };
    } catch (error) {
      console.error('请求密码重置失败:', error);
      throw error;
    }
  }

  // 重置密码
  static async resetPassword(token, newPassword) {
    try {
      // 验证重置token
      const decoded = jwtService.verifyPasswordResetToken(token);
      
      if (!decoded) {
        throw new Error('无效或已过期的重置链接');
      }
      
      // 检查token是否存在且未过期
      const [tokens] = await db.query(
        'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > ? AND used = ?',
        [token, new Date(), false]
      );
      
      if (tokens.length === 0) {
        throw new Error('无效或已过期的重置链接');
      }
      
      const userId = tokens[0].user_id;
      
      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // 更新密码
      await db.query(
        'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
        [hashedPassword, new Date(), userId]
      );
      
      // 标记重置token为已使用
      await db.query(
        'UPDATE password_reset_tokens SET used = ? WHERE token = ?',
        [true, token]
      );
      
      // 撤销所有refresh token
      await db.query(
        'UPDATE refresh_tokens SET is_revoked = ? WHERE user_id = ?',
        [true, userId]
      );
      
      return { success: true, message: '密码重置成功' };
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  // 保存refresh token
  static async saveRefreshToken(userId, token) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30天后过期
    
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) 
       VALUES (?, ?, ?, ?)`,
      [userId, token, expiresAt, new Date()]
    );
  }

  // 清理过期的token
  static async cleanupExpiredTokens() {
    try {
      // 清理过期的refresh token
      await db.query(
        'DELETE FROM refresh_tokens WHERE expires_at < ? OR is_revoked = ?',
        [new Date(), true]
      );
      
      // 清理过期的密码重置token
      await db.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < ? OR used = ?',
        [new Date(), true]
      );
    } catch (error) {
      console.error('清理过期token失败:', error);
    }
  }

  // 获取用户列表（管理员功能）
  static async getUsers(page = 1, limit = 10, search = '', role = '') {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (search) {
        whereClause += ' AND (username LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
      }
      
      // 获取总数
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );
      const total = countResult[0].total;
      
      // 获取用户列表
      const [users] = await db.query(
        `SELECT id, username, email, avatar, role, status, last_login, created_at, updated_at 
         FROM users ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      
      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  // 更新用户状态（管理员功能）
  static async updateUserStatus(userId, status) {
    try {
      await db.query(
        'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
        [status, new Date(), userId]
      );
      
      // 如果禁用用户，撤销所有token
      if (status !== 'active') {
        await db.query(
          'UPDATE refresh_tokens SET is_revoked = ? WHERE user_id = ?',
          [true, userId]
        );
      }
      
      return await this.getCurrentUser(userId);
    } catch (error) {
      console.error('更新用户状态失败:', error);
      throw error;
    }
  }

  // 更新用户角色（管理员功能）
  static async updateUserRole(userId, role) {
    try {
      await db.query(
        'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
        [role, new Date(), userId]
      );
      
      return await this.getCurrentUser(userId);
    } catch (error) {
      console.error('更新用户角色失败:', error);
      throw error;
    }
  }
}

module.exports = { AuthService };