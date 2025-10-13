import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Task, TaskStatus, TaskPriority } from '../types'
import { TaskService } from '../services/taskService'

interface TaskState {
  tasks: Task[]
  currentTask: Task | null
  loading: boolean
  error: string | null
  searchQuery: string
  statusFilter: TaskStatus | 'all'
  priorityFilter: TaskPriority | 'all'
  projectFilter: string | 'all'
  assigneeFilter: string | 'all'
  sortBy: 'name' | 'created_at' | 'updated_at' | 'deadline' | 'priority'
  sortOrder: 'asc' | 'desc'
  pagination: {
    page: number
    limit: number
    total: number
  }
  statistics: {
    total: number
    completed: number
    in_progress: number
    pending: number
    overdue: number
  }
}

interface TaskActions {
  // 数据获取
  fetchTasks: (projectId?: string) => Promise<void>
  fetchTaskById: (id: string) => Promise<void>
  fetchTaskStatistics: (projectId?: string) => Promise<void>
  fetchOverdueTasks: () => Promise<void>
  fetchUpcomingTasks: (days?: number) => Promise<void>
  
  // 任务操作
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>
  updateTaskProgress: (id: string, progress: number) => Promise<void>
  logWorkHours: (id: string, hours: number, description?: string) => Promise<void>
  
  // 批量操作
  batchUpdateStatus: (taskIds: string[], status: TaskStatus) => Promise<void>
  batchDelete: (taskIds: string[]) => Promise<void>
  
  // 状态管理
  setCurrentTask: (task: Task | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 筛选和搜索
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: TaskStatus | 'all') => void
  setPriorityFilter: (priority: TaskPriority | 'all') => void
  setProjectFilter: (projectId: string | 'all') => void
  setAssigneeFilter: (assigneeId: string | 'all') => void
  setSortBy: (sortBy: TaskState['sortBy']) => void
  setSortOrder: (order: 'asc' | 'desc') => void
  
  // 分页
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  
  // 重置
  resetFilters: () => void
  clearError: () => void
}

type TaskStore = TaskState & TaskActions

const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  projectFilter: 'all',
  assigneeFilter: 'all',
  sortBy: 'updated_at',
  sortOrder: 'desc',
  pagination: {
    page: 1,
    limit: 20,
    total: 0
  },
  statistics: {
    total: 0,
    completed: 0,
    in_progress: 0,
    pending: 0,
    overdue: 0
  }
}

export const useTaskStore = create<TaskStore>()()
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 数据获取
        fetchTasks: async (projectId?: string) => {
          const state = get()
          set({ loading: true, error: null })
          
          try {
            const filters = {
              search: state.searchQuery || undefined,
              status: state.statusFilter !== 'all' ? state.statusFilter : undefined,
              priority: state.priorityFilter !== 'all' ? state.priorityFilter : undefined,
              project_id: projectId || (state.projectFilter !== 'all' ? state.projectFilter : undefined),
              assignee_id: state.assigneeFilter !== 'all' ? state.assigneeFilter : undefined
            }
            
            const result = await TaskService.getTasks(
              filters,
              state.pagination.page,
              state.pagination.limit,
              state.sortBy,
              state.sortOrder
            )
            
            set({
              tasks: result.data,
              pagination: {
                ...state.pagination,
                total: result.total
              },
              loading: false
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '获取任务列表失败',
              loading: false
            })
          }
        },
        
        fetchTaskById: async (id: string) => {
          set({ loading: true, error: null })
          
          try {
            const task = await TaskService.getTaskById(id)
            set({ currentTask: task, loading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '获取任务详情失败',
              loading: false
            })
          }
        },
        
        fetchTaskStatistics: async (projectId?: string) => {
          try {
            const stats = await TaskService.getTaskStatistics(projectId)
            set({ statistics: stats })
          } catch (error) {
            console.error('获取任务统计失败:', error)
          }
        },
        
        fetchOverdueTasks: async () => {
          set({ loading: true, error: null })
          
          try {
            const overdueTasks = await TaskService.getOverdueTasks()
            set({ tasks: overdueTasks, loading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '获取逾期任务失败',
              loading: false
            })
          }
        },
        
        fetchUpcomingTasks: async (days = 7) => {
          set({ loading: true, error: null })
          
          try {
            const upcomingTasks = await TaskService.getUpcomingTasks(days)
            set({ tasks: upcomingTasks, loading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '获取即将到期任务失败',
              loading: false
            })
          }
        },
        
        // 任务操作
        createTask: async (taskData) => {
          set({ loading: true, error: null })
          
          try {
            const newTask = await TaskService.createTask(taskData)
            const state = get()
            set({
              tasks: [newTask, ...state.tasks],
              loading: false
            })
            
            // 更新统计数据
            await get().fetchTaskStatistics(taskData.project_id)
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '创建任务失败',
              loading: false
            })
          }
        },
        
        updateTask: async (id: string, updates: Partial<Task>) => {
          set({ loading: true, error: null })
          
          try {
            const updatedTask = await TaskService.updateTask(id, updates)
            const state = get()
            
            set({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
              loading: false
            })
            
            // 更新统计数据
            await get().fetchTaskStatistics(updatedTask.project_id)
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '更新任务失败',
              loading: false
            })
          }
        },
        
        deleteTask: async (id: string) => {
          set({ loading: true, error: null })
          
          try {
            const state = get()
            const task = state.tasks.find(t => t.id === id)
            
            await TaskService.deleteTask(id)
            
            set({
              tasks: state.tasks.filter(t => t.id !== id),
              currentTask: state.currentTask?.id === id ? null : state.currentTask,
              loading: false
            })
            
            // 更新统计数据
            if (task) {
              await get().fetchTaskStatistics(task.project_id)
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '删除任务失败',
              loading: false
            })
          }
        },
        
        updateTaskStatus: async (id: string, status: TaskStatus) => {
          try {
            await TaskService.updateTaskStatus(id, status)
            const state = get()
            const updatedTask = state.tasks.find(t => t.id === id)
            
            if (updatedTask) {
              const newTask = { ...updatedTask, status }
              set({
                tasks: state.tasks.map(t => t.id === id ? newTask : t),
                currentTask: state.currentTask?.id === id ? newTask : state.currentTask
              })
              
              // 更新统计数据
              await get().fetchTaskStatistics(newTask.project_id)
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '更新任务状态失败'
            })
          }
        },
        
        updateTaskProgress: async (id: string, progress: number) => {
          try {
            await TaskService.updateTaskProgress(id, progress)
            const state = get()
            const updatedTask = state.tasks.find(t => t.id === id)
            
            if (updatedTask) {
              const newTask = { ...updatedTask, progress }
              set({
                tasks: state.tasks.map(t => t.id === id ? newTask : t),
                currentTask: state.currentTask?.id === id ? newTask : state.currentTask
              })
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '更新任务进度失败'
            })
          }
        },
        
        logWorkHours: async (id: string, hours: number, description?: string) => {
          try {
            await TaskService.logWorkHours(id, hours, description)
            const state = get()
            const task = state.tasks.find(t => t.id === id)
            
            if (task) {
              const newTask = {
                ...task,
                actual_hours: (task.actual_hours || 0) + hours
              }
              set({
                tasks: state.tasks.map(t => t.id === id ? newTask : t),
                currentTask: state.currentTask?.id === id ? newTask : state.currentTask
              })
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '记录工时失败'
            })
          }
        },
        
        // 批量操作
        batchUpdateStatus: async (taskIds: string[], status: TaskStatus) => {
          set({ loading: true, error: null })
          
          try {
            await TaskService.batchUpdateStatus(taskIds, status)
            const state = get()
            
            set({
              tasks: state.tasks.map(t => 
                taskIds.includes(t.id) ? { ...t, status } : t
              ),
              loading: false
            })
            
            // 更新统计数据
            await get().fetchTaskStatistics()
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '批量更新状态失败',
              loading: false
            })
          }
        },
        
        batchDelete: async (taskIds: string[]) => {
          set({ loading: true, error: null })
          
          try {
            await Promise.all(taskIds.map(id => TaskService.deleteTask(id)))
            const state = get()
            
            set({
              tasks: state.tasks.filter(t => !taskIds.includes(t.id)),
              loading: false
            })
            
            // 更新统计数据
            await get().fetchTaskStatistics()
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '批量删除失败',
              loading: false
            })
          }
        },
        
        // 状态管理
        setCurrentTask: (task) => set({ currentTask: task }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        
        // 筛选和搜索
        setSearchQuery: (query) => {
          set({ searchQuery: query, pagination: { ...get().pagination, page: 1 } })
          // 自动触发搜索
          setTimeout(() => get().fetchTasks(), 300)
        },
        
        setStatusFilter: (status) => {
          set({ statusFilter: status, pagination: { ...get().pagination, page: 1 } })
          get().fetchTasks()
        },
        
        setPriorityFilter: (priority) => {
          set({ priorityFilter: priority, pagination: { ...get().pagination, page: 1 } })
          get().fetchTasks()
        },
        
        setProjectFilter: (projectId) => {
          set({ projectFilter: projectId, pagination: { ...get().pagination, page: 1 } })
          get().fetchTasks()
        },
        
        setAssigneeFilter: (assigneeId) => {
          set({ assigneeFilter: assigneeId, pagination: { ...get().pagination, page: 1 } })
          get().fetchTasks()
        },
        
        setSortBy: (sortBy) => {
          set({ sortBy })
          get().fetchTasks()
        },
        
        setSortOrder: (order) => {
          set({ sortOrder: order })
          get().fetchTasks()
        },
        
        // 分页
        setPage: (page) => {
          set({ pagination: { ...get().pagination, page } })
          get().fetchTasks()
        },
        
        setLimit: (limit) => {
          set({ pagination: { ...get().pagination, limit, page: 1 } })
          get().fetchTasks()
        },
        
        // 重置
        resetFilters: () => {
          set({
            searchQuery: '',
            statusFilter: 'all',
            priorityFilter: 'all',
            projectFilter: 'all',
            assigneeFilter: 'all',
            sortBy: 'updated_at',
            sortOrder: 'desc',
            pagination: { ...get().pagination, page: 1 }
          })
          get().fetchTasks()
        },
        
        clearError: () => set({ error: null })
      }),
      {
        name: 'task-store',
        partialize: (state) => ({
          searchQuery: state.searchQuery,
          statusFilter: state.statusFilter,
          priorityFilter: state.priorityFilter,
          projectFilter: state.projectFilter,
          assigneeFilter: state.assigneeFilter,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'task-store'
    }
  )