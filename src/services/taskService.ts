import { apiClient } from '../lib/database'
import { Task } from '../types'

export interface CreateTaskRequest {
  title: string;
  description?: string;
  project_id: number;
  assigned_to?: number;
  status?: string;
  priority?: string;
  due_date?: string;
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
    params?: { 
      project_id?: string | number; 
      page?: number; 
      limit?: number;
      search?: string;
      assignee_id?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse<Task>> {
    try {
      let url = '/tasks';
      const searchParams = new URLSearchParams();
      
      if (params?.project_id) {
        searchParams.append('projectId', params.project_id.toString());
      }
      
      if (params?.page) {
        searchParams.append('page', params.page.toString());
      }
      
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }

      if (params?.search) {
        searchParams.append('search', params.search);
      }

      if (params?.assignee_id) {
        searchParams.append('assigneeId', params.assignee_id.toString());
      }

      if (params?.sort_by) {
        searchParams.append('sortBy', params.sort_by);
      }

      if (params?.sort_order) {
        searchParams.append('sortOrder', params.sort_order);
      }
      
      if (searchParams.toString()) {
        url += '?' + searchParams.toString();
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

  // 更新任务工时
  static async updateTaskHours(id: number, actualHours: number): Promise<Task> {
    return this.updateTask(id, { actual_hours: actualHours });
  }

  // 获取项目的任务统计
  static async getProjectTaskStats(projectId: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    totalActualHours: number;
    completionRate: number;
  }> {
    try {
      const response = await apiClient.get<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        totalActualHours: number;
        completionRate: number;
      }>(`/projects/${projectId}/tasks/stats`);
      return response.data || {
        total: 0,
        byStatus: {},
        byPriority: {},
        totalActualHours: 0,
        completionRate: 0
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      throw error;
    }
  }

  // 搜索任务（单用户系统）
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

  // 获取即将到期的任务（单用户系统）
  static async getUpcomingTasks(days: number = 7): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>(`/tasks/upcoming?days=${days}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  }

  // 获取逾期任务（单用户系统）
  static async getOverdueTasks(): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>(`/tasks/overdue`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw error;
    }
  }

  // 批量删除任务
  static async batchDelete(taskIds: number[]): Promise<void> {
    try {
      await apiClient.delete('/tasks/batch', { task_ids: taskIds });
    } catch (error) {
      console.error('Error batch deleting tasks:', error);
      throw error;
    }
  }
}
