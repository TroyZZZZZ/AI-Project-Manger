// 项目类型（单用户系统）
export interface Project {
  id: number
  name: string
  description?: string
  start_date: string
  end_date?: string
  estimated_hours: number
  actual_hours: number
  created_at: string
  updated_at: string
  tags?: string[]
  color?: string
  // 新增字段
  parent_id?: number
  project_level: number
}

// 任务类型（单用户系统）
export interface Task {
  id: number
  project_id: number
  title: string
  description?: string
  actual_hours: number
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  tags?: string[]
  dependencies?: number[] // 依赖的任务ID
}

// 时间线事件类型枚举
export enum TimelineEventType {
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  MILESTONE_REACHED = 'milestone_reached',
  DEADLINE_APPROACHING = 'deadline_approaching',
  COMMENT_ADDED = 'comment_added'
}

// 时间线事件
// 时间线事件类型（单用户系统）
export interface TimelineEvent {
  id: string
  project_id: string
  type: TimelineEventType
  title: string
  description?: string
  metadata?: Record<string, any>
  created_at: string
}



// 提醒类型枚举
export enum ReminderType {
  DEADLINE = 'deadline',
  MILESTONE = 'milestone',
  MEETING = 'meeting',
  REVIEW = 'review',
  CUSTOM = 'custom'
}

// 提醒状态枚举
export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled'
}

// 提醒类型（单用户系统）
export interface Reminder {
  id: number
  project_id?: number
  task_id?: number
  type: ReminderType
  title: string
  description?: string
  remind_at: string
  status: ReminderStatus
  sent_at?: string
  created_at: string
  updated_at: string
}

// 导出选项类型
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  dateRange: {
    start: string
    end: string
  }
  includeCharts: boolean
  includeTimeline: boolean
  projects?: string[] // 项目ID列表
}

// API响应类型
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

// 分页类型
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}



// 仪表板统计类型
export interface DashboardStats {
  active_projects: number
  completed_projects: number
  pending_tasks: number
  completed_tasks: number
  week_planned_hours: number
  week_actual_hours: number
  month_planned_hours: number
  month_actual_hours: number
  utilization_rate: number
}

// 干系人类型枚举
export enum StakeholderRole {
  SPONSOR = 'sponsor',
  OWNER = 'owner',
  MANAGER = 'manager',
  MEMBER = 'member',
  CONSULTANT = 'consultant',
  USER = 'user',
  REVIEWER = 'reviewer',
  STAKEHOLDER = 'stakeholder',
  OBSERVER = 'observer'
}

// 身份类型枚举
export enum IdentityType {
  SUPPLIER = 'supplier',
  SUZHOU_TECH_EQUITY_SERVICE = 'suzhou_tech_equity_service'
}

// 干系人类型
export interface Stakeholder {
  id: string
  project_id: string
  name: string
  company?: string
  role: string // 改为 string 类型，支持手动输入
  contact_info?: string // 联系信息字段
  identity_type?: string // 新增身份类型字段，支持任意字符串
  is_resigned?: boolean // 是否离职
  created_at: string
  updated_at: string
}

// 故事线类型（单用户系统）
export interface Storyline {
  id: string
  project_id: string
  title: string
  content: string
  event_time: string
  stakeholder_ids?: string[]
  next_follow_up?: string
  expected_outcome?: string
  created_at: string
  updated_at: string
}

// 子项目类型
export interface SubProject extends Project {
  project_id: string // 添加project_id字段
  parent_project?: Project
  children?: SubProject[]
  depth?: number
}

// 独立子项目类型（单用户系统）
export interface IndependentSubProject {
  id: string
  parent_project_id: string
  name: string
  description?: string
  start_date?: string
  end_date?: string
  actual_hours?: number
  created_at: string
  updated_at: string
}

// 项目树节点接口
export interface ProjectTreeNode {
  id: string
  name: string
  level: number
  parent_id?: string
  children: ProjectTreeNode[]
  project: Project
  actual_hours?: number
}

export type TaskSourceType = 'project_story' | 'storyline' | 'follow_up' | 'storyline_follow_up'

export interface TaskSource {
  source_type: TaskSourceType
  source_id: number
  project_id: number
  title: string
  detail?: string
  story_id?: number // For filtering Follow-ups by Story
  subproject_id?: number
  subproject_name?: string
  next_follow_up_date?: string
}

export interface WorkLog {
  id: number
  project_id: number
  project_name?: string
  sub_project_name?: string
  source_type: TaskSourceType
  source_id: number
  source_title?: string
  description?: string
  hours_spent: number | string
  work_date: string
  started_at?: string
  ended_at?: string
  created_at: string
  updated_at: string
}

export interface WorkLogSummary {
  start_date: string
  end_date: string
  total_hours: number
  by_project: Array<{
    project_id: number
    project_name: string
    hours: number
  }>
  by_day: Array<{
    work_date: string
    hours: number
  }>
}

export type GoalPeriod = 'daily' | 'weekly' | 'custom'
export type GoalStatus = 'active' | 'completed' | 'archived'

export interface MicroGoal {
  id: number
  title: string
  period: GoalPeriod
  target_hours: number
  project_id?: number | null
  start_date: string
  end_date: string
  status: GoalStatus
  created_at: string
  updated_at: string
  progress_hours?: number
  completion_rate?: number
  is_completed?: boolean
}
