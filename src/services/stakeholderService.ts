import { apiClient } from '../lib/database'
import { Stakeholder } from '../types'

// 统一的规范化函数
function normalizeStakeholder(s: any, fallbackProjectId?: string): Stakeholder {
  return {
    id: String(s.id),
    project_id: String(s.project_id ?? fallbackProjectId ?? ''),
    name: s.name ?? '',
    company: s.company ?? '',
    role: s.role ?? '',
    contact_info: s.contact_info ?? '',
    identity_type: s.identity_type ?? '',
    is_resigned: !!s.is_resigned,
    created_at: s.created_at ?? new Date().toISOString(),
    updated_at: s.updated_at ?? new Date().toISOString()
  }
}

export class StakeholderService {
  // 获取平台内所有干系人（分页/搜索可选），返回规范化后的数组
  static async getAllStakeholders(options?: {
    page?: number
    limit?: number
    type?: string
    search?: string
    excludeResigned?: boolean
  }): Promise<Stakeholder[]> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', String(options.page))
    if (options?.limit) params.append('limit', String(options.limit))
    if (options?.type) params.append('type', options.type)
    if (options?.search) params.append('search', options.search)
    if (options?.excludeResigned) params.append('excludeResigned', 'true')

    const endpoint = `/stakeholders${params.toString() ? `?${params.toString()}` : ''}`

    try {
      const response = await apiClient.get<any>(endpoint)
      const payload = response?.data
      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : []

      return (rawList || []).map((s: any) => normalizeStakeholder(s))
    } catch (error) {
      console.error('获取平台干系人失败:', error)
      return []
    }
  }

  // 获取全平台所有干系人（自动分页聚合）
  static async getAllStakeholdersAll(maxPerPage: number = 200, excludeResigned: boolean = false): Promise<Stakeholder[]> {
    const result: Stakeholder[] = []
    let page = 1
    while (true) {
      const list = await this.getAllStakeholders({ page, limit: maxPerPage, excludeResigned })
      if (!list || list.length === 0) break
      result.push(...list)
      if (list.length < maxPerPage) break
      page++
      // 安全上限，避免无限循环
      if (page > 100) break
    }
    return result
  }

  // 获取项目内干系人列表
  static async getStakeholders(projectId: string, options?: {
    page?: number
    limit?: number
    type?: string
    search?: string
    excludeResigned?: boolean
  }): Promise<Stakeholder[]> {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', String(options.page))
    // 默认拉取更多，避免只显示少量干系人
    params.append('limit', String(options?.limit ?? 500))
    if (options?.type) params.append('type', options.type)
    if (options?.search) params.append('search', options.search)
    if (options?.excludeResigned) params.append('excludeResigned', 'true')

    const endpoint = `/projects/${projectId}/stakeholders${params.toString() ? `?${params.toString()}` : ''}`

    try {
      const response = await apiClient.get<any>(endpoint)
      const payload = response?.data
      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : []
      return (rawList || []).map((s: any) => normalizeStakeholder(s, projectId))
    } catch (error) {
      console.error('获取项目干系人失败:', error)
      return []
    }
  }

  // 创建项目内干系人
  static async createStakeholder(
    projectId: string,
    stakeholderData: { name: string; role?: string | null; company?: string | null; identity_type?: string | null }
  ): Promise<Stakeholder> {
    try {
      const payload = {
        name: stakeholderData.name,
        role: stakeholderData.role ?? null,
        company: stakeholderData.company ?? null,
        identity_type: stakeholderData.identity_type ?? null,
      }
      const response = await apiClient.post<any>(`/projects/${projectId}/stakeholders`, payload)
      const data = (response?.data as any) ?? response
      return normalizeStakeholder(data, projectId)
    } catch (error) {
      console.error('创建干系人失败:', error)
      throw error
    }
  }

  static async getIdentityTypes(): Promise<{ value: string; label: string; color: string }[]> {
    try {
      const response = await apiClient.get<any>(`/identity-types`)
      const data = (response?.data as any) ?? response
      return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
    } catch (error) {
      console.error('获取身份类型失败:', error)
      return []
    }
  }

  static async saveIdentityTypes(list: { value: string; label: string; color: string }[]): Promise<void> {
    try {
      await apiClient.put<any>(`/identity-types`, { list })
    } catch (error) {
      console.error('保存身份类型失败:', error)
      throw error
    }
  }

  static async deduplicateByName(name: string, projectId?: string): Promise<{ affected: number; deleted_ids?: number[] }> {
    try {
      const endpoint = `/stakeholders/deduplicate-by-name`
      const res = await apiClient.post<any>(endpoint, { name, projectId })
      const data = (res?.data as any) ?? res
      const payload = data?.data || data
      return { affected: Number(payload?.affected || 0), deleted_ids: payload?.deleted_ids || [] }
    } catch (error) {
      console.error('按姓名去重删除失败:', error)
      throw error
    }
  }

  // 更新干系人
  static async updateStakeholder(
    projectId: string,
    id: string | number,
    updates: Partial<Pick<Stakeholder, 'name' | 'role' | 'company' | 'identity_type' | 'is_resigned'>>
  ): Promise<Stakeholder> {
    try {
      const response = await apiClient.put<any>(`/projects/${projectId}/stakeholders/${id}`, updates)
      const data = (response?.data as any) ?? response
      return normalizeStakeholder(data, projectId)
    } catch (error) {
      console.error('更新干系人失败:', error)
      throw error
    }
  }

  // 删除干系人
  static async deleteStakeholder(projectId: string, id: string | number): Promise<void> {
    try {
      await apiClient.delete<any>(`/projects/${projectId}/stakeholders/${id}`)
    } catch (error) {
      console.error('删除干系人失败:', error)
      throw error
    }
  }

  // 获取干系人统计
  static async getStakeholderStats(projectId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(`/projects/${projectId}/stakeholders/stats`)
      return response?.data ?? response
    } catch (error) {
      console.error('获取干系人统计失败:', error)
      throw error
    }
  }
}
