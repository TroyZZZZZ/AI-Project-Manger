import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User | null;
  token: string | null;
  error: string | null;
}

export interface Session {
  user: User;
  token: string;
  expires_at: string;
}

export class AuthService {
  // 用户注册
  static async signUp(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      // 检查用户是否已存在
      const existingUsers = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return {
          user: null,
          token: null,
          error: '用户已存在'
        };
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12);

      // 创建用户
      const result = await db.query(
        'INSERT INTO users (email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [email, hashedPassword, name]
      );

      const userId = result.insertId;

      // 获取创建的用户信息
      const users = await db.query(
        'SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      const user = users[0];

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        user,
        token,
        error: null
      };
    } catch (error) {
      console.error('注册失败:', error);
      return {
        user: null,
        token: null,
        error: '注册失败'
      };
    }
  }

  // 用户登录
  static async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      // 查找用户
      const users = await db.query(
        'SELECT id, email, name, password_hash, avatar_url, created_at, updated_at FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return {
          user: null,
          token: null,
          error: '用户不存在'
        };
      }

      const user = users[0];

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return {
          user: null,
          token: null,
          error: '密码错误'
        };
      }

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // 移除密码字段
      const { password_hash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
        error: null
      };
    } catch (error) {
      console.error('登录失败:', error);
      return {
        user: null,
        token: null,
        error: '登录失败'
      };
    }
  }

  // 验证token
  static async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      
      // 从数据库获取最新用户信息
      const users = await db.query(
        'SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
        [decoded.userId]
      );

      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Token验证失败:', error);
      return null;
    }
  }

  // 获取当前用户
  static async getCurrentUser(token: string): Promise<User | null> {
    return this.verifyToken(token);
  }

  // 更新用户信息
  static async updateUser(userId: number, updates: Partial<Pick<User, 'name' | 'avatar_url'>>): Promise<User | null> {
    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      await db.query(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, userId]
      );

      // 返回更新后的用户信息
      const users = await db.query(
        'SELECT id, email, name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return null;
    }
  }

  // 修改密码
  static async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // 获取当前密码哈希
      const users = await db.query(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return false;
      }

      // 验证旧密码
      const isValidPassword = await bcrypt.compare(oldPassword, users[0].password_hash);
      if (!isValidPassword) {
        return false;
      }

      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // 更新密码
      await db.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, userId]
      );

      return true;
    } catch (error) {
      console.error('修改密码失败:', error);
      return false;
    }
  }

  // 登出（客户端处理，删除token）
  static async signOut(): Promise<void> {
    // 在实际应用中，可以在这里添加token黑名单逻辑
    // 目前只需要客户端删除token即可
  }
}

// 中间件：验证JWT token
export const authenticateToken = async (token: string): Promise<User | null> => {
  return AuthService.verifyToken(token);
};

// 导出类型
export type { AuthResponse, Session };