import { apiClient } from '../lib/database'

// 时间线事件接口（单用户系统）
export interface TimelineEvent {
  id: number;
  title: string;
  description?: string;
  event_type: 'milestone' | 'task_completion' | 'meeting' | 'deadline' | 'risk' | 'change' | 'other';
  date: string;
  time?: string;
  project_id?: number;
  task_id?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
  tags?: string;
  attachments?: string;
  created_at: string;
  updated_at: string;
}

export enum TimelineEventType {
  PROJECT_CREATED = 'project_created',
  PROJECT_STATUS_CHANGED = 'project_status_changed',
  TASK_CREATED = 'task_created',
  TASK_STATUS_CHANGED = 'task_status_changed',
  MILESTONE_REACHED = 'milestone_reached',
  DEADLINE_APPROACHING = 'deadline_approaching',
  COMMENT_ADDED = 'comment_added'
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

export class TimelineService {
  // 获取时间线事件（单用户系统）
  static async getTimelineEvents(
    projectId?: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<TimelineEvent>> {
    try {
      const params = new URLSearchParams();
      
      if (projectId) {
        params.append('project_id', projectId.toString());
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
        if (pagination.search) params.append('search', pagination.search);
      }
      
      const response = await apiClient.get<PaginatedResponse<TimelineEvent>>(
        `/timeline${params.toString() ? '?' + params.toString() : ''}`
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return {
        data: [],
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      throw error;
    }
  }

  // 创建时间线事件（单用户系统）
  static async createTimelineEvent(
    event: Omit<TimelineEvent, 'id' | 'created_at'>
  ): Promise<TimelineEvent> {
    try {
      const response = await apiClient.post<TimelineEvent>('/timeline', event);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to create timeline event');
    } catch (error) {
      console.error('Error creating timeline event:', error);
      throw error;
    }
  }

  // 记录项目创建事件（单用户系统）
  static async recordProjectCreated(
    projectId: number,
    projectName: string
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      title: `项目创建: ${projectName}`,
      description: `新项目 "${projectName}" 已创建`,
      event_type: 'milestone',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      project_id: projectId,
      priority: 'medium',
      status: 'completed',
      updated_at: new Date().toISOString()
    });
  }

  // 记录项目状态变更事件（单用户系统）
  static async recordProjectStatusChanged(
    projectId: number,
    projectName: string,
    oldStatus: string,
    newStatus: string
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      title: `项目状态变更: ${projectName}`,
      description: `项目 "${projectName}" 状态从 "${oldStatus}" 变更为 "${newStatus}"`,
      event_type: 'change',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      project_id: projectId,
      priority: 'medium',
      status: 'completed',
      updated_at: new Date().toISOString()
    });
  }

  // 记录任务创建事件（单用户系统）
  static async recordTaskCreated(
    projectId: number,
    taskTitle: string
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      title: `任务创建: ${taskTitle}`,
      description: `新任务 "${taskTitle}" 已创建`,
      event_type: 'task_completion',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      project_id: projectId,
      priority: 'low',
      status: 'completed',
      updated_at: new Date().toISOString()
    });
  }

  // 记录任务状态变更事件（单用户系统）
  static async recordTaskStatusChanged(
    projectId: number,
    taskTitle: string,
    oldStatus: string,
    newStatus: string
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      title: `任务状态变更: ${taskTitle}`,
      description: `任务 "${taskTitle}" 状态从 "${oldStatus}" 变更为 "${newStatus}"`,
      event_type: 'task_completion',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      project_id: projectId,
      priority: 'low',
      status: 'completed',
      updated_at: new Date().toISOString()
    });
  }

  // 获取最近活动（单用户系统）
  static async getRecentActivity(projectId: number, limit: number = 10): Promise<TimelineEvent[]> {
    try {
      const response = await apiClient.get<TimelineEvent[]>(
        `/timeline/recent?project_id=${projectId}&limit=${limit}`
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  // 获取事件类型统计（单用户系统）
  static async getEventTypeStats(projectId: number): Promise<Record<string, number>> {
    try {
      const response = await apiClient.get<Record<string, number>>(
        `/timeline/stats?project_id=${projectId}`
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return {};
    } catch (error) {
      console.error('Error fetching event type stats:', error);
      throw error;
    }
  }

  // 删除时间线事件
  static async deleteTimelineEvent(id: number): Promise<void> {
    try {
      const response = await apiClient.delete(`/timeline/${id}`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete timeline event');
      }
    } catch (error) {
      console.error('Error deleting timeline event:', error);
      throw error;
    }
  }

  // 删除项目相关的所有时间线事件
  static async deleteProjectTimeline(projectId: number): Promise<void> {
    try {
      const response = await apiClient.delete(`/timeline/project/${projectId}`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete project timeline');
      }
    } catch (error) {
      console.error('Error deleting project timeline:', error);
      throw error;
    }
  }
}