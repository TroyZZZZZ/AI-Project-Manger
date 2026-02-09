import { Storyline } from '../types'

const API_BASE = '/api/projects'

// 统一事件时间格式为 YYYY-MM-DD HH:mm:ss，兼容 ISO 与日期串
function normalizeDateTime(dt: any): string {
  if (!dt) return dt
  const s = typeof dt === 'string' ? dt.trim() : dt
  // YYYY-MM-DD
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s} 00:00:00`
  }
  // YYYY-MM-DD HH:mm 或 HH:mm:ss
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(s)) {
    return s.length === 16 ? `${s}:00` : s
  }
  // ISO 字符串
  const d = new Date(s)
  if (isNaN(d.getTime())) return dt
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const HH = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`
}

export class StorylineService {
  // 获取项目故事线列表
  static async getStorylines(projectId: string): Promise<Storyline[]> {
    const response = await fetch(`${API_BASE}/${projectId}/storylines`)
    if (!response.ok) {
      throw new Error('获取故事线列表失败')
    }
    const data = await response.json()
    // 后端返回结构为 { success: true, data: { storylines: [], total, ... } }
    // 兼容性处理：如果顶层 data 是数组则直接返回，否则尝试 data.storylines
    const payload = data?.data
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.storylines)
        ? payload.storylines
        : []
    return list
  }

  // 创建故事线
  static async createStoryline(projectId: string, storylineData: Omit<Storyline, 'id' | 'created_at' | 'updated_at'>): Promise<Storyline> {
    const payload: any = { ...storylineData }
    if (payload.event_time) {
      payload.event_time = normalizeDateTime(payload.event_time)
    }
    const response = await fetch(`${API_BASE}/${projectId}/storylines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error('创建故事线失败')
    }
    const data = await response.json()
    return data.data
  }

  // 获取故事线详情
  static async getStorylineById(projectId: string, storylineId: string): Promise<Storyline> {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}`)
    if (!response.ok) {
      throw new Error('获取故事线详情失败')
    }
    const data = await response.json()
    return data.data
  }

  // 更新故事线
  static async updateStoryline(projectId: string, storylineId: string, updateData: Partial<Storyline>): Promise<Storyline> {
    const payload: any = { ...updateData }
    if (payload.event_time) {
      payload.event_time = normalizeDateTime(payload.event_time)
    }
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error('更新故事线失败')
    }
    const data = await response.json()
    return data.data
  }

  // 删除故事线
  static async deleteStoryline(projectId: string, storylineId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('删除故事线失败')
    }
  }

  // 获取即将到期的跟进事项
  static async getUpcomingFollowUps(projectId: string, days: number = 7): Promise<Storyline[]> {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/upcoming?days=${days}`)
    if (!response.ok) {
      throw new Error('获取即将到期的跟进事项失败')
    }
    const data = await response.json()
    return data.data
  }

  static async getAllNextFollowUps(): Promise<any[]> {
    const response = await fetch(`/api/projects/storylines/next-follow-ups`)
    if (!response.ok) {
      throw new Error('获取有跟进时间的故事线失败')
    }
    const data = await response.json()
    const payload = data?.data
    return Array.isArray(payload) ? payload : []
  }

  // 按时间范围获取故事线
  static async getStorylinesByDateRange(projectId: string, startDate: string, endDate: string): Promise<Storyline[]> {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/range?start=${startDate}&end=${endDate}`)
    if (!response.ok) {
      throw new Error('获取时间范围内的故事线失败')
    }
    const data = await response.json()
    return data.data
  }

  // 按干系人获取故事线
  static async getStorylinesByStakeholder(projectId: string, stakeholderId: string): Promise<Storyline[]> {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/stakeholder/${stakeholderId}`)
    if (!response.ok) {
      throw new Error('获取干系人相关故事线失败')
    }
    const data = await response.json()
    return data.data
  }

  // 设置故事线下次跟进时间
  static async setNextFollowUp(projectId: string, storylineId: string, nextFollowUp: string) {
    const payload = { next_follow_up: normalizeDateTime(nextFollowUp) }
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/next-follow-up`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '设置下次跟进时间失败')
    }
    const data = await response.json()
    return data.data
  }

  static async clearNextFollowUp(projectId: string, storylineId: string) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/next-follow-up`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '清除下次跟进时间失败')
    }
    const data = await response.json()
    return data.data
  }

  static async updateLatestFollowUpResult(projectId: string, storylineId: string, result: string) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/follow-up-records/latest-result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '更新最近跟进备注失败')
    }
    const data = await response.json()
    return data.data
  }

  static async updateFollowUpRecord(projectId: string, storylineId: string, recordId: number, payload: { content?: string; event_date?: string; contact_person?: string; next_follow_up_date?: string; action_date?: string; completed_at?: string; result?: string }) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/follow-up-records/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '更新跟进记录失败')
    }
    const data = await response.json()
    return data.data
  }

  static async deleteFollowUpRecord(projectId: string, storylineId: string, recordId: number) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/follow-up-records/${recordId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '删除故事线跟进记录失败')
    }
    const data = await response.json()
    return data.data
  }

  // 创建故事线跟进记录
  static async createFollowUpRecord(
    projectId: string,
    storylineId: string,
    record: {
      content: string
      contact_person?: string
      event_date?: string
      next_follow_up_date?: string
      action_date?: string
    }
  ) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/follow-up-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '创建故事线跟进记录失败')
    }
    const data = await response.json()
    return data.data
  }

  // 获取故事线的跟进记录
  static async getFollowUpRecords(projectId: string, storylineId: string, limit: number = 50, offset: number = 0) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/follow-up-records?limit=${limit}&offset=${offset}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '获取故事线跟进记录失败')
    }
    const data = await response.json()
    return data
  }

  // 获取跟进中的故事线（支持逾期过滤）
  static async getFollowingStorylines(projectId: string, status: 'following' | 'completed' | 'no_follow_up' = 'following', overdue: boolean = false) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/following?status=${status}&overdue=${overdue}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '获取跟进中的故事线失败')
    }
    const data = await response.json()
    return data.data
  }

  static async getStorylinesFollowingByRecords(): Promise<any[]> {
    const response = await fetch(`/api/projects/storylines/following-by-records`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '获取基于记录的跟进中故事线失败')
    }
    const data = await response.json()
    return Array.isArray(data?.data) ? data.data : []
  }

  // 获取故事线状态变更历史
  static async getStatusLogs(projectId: string, storylineId: string, limit: number = 50, offset: number = 0) {
    const response = await fetch(`${API_BASE}/${projectId}/storylines/${storylineId}/status-logs?limit=${limit}&offset=${offset}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '获取故事线状态变更历史失败')
    }
    const data = await response.json()
    return data
  }
}
