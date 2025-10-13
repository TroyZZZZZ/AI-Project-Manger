import { apiClient } from '../lib/database'

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'member';
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'member';
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
}

export class AuthService {
  // 用户注册
  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', userData);
      if (!response.data) {
        throw new Error('注册失败');
      }
      
      // 保存token到localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('用户注册失败:', error);
      throw error;
    }
  }

  // 用户登录
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      if (!response.data) {
        throw new Error('登录失败');
      }
      
      // 保存token到localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('用户登录失败:', error);
      throw error;
    }
  }

  // 刷新token
  static async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const response = await apiClient.post<{ token: string; refreshToken: string }>('/auth/refresh', {
        refreshToken
      });
      
      if (!response.data) {
        throw new Error('刷新token失败');
      }
      
      // 更新localStorage中的token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      return response.data;
    } catch (error) {
      console.error('刷新token失败:', error);
      throw new Error('无效的refresh token');
    }
  }

  // 用户登出
  static async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // 获取当前用户信息
  static async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response.data || null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  // 更新用户信息
  static async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<User>('/auth/profile', updates);
      if (!response.data) {
        throw new Error('更新用户信息失败');
      }
      
      // 更新localStorage中的用户信息
      localStorage.setItem('user', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  // 修改密码
  static async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  // 重置密码请求
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      console.error('发送重置密码邮件失败:', error);
      throw error;
    }
  }

  // 重置密码
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      });
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  // 验证token是否有效
  static async validateToken(token: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ valid: boolean }>('/auth/validate', { token });
      return response.data?.valid || false;
    } catch (error) {
      console.error('验证token失败:', error);
      return false;
    }
  }

  // 获取本地存储的token
  static getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  // 获取本地存储的用户信息
  static getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('解析用户信息失败:', error);
      return null;
    }
  }

  // 检查用户是否已登录
  static isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  // 检查用户权限
  static hasPermission(requiredRole: 'admin' | 'manager' | 'member'): boolean {
    const user = this.getStoredUser();
    if (!user) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'manager': 2,
      'member': 1
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  // 上传头像
  static async uploadAvatar(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiClient.post<{ avatarUrl: string }>('/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (!response.data?.avatarUrl) {
        throw new Error('上传头像失败');
      }
      
      return response.data.avatarUrl;
    } catch (error) {
      console.error('上传头像失败:', error);
      throw error;
    }
  }
}