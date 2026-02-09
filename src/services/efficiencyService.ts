import { apiClient } from '../lib/database'
import { TaskSource, WorkLog, WorkLogSummary, MicroGoal, GoalPeriod } from '../types'

interface WorkLogFilters {
  page?: number
  limit?: number
  project_id?: number
  source_type?: string
  source_id?: number
  start_date?: string
  end_date?: string
}

interface PaginatedWorkLogs {
  data: WorkLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class EfficiencyService {
  static async getTaskSources(projectId?: number): Promise<TaskSource[]> {
    const params = new URLSearchParams()
    if (projectId) {
      params.append('project_id', projectId.toString())
    }
    const url = params.toString() ? `/efficiency/task-sources?${params.toString()}` : '/efficiency/task-sources'
    const response = await apiClient.get<TaskSource[]>(url)
    return response.data || []
  }

  static async getWorkLogs(filters: WorkLogFilters = {}): Promise<PaginatedWorkLogs> {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.project_id) params.append('project_id', filters.project_id.toString())
    if (filters.source_type) params.append('source_type', filters.source_type)
    if (filters.source_id) params.append('source_id', filters.source_id.toString())
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    const url = params.toString() ? `/efficiency/work-logs?${params.toString()}` : '/efficiency/work-logs'
    const response = await apiClient.get<any>(url)
    const payload = response.data
    // Fix: Backend returns data as WorkLog[] in response.data (mapped from json.data)
    // but pagination is lost in ApiResponse<T> typing if T is not including pagination.
    // However, runtime response object (if cast to any) has pagination.
    const rawResponse = response as any
    const rawData = Array.isArray(payload) ? payload : (payload?.data || [])
    
    const data = rawData.map((item: any) => ({
      ...item,
      hours_spent: Number(item.hours_spent)
    }))
    
    const pagination = rawResponse.pagination || {
      page: filters.page || 1,
      limit: filters.limit || 20,
      total: data.length,
      totalPages: 1
    }
    return { data, pagination }
  }

  static async createWorkLog(payload: {
    project_id: number
    source_type: string
    source_id: number
    description?: string
    hours_spent: number
    work_date?: string
    started_at?: string
    ended_at?: string
  }): Promise<WorkLog> {
    const response = await apiClient.post<WorkLog>('/efficiency/work-logs', payload)
    if (!response.data) {
      throw new Error('工时记录创建失败')
    }
    // Ensure hours_spent is a number
    return {
      ...response.data,
      hours_spent: Number(response.data.hours_spent)
    }
  }

  static async updateWorkLog(id: number, payload: Partial<{
    started_at?: string
    ended_at?: string
    hours_spent?: number
  }>): Promise<WorkLog> {
    const response = await apiClient.put<WorkLog>(`/efficiency/work-logs/${id}`, payload)
    if (!response.data) {
      throw new Error('工时记录更新失败')
    }
    return {
      ...response.data,
      hours_spent: Number(response.data.hours_spent)
    }
  }

  static async deleteWorkLog(id: number): Promise<void> {
    await apiClient.delete(`/efficiency/work-logs/${id}`)
  }

  static async getWorkLogSummary(params?: { start_date?: string; end_date?: string }): Promise<WorkLogSummary> {
    const search = new URLSearchParams()
    if (params?.start_date) search.append('start_date', params.start_date)
    if (params?.end_date) search.append('end_date', params.end_date)
    const url = search.toString() ? `/efficiency/work-logs/summary?${search.toString()}` : '/efficiency/work-logs/summary'
    const response = await apiClient.get<WorkLogSummary>(url)
    if (!response.data) {
      throw new Error('工时统计获取失败')
    }
    return response.data
  }

  static async getGoals(): Promise<MicroGoal[]> {
    const response = await apiClient.get<MicroGoal[]>('/efficiency/goals')
    return response.data || []
  }

  static async createGoal(payload: {
    title: string
    period: GoalPeriod
    target_hours: number
    project_id?: number
    start_date?: string
    end_date?: string
  }): Promise<MicroGoal> {
    const response = await apiClient.post<MicroGoal>('/efficiency/goals', payload)
    if (!response.data) {
      throw new Error('目标创建失败')
    }
    return response.data
  }

  static async updateGoal(id: number, payload: Partial<{
    title: string
    period: GoalPeriod
    target_hours: number
    project_id?: number | null
    start_date?: string
    end_date?: string
    status?: string
  }>): Promise<MicroGoal> {
    const response = await apiClient.put<MicroGoal>(`/efficiency/goals/${id}`, payload)
    if (!response.data) {
      throw new Error('目标更新失败')
    }
    return response.data
  }

  static async deleteGoal(id: number): Promise<void> {
    await apiClient.delete(`/efficiency/goals/${id}`)
  }
}
