import { apiClient } from '../lib/database'

export interface Stakeholder {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  company?: string;
  influence_level: 'low' | 'medium' | 'high' | 'critical';
  interest_level: 'low' | 'medium' | 'high' | 'critical';
  communication_preference: 'email' | 'phone' | 'meeting' | 'chat';
  notes?: string;
  project_id?: number;
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

export class StakeholderService {
  // 获取干系人列表
  static async getStakeholders(
    projectId?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Stakeholder>> {
    try {
      let url = '/stakeholders';
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
      
      const response = await apiClient.get<PaginatedResponse<Stakeholder>>(url);
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
      console.error('Error fetching stakeholders:', error);
      throw error;
    }
  }

  // 根据ID获取干系人
  static async getStakeholderById(id: number): Promise<Stakeholder | null> {
    try {
      const response = await apiClient.get<Stakeholder>(`/stakeholders/${id}`);
      return response.data || null;
    } catch (error) {
      console.error('Error fetching stakeholder:', error);
      return null;
    }
  }

  // 创建干系人
  static async createStakeholder(
    stakeholder: Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Stakeholder> {
    try {
      const response = await apiClient.post<Stakeholder>('/stakeholders', stakeholder);
      if (!response.data) {
        throw new Error('创建干系人失败');
      }
      return response.data;
    } catch (error) {
      console.error('Error creating stakeholder:', error);
      throw error;
    }
  }

  // 更新干系人
  static async updateStakeholder(
    id: number, 
    updates: Partial<Stakeholder>
  ): Promise<Stakeholder> {
    try {
      const response = await apiClient.put<Stakeholder>(`/stakeholders/${id}`, updates);
      if (!response.data) {
        throw new Error('更新干系人失败');
      }
      return response.data;
    } catch (error) {
      console.error('Error updating stakeholder:', error);
      throw error;
    }
  }

  // 删除干系人
  static async deleteStakeholder(id: number): Promise<void> {
    try {
      await apiClient.delete(`/stakeholders/${id}`);
    } catch (error) {
      console.error('Error deleting stakeholder:', error);
      throw error;
    }
  }

  // 获取项目的干系人
  static async getProjectStakeholders(projectId: number): Promise<Stakeholder[]> {
    try {
      const response = await apiClient.get<Stakeholder[]>(`/projects/${projectId}/stakeholders`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching project stakeholders:', error);
      throw error;
    }
  }

  // 搜索干系人
  static async searchStakeholders(query: string, projectId?: number): Promise<Stakeholder[]> {
    try {
      let url = `/stakeholders/search?q=${encodeURIComponent(query)}`;
      if (projectId) {
        url += `&projectId=${projectId}`;
      }
      const response = await apiClient.get<Stakeholder[]>(url);
      return response.data || [];
    } catch (error) {
      console.error('Error searching stakeholders:', error);
      throw error;
    }
  }

  // 获取干系人统计信息
  static async getStakeholderStats(projectId?: number): Promise<{
    total: number;
    byRole: Record<string, number>;
    byInfluence: Record<string, number>;
    byInterest: Record<string, number>;
  }> {
    try {
      let url = '/stakeholders/stats';
      if (projectId) {
        url += `?projectId=${projectId}`;
      }
      const response = await apiClient.get<{
        total: number;
        byRole: Record<string, number>;
        byInfluence: Record<string, number>;
        byInterest: Record<string, number>;
      }>(url);
      return response.data || {
        total: 0,
        byRole: {},
        byInfluence: {},
        byInterest: {}
      };
    } catch (error) {
      console.error('Error fetching stakeholder stats:', error);
      throw error;
    }
  }
}