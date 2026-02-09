import { API_BASE_URL } from '../config/api'

export interface ProjectStory {
  id: number
  subproject_id: number
  story_name: string
  time: string
  stakeholders: string
  content: string
  created_at: string
  updated_at: string
}

export interface FollowUpRecord {
  id: number
  story_id: number
  content: string
  follow_up_type?: string
  contact_person?: string
  contact_method?: string
  result?: string
  next_action?: string
  event_date?: string
  action_date?: string
  updated_at?: string
  completed_at?: string
  created_at: string
}

export interface CreateStoryData {
  subproject_id: number
  story_name: string
  time: string
  stakeholders: string
  content: string
}

export interface UpdateStoryData {
  story_name?: string
  time?: string
  stakeholders?: string
  content?: string
}

export interface CreateFollowUpRecordData {
  content: string
  follow_up_type?: string
  contact_person?: string
  contact_method?: string
  result?: string
  next_action?: string
}

// 创建项目故事
export const createStory = async (data: CreateStoryData): Promise<ProjectStory> => {
  const response = await fetch(`${API_BASE_URL}/stories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '创建项目故事失败')
  }

  return response.json()
}

// 获取子项目的所有故事
export const getStoriesBySubproject = async (subprojectId: string | number): Promise<ProjectStory[]> => {
  const response = await fetch(`${API_BASE_URL}/stories/subproject/${subprojectId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取项目故事失败')
  }

  const result = await response.json()
  // 后端返回格式为 { success: true, data: [...] }，需要提取 data 字段
  return result.data || []
}

// 获取单个故事详情
export const getStoryById = async (id: number): Promise<ProjectStory> => {
  const response = await fetch(`${API_BASE_URL}/stories/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取故事详情失败')
  }

  return response.json()
}

// 更新项目故事
export const updateStory = async (id: number, data: UpdateStoryData): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '更新项目故事失败')
  }
}

// 删除项目故事
export const deleteStory = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '删除项目故事失败')
  }
}
