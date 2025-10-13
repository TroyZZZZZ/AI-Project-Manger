import { db } from '../lib/database'
import type { WorkloadStats, DashboardStats } from '../types'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns'

export interface WorkloadEntry {
  id: number;
  user_id: number;
  project_id?: number;
  task_id?: number;
  date: string;
  hours_planned: number;
  hours_actual?: number;
  description?: string;
  category: 'development' | 'meeting' | 'planning' | 'testing' | 'documentation' | 'other';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface WorkloadSummary {
  date: string;
  total_planned: number;
  total_actual: number;
  utilization_rate: number;
  entries: WorkloadEntry[];
}

export class WorkloadService {
  // 获取项目工作量统计
  static async getProjectWorkloadStats(projectId: number, userId: number): Promise<WorkloadStats> {
    try {
      const entries = await db.query(
        'SELECT * FROM workload_entries WHERE project_id = ? AND user_id = ? ORDER BY date DESC',
        [projectId, userId]
      );

      const totalPlanned = entries.reduce((sum, entry) => sum + (entry.hours_planned || 0), 0)
      const totalActual = entries.reduce((sum, entry) => sum + (entry.hours_actual || 0), 0)
      const utilizationRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

      // 按类别统计
      const byCategory = entries.reduce((acc, entry) => {
        const category = entry.category || 'other'
        if (!acc[category]) {
          acc[category] = { planned: 0, actual: 0, count: 0 }
        }
        acc[category].planned += entry.hours_planned || 0
        acc[category].actual += entry.hours_actual || 0
        acc[category].count += 1
        return acc
      }, {} as Record<string, { planned: number; actual: number; count: number }>)

      // 按状态统计
      const byStatus = entries.reduce((acc, entry) => {
        const status = entry.status || 'planned'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        total_entries: entries.length,
        total_planned_hours: totalPlanned,
        total_actual_hours: totalActual,
        average_utilization: utilizationRate,
        by_category: byCategory,
        by_status: byStatus,
        by_project: {}
      }
    } catch (error) {
      console.error('获取项目工作量统计失败:', error)
      throw new Error('获取项目工作量统计失败')
    }
  }

  // 获取用户工作量统计
  static async getUserWorkloadStats(userId: number): Promise<WorkloadStats> {
    try {
      const entries = await db.query(
        'SELECT * FROM workload_entries WHERE user_id = ? ORDER BY date DESC',
        [userId]
      );

      const totalPlanned = entries.reduce((sum, entry) => sum + (entry.hours_planned || 0), 0)
      const totalActual = entries.reduce((sum, entry) => sum + (entry.hours_actual || 0), 0)
      const utilizationRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

      // 按类别统计
      const byCategory = entries.reduce((acc, entry) => {
        const category = entry.category || 'other'
        if (!acc[category]) {
          acc[category] = { planned: 0, actual: 0, count: 0 }
        }
        acc[category].planned += entry.hours_planned || 0
        acc[category].actual += entry.hours_actual || 0
        acc[category].count += 1
        return acc
      }, {} as Record<string, { planned: number; actual: number; count: number }>)

      // 按状态统计
      const byStatus = entries.reduce((acc, entry) => {
        const status = entry.status || 'planned'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // 按项目统计
      const byProject = entries.reduce((acc, entry) => {
        if (entry.project_id) {
          const projectId = entry.project_id.toString()
          if (!acc[projectId]) {
            acc[projectId] = { planned: 0, actual: 0, count: 0 }
          }
          acc[projectId].planned += entry.hours_planned || 0
          acc[projectId].actual += entry.hours_actual || 0
          acc[projectId].count += 1
        }
        return acc
      }, {} as Record<string, { planned: number; actual: number; count: number }>)

      return {
        total_entries: entries.length,
        total_planned_hours: totalPlanned,
        total_actual_hours: totalActual,
        average_utilization: utilizationRate,
        by_category: byCategory,
        by_status: byStatus,
        by_project: byProject
      }
    } catch (error) {
      console.error('获取用户工作量统计失败:', error)
      throw new Error('获取用户工作量统计失败')
    }
  }

  // 获取工作量趋势数据
  static async getWorkloadTrend(userId: number, days: number = 30): Promise<{
    dates: string[]
    planned_hours: number[]
    actual_hours: number[]
    utilization_rates: number[]
  }> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days + 1)

      const entries = await db.query(
        'SELECT * FROM workload_entries WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
        [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      // 按日期分组
      const entriesByDate = entries.reduce((acc, entry) => {
        const date = entry.date
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(entry)
        return acc
      }, {} as Record<string, any[]>)

      const dates: string[] = []
      const plannedHours: number[] = []
      const actualHours: number[] = []
      const utilizationRates: number[] = []

      // 生成连续日期数据
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + i)
        const dateStr = currentDate.toISOString().split('T')[0]
        
        dates.push(dateStr)
        
        const dayEntries = entriesByDate[dateStr] || []
        const dayPlanned = dayEntries.reduce((sum, entry) => sum + (entry.hours_planned || 0), 0)
        const dayActual = dayEntries.reduce((sum, entry) => sum + (entry.hours_actual || 0), 0)
        const dayUtilization = dayPlanned > 0 ? (dayActual / dayPlanned) * 100 : 0
        
        plannedHours.push(dayPlanned)
        actualHours.push(dayActual)
        utilizationRates.push(dayUtilization)
      }

      return {
        dates,
        planned_hours: plannedHours,
        actual_hours: actualHours,
        utilization_rates: utilizationRates
      }
    } catch (error) {
      console.error('获取工作量趋势数据失败:', error)
      throw new Error('获取工作量趋势数据失败')
    }
  }

  // 获取周工作量数据
  static async getWeeklyHours(projectId?: number, weeksCount: number = 12) {
    try {
      const weeks = []
      const now = new Date()

      for (let i = weeksCount - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i))
        const weekEnd = endOfWeek(subWeeks(now, i))
        
        let query = 'SELECT actual_hours FROM tasks WHERE updated_at >= ? AND updated_at <= ?'
        let params = [weekStart.toISOString(), weekEnd.toISOString()]

        if (projectId) {
          query += ' AND project_id = ?'
          params.push(projectId)
        }

        const [rows] = await db.query(query, params)
        
        const totalHours = (rows as any[]).reduce((sum, task) => sum + (task.actual_hours || 0), 0)
        
        weeks.push({
          week: format(weekStart, 'yyyy-MM-dd'),
          hours: totalHours
        })
      }

      return weeks
    } catch (error) {
      console.error('Error fetching weekly hours:', error)
      throw error
    }
  }

  // 获取月工作量数据
  static async getMonthlyHours(projectId?: number, monthsCount: number = 6) {
    try {
      const months = []
      const now = new Date()

      for (let i = monthsCount - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i))
        const monthEnd = endOfMonth(subMonths(now, i))
        
        let query = 'SELECT actual_hours FROM tasks WHERE updated_at >= ? AND updated_at <= ?'
        let params = [monthStart.toISOString(), monthEnd.toISOString()]

        if (projectId) {
          query += ' AND project_id = ?'
          params.push(projectId)
        }

        const [rows] = await db.query(query, params)
        
        const totalHours = (rows as any[]).reduce((sum, task) => sum + (task.actual_hours || 0), 0)
        
        months.push({
          month: format(monthStart, 'yyyy-MM'),
          hours: totalHours
        })
      }

      return months
    } catch (error) {
      console.error('Error fetching monthly hours:', error)
      throw error
    }
  }

  // 获取仪表板统计数据
  static async getDashboardStats(userId: number): Promise<DashboardStats> {
    try {
      // 获取项目统计
      const projects = await db.query(
        'SELECT id, status FROM projects WHERE user_id = ?',
        [userId]
      );

      const activeProjects = projects.filter(p => p.status === 'active').length
      const completedProjects = projects.filter(p => p.status === 'completed').length

      // 获取任务统计
      const tasks = await db.query(
        'SELECT id, status FROM tasks WHERE user_id = ?',
        [userId]
      );

      const pendingTasks = tasks.filter(t => t.status === 'pending').length
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
      const completedTasks = tasks.filter(t => t.status === 'completed').length

      // 获取本周工作量统计
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

      const weekWorkload = await db.query(
        'SELECT hours_planned, hours_actual FROM workload_entries WHERE user_id = ? AND date >= ? AND date <= ?',
        [userId, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')]
      );

      const weekPlannedHours = weekWorkload.reduce((sum, entry) => sum + (entry.hours_planned || 0), 0)
      const weekActualHours = weekWorkload.reduce((sum, entry) => sum + (entry.hours_actual || 0), 0)

      // 获取本月工作量统计
      const monthStart = startOfMonth(new Date())
      const monthEnd = endOfMonth(new Date())

      const monthWorkload = await db.query(
        'SELECT hours_planned, hours_actual FROM workload_entries WHERE user_id = ? AND date >= ? AND date <= ?',
        [userId, format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')]
      );

      const monthPlannedHours = monthWorkload.reduce((sum, entry) => sum + (entry.hours_planned || 0), 0)
      const monthActualHours = monthWorkload.reduce((sum, entry) => sum + (entry.hours_actual || 0), 0)

      // 计算趋势（与上周/上月对比）
      const lastWeekStart = subWeeks(weekStart, 1)
      const lastWeekEnd = subWeeks(weekEnd, 1)

      const lastWeekWorkload = await db.query(
        'SELECT hours_actual FROM workload_entries WHERE user_id = ? AND date >= ? AND date <= ?',
        [userId, format(lastWeekStart, 'yyyy-MM-dd'), format(lastWeekEnd, 'yyyy-MM-dd')]
      );

      const lastWeekActualHours = lastWeekWorkload.reduce((sum, entry) => sum + (entry.hours_actual || 0), 0)
      const weeklyTrend = lastWeekActualHours > 0 ? ((weekActualHours - lastWeekActualHours) / lastWeekActualHours) * 100 : 0

      const lastMonthStart = subMonths(monthStart, 1)
      const lastMonthEnd = subMonths(monthEnd, 1)

      const lastMonthWorkload = await db.query(
        'SELECT hours_actual FROM workload_entries WHERE user_id = ? AND date >= ? AND date <= ?',
        [userId, format(lastMonthStart, 'yyyy-MM-dd'), format(lastMonthEnd, 'yyyy-MM-dd')]
      );

      const lastMonthActualHours = lastMonthWorkload.reduce((sum, entry) => sum + (entry.hours_actual || 0), 0)
      const monthlyTrend = lastMonthActualHours > 0 ? ((monthActualHours - lastMonthActualHours) / lastMonthActualHours) * 100 : 0

      return {
        projects: {
          total: projects.length,
          active: activeProjects,
          completed: completedProjects,
          completion_rate: projects.length > 0 ? (completedProjects / projects.length) * 100 : 0
        },
        tasks: {
          total: tasks.length,
          pending: pendingTasks,
          in_progress: inProgressTasks,
          completed: completedTasks,
          completion_rate: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
        },
        workload: {
          week: {
            planned_hours: weekPlannedHours,
            actual_hours: weekActualHours,
            utilization_rate: weekPlannedHours > 0 ? (weekActualHours / weekPlannedHours) * 100 : 0,
            trend: weeklyTrend
          },
          month: {
            planned_hours: monthPlannedHours,
            actual_hours: monthActualHours,
            utilization_rate: monthPlannedHours > 0 ? (monthActualHours / monthPlannedHours) * 100 : 0,
            trend: monthlyTrend
          }
        }
      }
    } catch (error) {
      console.error('获取仪表板统计数据失败:', error)
      throw new Error('获取仪表板统计数据失败')
    }
  }

  // 获取团队成员工作量统计
  static async getTeamWorkloadStats(projectId: number) {
    try {
      const [rows] = await db.query(
        'SELECT assignee_id, estimated_hours, actual_hours, status FROM tasks WHERE project_id = ? AND assignee_id IS NOT NULL',
        [projectId]
      )

      const teamStats: Record<number, {
        assignee_id: number
        total_estimated: number
        total_actual: number
        completed_tasks: number
        total_tasks: number
        efficiency_rate: number
      }> = {}

      ;(rows as any[]).forEach(task => {
        const assigneeId = task.assignee_id
        
        if (!teamStats[assigneeId]) {
          teamStats[assigneeId] = {
            assignee_id: assigneeId,
            total_estimated: 0,
            total_actual: 0,
            completed_tasks: 0,
            total_tasks: 0,
            efficiency_rate: 0
          }
        }

        teamStats[assigneeId].total_estimated += task.estimated_hours || 0
        teamStats[assigneeId].total_actual += task.actual_hours || 0
        teamStats[assigneeId].total_tasks += 1
        
        if (task.status === 'completed') {
          teamStats[assigneeId].completed_tasks += 1
        }
      })

      // 计算效率率
      Object.values(teamStats).forEach(stats => {
        stats.efficiency_rate = stats.total_estimated > 0 
          ? Math.round((stats.total_actual / stats.total_estimated) * 10000) / 100
          : 0
      })

      return Object.values(teamStats)
    } catch (error) {
      console.error('Error fetching team workload stats:', error)
      throw error
    }
  }

  // 获取项目进度趋势
  static async getProjectProgressTrend(projectId: number, days: number = 30) {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // 获取时间线事件来追踪进度变化
      const [rows] = await db.query(
        'SELECT created_at, event_type, description FROM timeline_events WHERE project_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC',
        [projectId, startDate.toISOString(), endDate.toISOString()]
      )

      // 按日期分组统计完成的任务数量
      const dailyProgress: Record<string, number> = {}
      
      ;(rows as any[]).forEach(event => {
        if (event.event_type === 'task' && 
            event.description?.includes('已完成')) {
          const date = format(new Date(event.created_at), 'yyyy-MM-dd')
          dailyProgress[date] = (dailyProgress[date] || 0) + 1
        }
      })

      // 转换为数组格式
      const progressTrend = Object.entries(dailyProgress)
        .map(([date, completedTasks]) => ({
          date,
          completed_tasks: completedTasks
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return progressTrend
    } catch (error) {
      console.error('Error fetching project progress trend:', error)
      throw error
    }
  }

  // 获取工作量预测
  static async getWorkloadForecast(projectId: number) {
    try {
      // 获取项目的历史数据
      const stats = await this.getProjectWorkloadStats(projectId, 1) // 需要传入userId，这里暂时用1
      
      // 获取未完成任务的预估工时
      const [rows] = await db.query(
        'SELECT estimated_hours FROM tasks WHERE project_id = ? AND status != ?',
        [projectId, 'completed']
      )

      const remainingEstimatedHours = (rows as any[]).reduce(
        (sum, task) => sum + (task.estimated_hours || 0), 0
      )

      // 基于历史效率率预测实际需要的工时
      const efficiencyFactor = stats.average_utilization > 0 ? stats.average_utilization / 100 : 1
      const forecastActualHours = remainingEstimatedHours * efficiencyFactor

      // 获取历史周工时数据
      const weeklyHours = await this.getWeeklyHours(projectId, 12)
      const avgWeeklyHours = weeklyHours.length > 0 
        ? weeklyHours.reduce((sum, week) => sum + week.hours, 0) / weeklyHours.length
        : 0

      const estimatedWeeksToComplete = avgWeeklyHours > 0 
        ? Math.ceil(forecastActualHours / avgWeeklyHours)
        : 0

      const estimatedCompletionDate = new Date()
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedWeeksToComplete * 7)

      return {
        remaining_estimated_hours: remainingEstimatedHours,
        forecast_actual_hours: Math.round(forecastActualHours * 100) / 100,
        estimated_weeks_to_complete: estimatedWeeksToComplete,
        estimated_completion_date: estimatedCompletionDate.toISOString(),
        confidence_level: weeklyHours.length >= 4 ? 'high' : 
                         weeklyHours.length >= 2 ? 'medium' : 'low'
      }
    } catch (error) {
      console.error('Error generating workload forecast:', error)
      throw error
    }
  }
}