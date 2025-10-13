import { db } from '../lib/database'

export interface TimelineEvent {
  id: number;
  title: string;
  description?: string;
  event_type: 'milestone' | 'task_completion' | 'meeting' | 'deadline' | 'risk' | 'change' | 'other';
  date: string;
  time?: string;
  project_id?: number;
  task_id?: number;
  stakeholder_id?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
  tags?: string;
  attachments?: string;
  user_id: number;
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
  STAKEHOLDER_ADDED = 'stakeholder_added',
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
  // 获取时间线事件
  static async getTimelineEvents(
    projectId?: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<TimelineEvent>> {
    try {
      let baseQuery = 'SELECT * FROM timeline_events'
      let countQuery = 'SELECT COUNT(*) as total FROM timeline_events'
      let whereClause = ''
      let params: any[] = []
      
      if (projectId) {
        whereClause = ' WHERE project_id = ?'
        params.push(projectId)
      }
      
      // 应用搜索条件
      if (pagination?.search) {
        const searchClause = projectId 
          ? ' AND (title LIKE ? OR description LIKE ?)' 
          : ' WHERE (title LIKE ? OR description LIKE ?)';
        whereClause += searchClause
        const searchTerm = `%${pagination.search}%`
        params.push(searchTerm, searchTerm)
      }
      
      // 获取总数
      const [countRows] = await db.query(countQuery + whereClause, params)
      const total = (countRows as any[])[0].total
      
      // 构建主查询
      let mainQuery = baseQuery + whereClause
      
      if (pagination) {
        const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = pagination
        const offset = (page - 1) * limit
        
        mainQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`
        params.push(limit, offset)
      } else {
        mainQuery += ' ORDER BY created_at DESC'
      }
      
      const [rows] = await db.query(mainQuery, params)
      const data = rows as TimelineEvent[]
      
      const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1
      
      return {
        data,
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || data.length,
          total,
          totalPages
        }
      }
    } catch (error) {
      console.error('Error fetching timeline events:', error)
      throw error
    }
  }

  // 创建时间线事件
  static async createTimelineEvent(
    event: Omit<TimelineEvent, 'id' | 'created_at'>
  ): Promise<TimelineEvent> {
    try {
      const now = new Date()
      const [result] = await db.query(
        `INSERT INTO timeline_events 
         (title, description, event_type, date, time, project_id, task_id, 
          stakeholder_id, priority, status, tags, attachments, user_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.title,
          event.description,
          event.event_type,
          event.date,
          event.time,
          event.project_id,
          event.task_id,
          event.stakeholder_id,
          event.priority,
          event.status,
          event.tags,
          event.attachments,
          event.user_id,
          now,
          now
        ]
      )
      
      const insertId = (result as any).insertId
      
      // 返回创建的事件
      const [rows] = await db.query('SELECT * FROM timeline_events WHERE id = ?', [insertId])
      return (rows as TimelineEvent[])[0]
    } catch (error) {
      console.error('Error creating timeline event:', error)
      throw error
    }
  }

  // 记录项目创建事件
  static async recordProjectCreated(
    projectId: number,
    projectName: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'other',
      title: '项目创建',
      description: `项目 "${projectName}" 已创建`,
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'completed',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 记录项目状态变更事件
  static async recordProjectStatusChanged(
    projectId: number,
    projectName: string,
    oldStatus: string,
    newStatus: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'other',
      title: '项目状态变更',
      description: `项目 "${projectName}" 状态从 "${oldStatus}" 变更为 "${newStatus}"`,
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'completed',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 记录任务创建事件
  static async recordTaskCreated(
    projectId: number,
    taskTitle: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'task_completion',
      title: '任务创建',
      description: `新任务 "${taskTitle}" 已创建`,
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'completed',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 记录任务状态变更事件
  static async recordTaskStatusChanged(
    projectId: number,
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'task_completion',
      title: '任务状态变更',
      description: `任务 "${taskTitle}" 状态从 "${oldStatus}" 变更为 "${newStatus}"`,
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'completed',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 记录里程碑达成事件
  static async recordMilestoneReached(
    projectId: number,
    milestoneName: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'milestone',
      title: '里程碑达成',
      description: `里程碑 "${milestoneName}" 已达成`,
      date: new Date().toISOString().split('T')[0],
      priority: 'high',
      status: 'completed',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 记录截止日期临近事件
  static async recordDeadlineApproaching(
    projectId: number,
    itemName: string,
    dueDate: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'deadline',
      title: '截止日期临近',
      description: `"${itemName}" 的截止日期 (${new Date(dueDate).toLocaleDateString()}) 即将到来`,
      date: new Date().toISOString().split('T')[0],
      priority: 'high',
      status: 'planned',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 记录干系人添加事件
  static async recordStakeholderAdded(
    projectId: number,
    stakeholderName: string,
    role: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'other',
      title: '干系人添加',
      description: `新干系人 "${stakeholderName}" (${role}) 已添加到项目`,
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      status: 'completed',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 记录评论添加事件
  static async recordCommentAdded(
    projectId: number,
    commentPreview: string,
    userId: number
  ): Promise<TimelineEvent> {
    return this.createTimelineEvent({
      project_id: projectId,
      event_type: 'other',
      title: '添加评论',
      description: `新评论: ${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? '...' : ''}`,
      date: new Date().toISOString().split('T')[0],
      priority: 'low',
      status: 'completed',
      user_id: userId,
      updated_at: new Date().toISOString()
    })
  }

  // 获取项目的最新活动
  static async getRecentActivity(projectId: number, limit: number = 10): Promise<TimelineEvent[]> {
    try {
      const [rows] = await db.query(
        'SELECT * FROM timeline_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
        [projectId, limit]
      )
      
      return rows as TimelineEvent[]
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      throw error
    }
  }

  // 获取用户的活动历史
  static async getUserActivity(userId: number, limit: number = 20): Promise<TimelineEvent[]> {
    try {
      const [rows] = await db.query(
        'SELECT * FROM timeline_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
      )
      
      return rows as TimelineEvent[]
    } catch (error) {
      console.error('Error fetching user activity:', error)
      throw error
    }
  }

  // 获取事件类型统计
  static async getEventTypeStats(projectId: number): Promise<Record<string, number>> {
    try {
      const [rows] = await db.query(
        'SELECT event_type, COUNT(*) as count FROM timeline_events WHERE project_id = ? GROUP BY event_type',
        [projectId]
      )

      const stats: Record<string, number> = {}
      ;(rows as any[]).forEach(row => {
        stats[row.event_type] = row.count
      })

      return stats
    } catch (error) {
      console.error('Error fetching event type stats:', error)
      throw error
    }
  }

  // 删除时间线事件
  static async deleteTimelineEvent(id: number): Promise<void> {
    try {
      await db.query(
        'DELETE FROM timeline_events WHERE id = ?',
        [id]
      )
    } catch (error) {
      console.error('Error deleting timeline event:', error)
      throw error
    }
  }

  // 删除项目的所有时间线事件
  static async deleteProjectTimeline(projectId: number): Promise<void> {
    try {
      await db.query(
        'DELETE FROM timeline_events WHERE project_id = ?',
        [projectId]
      )
    } catch (error) {
      console.error('Error deleting project timeline:', error)
      throw error
    }
  }
}