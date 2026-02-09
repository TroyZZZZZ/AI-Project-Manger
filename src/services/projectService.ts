import { apiClient } from '../lib/database';
import { Project as ProjectType } from '../types';

// 项目接口（单用户系统）
export interface Project {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  budget?: number;
  created_at: string;
  updated_at: string;
  estimated_hours: number;
  actual_hours: number;
  project_level: number;
  tags?: string[];
  color?: string;
  parent_id?: number;
}

export class ProjectService {
  // 获取所有项目（支持筛选、分页和排序）
  static async getProjects(
    filters?: {
      search?: string;
    },
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'updated_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: Project[]; total: number }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) {
        params.append('search', filters.search);
      }
      
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await apiClient.get<any>(`/projects?${params.toString()}`);
      
      console.log('ProjectService: API响应原始数据:', response);
      console.log('ProjectService: response类型:', typeof response);
      console.log('ProjectService: response.success:', response?.success);
      console.log('ProjectService: response.data:', response?.data);
      
      // 兼容不同返回结构：优先使用顶层 data 为数组，其次尝试 data.data
      let rawList: any[] = [];
      if (Array.isArray(response)) {
        rawList = response;
      } else if (Array.isArray(response?.data)) {
        rawList = response.data;
      } else if (Array.isArray(response?.data?.data)) {
        rawList = response.data.data;
      }
      
      console.log('ProjectService: 解析到项目数组(rawList):', rawList);
      
      // 转换API返回的数据格式为前端期望的格式（单用户系统）
      const transformedData = (rawList || []).map((item: any) => {
        console.log('ProjectService: 转换项目数据:', item);
        return {
          id: item.id,
          name: item.name,
          description: item.description || '',
          start_date: item.start_date || new Date().toISOString(),
          end_date: item.end_date,
          budget: item.budget,
          created_at: item.created_at,
          updated_at: item.updated_at,
          estimated_hours: 0,
          actual_hours: 0,
          owner_id: item.owner_id?.toString() || '1',
          project_level: 1,
          tags: [],
          color: '#3B82F6',
          parent_id: item.parent_id
        };
      });
      
      console.log('ProjectService: 转换后的数据:', transformedData);
      
      const total = (response as any)?.pagination?.total
        ?? response?.data?.pagination?.total
        ?? (Array.isArray(rawList) ? rawList.length : 0);
      
      return { 
        data: transformedData, 
        total 
      };
    } catch (error) {
      console.error('获取项目列表失败:', error);
      throw new Error('获取项目列表失败');
    }
  }

  // 根据ID获取项目
  static async getProjectById(id: number | string): Promise<Project | null> {
    try {
      const sid = typeof id === 'number' ? id : (String(id).match(/^\d+$/) ? Number(id) : String(id))
      console.log('ProjectService.getProjectById: 请求项目ID:', sid);
      const response = await apiClient.get<{ success: boolean; data: any }>(`/projects/${sid}`);
      console.log('ProjectService.getProjectById: API响应:', response);
      
      // response 本身就是API响应数据 {success: true, data: {...}}
      if (response.success && response.data) {
        const projectData = response.data as any;
        console.log('ProjectService.getProjectById: 项目数据:', projectData);
        
        // 转换API返回的数据格式为前端期望的格式
        const transformedProject: Project = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description || '',
          start_date: projectData.start_date || new Date().toISOString(),
          end_date: projectData.end_date,
          budget: projectData.budget || 0,
          created_at: projectData.created_at || new Date().toISOString(),
          updated_at: projectData.updated_at || new Date().toISOString(),
          estimated_hours: 0,
          actual_hours: 0,
          project_level: 1,
          tags: [],
          color: '#3B82F6',
          parent_id: projectData.parent_id
        };
        
        console.log('ProjectService.getProjectById: 转换后的项目数据:', transformedProject);
        return transformedProject;
      }
      
      console.log('ProjectService.getProjectById: API返回失败或无数据');
      return null;
    } catch (error) {
      console.error('获取项目详情失败:', error);
      return null;
    }
  }

  // 获取项目下的子项目
  static async getSubprojects(projectId: number): Promise<Project[]> {
    try {
      const response = await apiClient.get<any>(`/projects/${projectId}/subprojects`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch subprojects', error);
      return [];
    }
  }

  // 创建项目
  static async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    try {
      const response = await apiClient.post<Project>('/projects', project)
      if (!response.success || !response.data) {
        throw new Error('创建项目失败')
      }
      return response.data
    } catch (error: any) {
      console.error('创建项目失败:', error)
      const msg = error?.message || '创建项目失败'
      if (msg.includes('项目名称已存在')) {
        throw new Error('项目名称已存在')
      }
      throw new Error(msg)
    }
  }

  // 更新项目
  static async updateProject(id: number, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<Project> {
    try {
      const response = await apiClient.put<Project>(`/projects/${id}`, updates);
      if (!response.success || !response.data) {
        throw new Error('更新项目失败');
      }
      return response.data;
    } catch (error) {
      console.error('更新项目失败:', error);
      throw new Error('更新项目失败');
    }
  }

  // 删除项目
  static async deleteProject(id: number): Promise<void> {
    try {
      await apiClient.delete(`/projects/${id}`);
    } catch (error) {
      console.error('删除项目失败:', error);
      throw new Error('删除项目失败');
    }
  }

  // 搜索项目
  static async searchProjects(query: string): Promise<Project[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Project[] }>(`/projects/search?q=${encodeURIComponent(query)}`);
      return response.data.data || [];
    } catch (error) {
      console.error('搜索项目失败:', error);
      throw new Error('搜索项目失败');
    }
  }

  // 获取即将到期的项目
  static async getUpcomingDeadlines(days: number = 7): Promise<Project[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Project[] }>(`/projects/upcoming?days=${days}`);
      return response.data.data || [];
    } catch (error) {
      console.error('获取即将到期项目失败:', error);
      throw new Error('获取即将到期项目失败');
    }
  }
}
