import { API_BASE_URL } from '../config/api';

// 跟进记录接口
export interface FollowUpRecord {
  id: number;
  story_id: number;
  content: string;
  follow_up_type?: string;
  contact_person?: string;
  contact_method?: string;
  result?: string;
  next_action?: string;
  event_date?: string;
  action_date?: string;
  updated_at?: string;
  completed_at?: string;
  created_at: string;
}

// 创建跟进记录的数据接口
export interface CreateFollowUpRecordData {
  content: string;
  follow_up_type?: string;
  contact_person?: string;
  contact_method?: string;
  result?: string;
  next_action?: string;
  event_date?: string;
  action_date?: string;
}

// 跟进中的故事接口
export interface FollowingStory {
  id: number;
  subproject_id: number;
  story_name: string;
  content: string;
  time: string;
  stakeholders: string;
  created_at: string;
  updated_at: string;
  subproject_name: string;
  project_id: number;
  project_name: string;
}

// API响应接口
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * 获取跟进中的故事列表
 */
export async function getFollowingStories(
  overdue: boolean = false
): Promise<FollowingStory[]> {
  try {
    const params = new URLSearchParams({
      overdue: overdue.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/stories/following?${params}`);
    const result: ApiResponse<any> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || '获取跟进故事列表失败');
    }

    const payload = result.data;
    if (Array.isArray(payload)) return payload as FollowingStory[];
    if (payload && Array.isArray(payload.data)) return payload.data as FollowingStory[];
    return [] as FollowingStory[];
  } catch (error) {
    console.error('获取跟进中的故事列表失败:', error);
    throw error;
  }
}

export async function getStoriesFollowingByRecords(): Promise<FollowingStory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/stories/following-by-records`)
    const result: ApiResponse<any> = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || '获取基于记录的跟进中故事失败')
    }
    const payload = result.data
    return Array.isArray(payload) ? payload as FollowingStory[] : []
  } catch (error) {
    console.error('获取基于记录的跟进中故事失败:', error)
    throw error
  }
}

export async function getStoriesAnyInprogressByRecords(): Promise<FollowingStory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/stories/any-inprogress-by-records`)
    const result: ApiResponse<any> = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || '获取任意记录的跟进中故事失败')
    }
    const payload = result.data
    return Array.isArray(payload) ? payload as FollowingStory[] : []
  } catch (error) {
    console.error('获取任意记录的跟进中故事失败:', error)
    throw error
  }
}

/**
 * 创建跟进记录
 */
export async function createFollowUpRecord(
  storyId: number,
  recordData: CreateFollowUpRecordData
): Promise<FollowUpRecord> {
  try {
    const response = await fetch(`${API_BASE_URL}/stories/${storyId}/follow-up-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recordData),
    });

    const result: ApiResponse<FollowUpRecord> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || '创建跟进记录失败');
    }

    return result.data!;
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    throw error;
  }
}

/**
 * 更新最近一条跟进记录的备注（将备注落在同一条记录中）
 */
export async function updateLatestStoryFollowUpResult(
  storyId: number,
  result: string
): Promise<{ id: number; story_id: number; result: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/stories/${storyId}/follow-up-records/latest-result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    })
    const res: ApiResponse<{ id: number; story_id: number; result: string }> = await response.json()
    if (!response.ok || !res.success) {
      const msg = res.error || res.message || ''
      if (msg.includes('暂无跟进记录') || msg.includes('跟进记录不存在')) {
        const latest = await getStoryFollowUpRecords(storyId, 1, 0)
        const rec = Array.isArray(latest.records) && latest.records.length > 0 ? latest.records[0] : null
        if (!rec) throw new Error('暂无跟进记录，无法添加备注')
        const updated = await updateFollowUpRecord(storyId, rec.id, { result })
        return { id: updated.id, story_id: updated.story_id, result: updated.result || result }
      }
      throw new Error(msg || '更新最近跟进备注失败')
    }
    return res.data!
  } catch (error) {
    console.error('更新最近跟进备注失败:', error)
    throw error
  }
}

/**
 * 获取故事的跟进记录
 */
export async function getStoryFollowUpRecords(
  storyId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ records: FollowUpRecord[]; total: number; hasMore: boolean }> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/stories/${storyId}/follow-up-records?${params}`);
    const result: PaginationResponse<FollowUpRecord> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error('获取跟进记录失败');
    }

    return {
      records: result.data,
      total: result.pagination.total,
      hasMore: result.pagination.hasMore,
    };
  } catch (error) {
    console.error('获取故事的跟进记录失败:', error);
    throw error;
  }
}

export async function deleteStoryFollowUpRecord(
  storyId: number,
  recordId: number
): Promise<{ id: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/stories/${storyId}/follow-up-records/${recordId}`, {
      method: 'DELETE',
    })
    const result: ApiResponse<{ id: number }> = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || '删除跟进记录失败')
    }
    return result.data!
  } catch (error) {
    console.error('删除跟进记录失败:', error)
    throw error
  }
}

export async function updateFollowUpRecord(
  storyId: number,
  recordId: number,
  updates: Partial<CreateFollowUpRecordData & { result?: string; next_action?: string; completed_at?: string }>
): Promise<FollowUpRecord> {
  try {
    const response = await fetch(`${API_BASE_URL}/stories/${storyId}/follow-up-records/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const result: ApiResponse<FollowUpRecord> = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || '更新跟进记录失败')
    }
    return result.data!
  } catch (error) {
    console.error('更新跟进记录失败:', error)
    throw error
  }
}

// 故事跟进服务总览
export const storyFollowUpService = {
  getFollowingStories,
  getStoriesFollowingByRecords,
  createFollowUpRecord,
  updateLatestStoryFollowUpResult,
  getStoryFollowUpRecords,
  deleteStoryFollowUpRecord,
  updateFollowUpRecord,
};

export default storyFollowUpService;
