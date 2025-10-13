import { apiClient } from '../lib/database';

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  budget?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export class ProjectService {
  // 获取用户的所有项目
  static async getProjects(userId: number): Promise<Project[]> {
    try {
      const response = await apiClient.get<Project[]>(`/projects?userId=${userId}`);
      return response.data || [];
    } catch (error) {
      console.error('获取项目列表失败:', error);
      throw new Error('获取项目列表失败');
    }
  }

  // 根据ID获取项目
  static async getProjectById(id: number, userId: number): Promise<Project | null> {
    try {
      const response = await apiClient.get<Project>(`/projects/${id}?userId=${userId}`);
      return response.data || null;
    } catch (error) {
      console.error('获取项目详情失败:', error);
      return null;
    }
  }

  // 创建项目
  static async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    try {
      const response = await apiClient.post<Project>('/projects', project);
      if (!response.data) {
        throw new Error('创建项目失败');
      }
      return response.data;
    } catch (error) {
      console.error('创建项目失败:', error);
      throw new Error('创建项目失败');
    }
  }

  // 更新项目
  static async updateProject(id: number, userId: number, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<Project> {
    try {
      const response = await apiClient.put<Project>(`/projects/${id}?userId=${userId}`, updates);
      if (!response.data) {
        throw new Error('更新项目失败');
      }
      return response.data;
    } catch (error) {
      console.error('更新项目失败:', error);
      throw new Error('更新项目失败');
    }
  }

  // 删除项目
  static async deleteProject(id: number, userId: number): Promise<void> {
    try {
      await apiClient.delete(`/projects/${id}?userId=${userId}`);
    } catch (error) {
      console.error('删除项目失败:', error);
      throw new Error('删除项目失败');
    }
  }

  // 根据状态获取项目
  static async getProjectsByStatus(status: Project['status'], userId: number): Promise<Project[]> {
    try {
      const response = await apiClient.get<Project[]>(`/projects?userId=${userId}&status=${status}`);
      return response.data || [];
    } catch (error) {
      console.error('根据状态获取项目失败:', error);
      throw new Error('根据状态获取项目失败');
    }
  }

  // 根据优先级获取项目
  static async getProjectsByPriority(priority: Project['priority'], userId: number): Promise<Project[]> {
    try {
      const response = await apiClient.get<Project[]>(`/projects?userId=${userId}&priority=${priority}`);
      return response.data || [];
    } catch (error) {
      console.error('根据优先级获取项目失败:', error);
      throw new Error('根据优先级获取项目失败');
    }
  }

  // 搜索项目
  static async searchProjects(query: string, userId: number): Promise<Project[]> {
    try {
      const response = await apiClient.get<Project[]>(`/projects/search?userId=${userId}&q=${encodeURIComponent(query)}`);
      return response.data || [];
    } catch (error) {
      console.error('搜索项目失败:', error);
      throw new Error('搜索项目失败');
    }
  }

  // 获取项目统计信息
  static async getProjectStats(userId: number): Promise<{
    total: number;
    planning: number;
    active: number;
    completed: number;
    on_hold: number;
  }> {
    try {
      const response = await apiClient.get<{
        total: number;
        planning: number;
        active: number;
        completed: number;
        on_hold: number;
      }>(`/projects/stats?userId=${userId}`);
      return response.data || {
        total: 0,
        planning: 0,
        active: 0,
        completed: 0,
        on_hold: 0,
      };
    } catch (error) {
      console.error('获取项目统计失败:', error);
      throw new Error('获取项目统计失败');
    }
  }

  // 获取即将到期的项目
  static async getUpcomingDeadlines(userId: number, days: number = 7): Promise<Project[]> {
    try {
      const response = await apiClient.get<Project[]>(`/projects/upcoming?userId=${userId}&days=${days}`);
      return response.data || [];
    } catch (error) {
      console.error('获取即将到期项目失败:', error);
      throw new Error('获取即将到期项目失败');
    }
  }
}