// 用户类型
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// 项目状态枚举
export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 项目优先级枚举
export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 项目类型
export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string
  end_date?: string
  estimated_hours: number
  actual_hours: number
  progress: number // 0-100
  owner_id: string
  created_at: string
  updated_at: string
  tags?: string[]
  color?: string
}

// 任务状态枚举
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  CANCELLED = 'cancelled'
}

// 任务类型
export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  status: TaskStatus
  priority: ProjectPriority
  estimated_hours: number
  actual_hours: number
  assignee_id?: string
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  tags?: string[]
  dependencies?: string[] // 依赖的任务ID
}

// 时间线事件类型枚举
export enum TimelineEventType {
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_STATUS_CHANGED = 'project_status_changed',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_STATUS_CHANGED = 'task_status_changed',
  MILESTONE_REACHED = 'milestone_reached',
  DEADLINE_APPROACHING = 'deadline_approaching',
  STAKEHOLDER_ADDED = 'stakeholder_added',
  COMMENT_ADDED = 'comment_added'
}

// 时间线事件
export interface TimelineEvent {
  id: string
  project_id: string
  type: TimelineEventType
  title: string
  description?: string
  metadata?: Record<string, any>
  user_id: string
  created_at: string
}

// 干系人角色枚举
export enum StakeholderRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  DEVELOPER = 'developer',
  DESIGNER = 'designer',
  TESTER = 'tester',
  CLIENT = 'client',
  OBSERVER = 'observer'
}

// 干系人类型
export interface Stakeholder {
  id: string
  project_id: string
  user_id?: string
  name: string
  email: string
  role: StakeholderRole
  phone?: string
  company?: string
  notes?: string
  notification_preferences: {
    email: boolean
    in_app: boolean
    sms: boolean
  }
  created_at: string
  updated_at: string
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
  DISMISSED = 'dismissed'
}

// 提醒类型
export interface Reminder {
  id: string
  project_id: string
  task_id?: string
  type: ReminderType
  title: string
  description?: string
  remind_at: string
  status: ReminderStatus
  recipients: string[] // 用户ID或邮箱
  created_by: string
  created_at: string
  updated_at: string
}

// 工作量统计类型
export interface WorkloadStats {
  project_id: string
  total_estimated_hours: number
  total_actual_hours: number
  completed_tasks: number
  total_tasks: number
  completion_rate: number
  efficiency_rate: number // actual/estimated
  weekly_hours: { week: string; hours: number }[]
  monthly_hours: { month: string; hours: number }[]
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
  includeStakeholders: boolean
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

// 过滤器类型
export interface ProjectFilters {
  status?: ProjectStatus[]
  priority?: ProjectPriority[]
  tags?: string[]
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

// 仪表板统计类型
export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTasks: number
  completedTasks: number
  totalHours: number
  thisWeekHours: number
  upcomingDeadlines: number
  overdueItems: number
}