import { db } from '../lib/database'
import { Reminder, ReminderType, ReminderStatus, PaginationParams, PaginatedResponse } from '../types'

export class ReminderService {
  // 获取提醒列表
  static async getReminders(
    projectId?: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Reminder>> {
    try {
      let baseQuery = 'SELECT * FROM reminders'
      let countQuery = 'SELECT COUNT(*) as total FROM reminders'
      let whereConditions: string[] = []
      let params: any[] = []

      if (projectId) {
        whereConditions.push('project_id = ?')
        params.push(projectId)
      }

      if (pagination?.search) {
        whereConditions.push('(title LIKE ? OR description LIKE ?)')
        params.push(`%${pagination.search}%`, `%${pagination.search}%`)
      }

      const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : ''
      
      // 获取总数
      const [countRows] = await db.query(countQuery + whereClause, params)
      const total = (countRows as any[])[0].total

      // 构建数据查询
      let dataQuery = baseQuery + whereClause
      
      if (pagination) {
        const { page, limit, sortBy = 'remind_at', sortOrder = 'asc' } = pagination
        dataQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`
        dataQuery += ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`
      } else {
        dataQuery += ' ORDER BY remind_at ASC'
      }

      const [dataRows] = await db.query(dataQuery, params)
      const data = (dataRows as any[]).map(row => ({
        ...row,
        recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients
      })) as Reminder[]

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
      console.error('Error fetching reminders:', error)
      throw error
    }
  }

  // 根据ID获取提醒
  static async getReminderById(id: number): Promise<Reminder | null> {
    try {
      const [rows] = await db.query(
        'SELECT * FROM reminders WHERE id = ?',
        [id]
      )
      return rows.length > 0 ? rows[0] as Reminder : null
    } catch (error) {
      console.error('Error fetching reminder:', error)
      throw error
    }
  }

  // 创建提醒
  static async createReminder(
    reminder: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Reminder> {
    try {
      const now = new Date()
      const [result] = await db.query(
        `INSERT INTO reminders (project_id, task_id, type, title, description, 
         remind_at, status, recipients, created_by, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reminder.project_id, reminder.task_id, reminder.type, reminder.title,
          reminder.description, reminder.remind_at, reminder.status,
          now, now
        ]
      )
      const insertId = (result as any).insertId
      return await this.getReminderById(insertId) as Reminder
    } catch (error) {
      console.error('Error creating reminder:', error)
      throw error
    }
  }

  // 更新提醒
  static async updateReminder(
    id: number, 
    updates: Partial<Reminder>
  ): Promise<Reminder> {
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id')
      const values = fields.map(key => {
        const value = updates[key as keyof Reminder]
        return key === 'recipients' && Array.isArray(value) ? JSON.stringify(value) : value
      })
      const setClause = fields.map(field => `${field} = ?`).join(', ')
      
      await db.query(
        `UPDATE reminders SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, new Date(), id]
      )
      
      return await this.getReminderById(id) as Reminder
    } catch (error) {
      console.error('Error updating reminder:', error)
      throw error
    }
  }

  // 删除提醒
  static async deleteReminder(id: number): Promise<void> {
    try {
      await db.query('DELETE FROM reminders WHERE id = ?', [id])
    } catch (error) {
      console.error('Error deleting reminder:', error)
      throw error
    }
  }

  // 更新提醒状态
  static async updateReminderStatus(
    id: number, 
    status: ReminderStatus
  ): Promise<Reminder> {
    return this.updateReminder(id, { status })
  }

  // 获取待发送的提醒
  static async getPendingReminders(): Promise<Reminder[]> {
    try {
      const now = new Date()
      
      const [rows] = await db.query(
        `SELECT * FROM reminders 
         WHERE status = ? AND remind_at <= ? 
         ORDER BY remind_at ASC`,
        [ReminderStatus.PENDING, now]
      )
      
      return (rows as any[]).map(row => ({
        ...row,
        recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients
      })) as Reminder[]
    } catch (error) {
      console.error('Error fetching pending reminders:', error)
      throw error
    }
  }

  // 获取即将到来的提醒
  static async getUpcomingReminders(
    hours: number = 24,
    projectId?: number
  ): Promise<Reminder[]> {
    try {
      const now = new Date()
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000)
      
      let query = `SELECT * FROM reminders 
                   WHERE status = ? AND remind_at >= ? AND remind_at <= ? 
                   ORDER BY remind_at ASC`
      let params: (ReminderStatus | Date | number)[] = [ReminderStatus.PENDING, now, futureTime]

      if (projectId) {
        query = `SELECT * FROM reminders 
                 WHERE status = ? AND remind_at >= ? AND remind_at <= ? AND project_id = ? 
                 ORDER BY remind_at ASC`
        params.push(projectId)
      }

      const [rows] = await db.query(query, params)
      
      return (rows as any[]).map(row => ({
        ...row,
        recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients
      })) as Reminder[]
    } catch (error) {
      console.error('Error fetching upcoming reminders:', error)
      throw error
    }
  }

  // 创建截止日期提醒
  static async createDeadlineReminder(
    projectId: number,
    taskId: number,
    title: string,
    dueDate: string,
    recipients: string[],
    createdBy: number,
    advanceHours: number = 24
  ): Promise<Reminder> {
    const remindAt = new Date(new Date(dueDate).getTime() - advanceHours * 60 * 60 * 1000)
    
    return this.createReminder({
      project_id: projectId,
      task_id: taskId,
      type: ReminderType.DEADLINE,
      title: `截止日期提醒: ${title}`,
      description: `任务 "${title}" 将在 ${new Date(dueDate).toLocaleString()} 到期`,
      remind_at: remindAt.toISOString(),
      status: ReminderStatus.PENDING
    })
  }

  // 创建里程碑提醒
  static async createMilestoneReminder(
    projectId: number,
    title: string,
    milestoneDate: string,
    recipients: string[],
    createdBy: number
  ): Promise<Reminder> {
    return this.createReminder({
      project_id: projectId,
      type: ReminderType.MILESTONE,
      title: `里程碑提醒: ${title}`,
      description: `项目里程碑 "${title}" 计划在 ${new Date(milestoneDate).toLocaleString()} 达成`,
      remind_at: milestoneDate,
      status: ReminderStatus.PENDING,
    })
  }

  // 创建会议提醒
  static async createMeetingReminder(
    projectId: number,
    title: string,
    meetingTime: string,
    recipients: string[],
    createdBy: number,
    advanceMinutes: number = 30
  ): Promise<Reminder> {
    const remindAt = new Date(new Date(meetingTime).getTime() - advanceMinutes * 60 * 1000)
    
    return this.createReminder({
      project_id: projectId,
      type: ReminderType.MEETING,
      title: `会议提醒: ${title}`,
      description: `会议 "${title}" 将在 ${new Date(meetingTime).toLocaleString()} 开始`,
      remind_at: remindAt.toISOString(),
      status: ReminderStatus.PENDING
    })
  }

  // 创建审查提醒
  static async createReviewReminder(
    projectId: number,
    taskId: number,
    title: string,
    reviewDate: string,
    recipients: string[],
    createdBy: number
  ): Promise<Reminder> {
    return this.createReminder({
      project_id: projectId,
      task_id: taskId,
      type: ReminderType.REVIEW,
      title: `审查提醒: ${title}`,
      description: `任务 "${title}" 需要在 ${new Date(reviewDate).toLocaleString()} 进行审查`,
      remind_at: reviewDate,
      status: ReminderStatus.PENDING
    })
  }

  // 批量标记提醒为已发送
  static async markRemindersAsSent(reminderIds: number[]): Promise<void> {
    try {
      if (reminderIds.length === 0) return
      
      const placeholders = reminderIds.map(() => '?').join(',')
      await db.query(
        `UPDATE reminders 
         SET status = ?, sent_at = ? 
         WHERE id IN (${placeholders})`,
        [ReminderStatus.SENT, new Date(), ...reminderIds]
      )
    } catch (error) {
      console.error('Error marking reminders as sent:', error)
      throw error
    }
  }

  // 获取提醒统计信息
  static async getReminderStats(projectId?: number): Promise<{
    total: number
    pending: number
    sent: number
    cancelled: number
  }> {
    try {
      let query = 'SELECT status FROM reminders'
      let params: any[] = []

      if (projectId) {
        query += ' WHERE project_id = ?'
        params.push(projectId)
      }

      const [rows] = await db.query(query, params)
      const data = rows as any[]

      const stats = {
        total: data.length,
        pending: 0,
        sent: 0,
        cancelled: 0
      }

      data.forEach(reminder => {
        switch (reminder.status) {
          case ReminderStatus.PENDING:
            stats.pending++
            break
          case ReminderStatus.SENT:
            stats.sent++
            break
          case ReminderStatus.CANCELLED:
            stats.cancelled++
            break
        }
      })

      return stats
    } catch (error) {
      console.error('Error fetching reminder stats:', error)
      throw error
    }
  }

  // 清理过期的提醒
  static async cleanupOldReminders(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)
      
      const [result] = await db.query(
        `DELETE FROM reminders 
         WHERE created_at < ? AND status IN (?, ?)`,
        [cutoffDate, ReminderStatus.SENT, ReminderStatus.CANCELLED]
      )
      
      return (result as any).affectedRows || 0
    } catch (error) {
      console.error('Error cleaning up old reminders:', error)
      throw error
    }
  }
}