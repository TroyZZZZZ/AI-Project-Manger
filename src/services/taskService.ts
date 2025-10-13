import { apiClient } from '../lib/database'

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_id?: number;
  assignee_id?: number;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class TaskService {
  // 获取任务列表
  static async getTasks(
    projectId?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Task>> {
    try {
      let url = '/tasks';
      const params = new URLSearchParams();
      
      if (projectId) {
        params.append('projectId', projectId);
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
        if (pagination.search) params.append('search', pagination.search);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await apiClient.get<PaginatedResponse<Task>>(url);
      return response.data || {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  // 根据ID获取任务
  static async getTaskById(id: number): Promise<Task | null> {
    try {
      const response = await apiClient.get<Task>(`/tasks/${id}`);
      return response.data || null;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }

  // 创建任务
  static async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    try {
      const response = await apiClient.post<Task>('/tasks', task);
      if (!response.data) {
        throw new Error('创建任务失败');
      }
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // 更新任务
  static async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    try {
      const response = await apiClient.put<Task>(`/tasks/${id}`, updates);
      if (!response.data) {
        throw new Error('更新任务失败');
      }
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // 删除任务
  static async deleteTask(id: number): Promise<void> {
    try {
      await apiClient.delete(`/tasks/${id}`);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // 更新任务状态
  static async updateTaskStatus(id: number, status: string): Promise<Task> {
    const updates: Partial<Task> = { status: status as any };
    
    // 如果任务完成，记录完成时间
    if (status === 'completed') {
      updates.updated_at = new Date().toISOString();
    }
    
    return this.updateTask(id, updates);
  }

  // 更新任务工时
  static async updateTaskHours(id: number, actualHours: number): Promise<Task> {
    return this.updateTask(id, { actual_hours: actualHours });
  }

  // 获取项目的任务统计
  static async getProjectTaskStats(projectId: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    totalEstimatedHours: number;
    totalActualHours: number;
    completionRate: number;
  }> {
    try {
      const response = await apiClient.get<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        totalEstimatedHours: number;
        totalActualHours: number;
        completionRate: number;
      }>(`/projects/${projectId}/tasks/stats`);
      return response.data || {
        total: 0,
        byStatus: {},
        byPriority: {},
        totalEstimatedHours: 0,
        totalActualHours: 0,
        completionRate: 0
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      throw error;
    }
  }

  // 获取用户分配的任务
  static async getUserTasks(userId: number): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>(`/users/${userId}/tasks`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      throw error;
    }
  }

  // 搜索任务
  static async searchTasks(query: string, projectId?: number): Promise<Task[]> {
    try {
      let url = `/tasks/search?q=${encodeURIComponent(query)}`;
      if (projectId) {
        url += `&projectId=${projectId}`;
      }
      const response = await apiClient.get<Task[]>(url);
      return response.data || [];
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  // 获取即将到期的任务
  static async getUpcomingTasks(userId: number, days: number = 7): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>(`/users/${userId}/tasks/upcoming?days=${days}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  }

  // 获取逾期任务
  static async getOverdueTasks(userId: number): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>(`/users/${userId}/tasks/overdue`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw error;
    }
  }
}