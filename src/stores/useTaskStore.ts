import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Task } from '../types'
import { TaskService } from '../services/taskService'

interface TaskState {
  tasks: Task[]
  currentTask: Task | null
  loading: boolean
  error: string | null
  searchQuery: string
  projectFilter: string | 'all'
  assigneeFilter: string | 'all'
  sortBy: 'name' | 'created_at' | 'updated_at' | 'deadline'
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
  fetchTasks: (projectId?: number) => Promise<void>
  fetchTaskById: (id: number) => Promise<void>
  fetchTaskStatistics: (projectId?: number) => Promise<void>
  fetchOverdueTasks: () => Promise<void>
  fetchUpcomingTasks: (days?: number) => Promise<void>
  
  // 任务操作
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  logWorkHours: (id: number, hours: number, description?: string) => Promise<void>
  
  // 批量操作
  batchDelete: (taskIds: number[]) => Promise<void>
  
  // 状态管理
  setCurrentTask: (task: Task | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 筛选和搜索
  setSearchQuery: (query: string) => void
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

export const useTaskStore = create<TaskStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 数据获取
        fetchTasks: async (projectId?: number) => {
          const state = get()
          set({ loading: true, error: null })
          
          try {
            const params = {
              page: state.pagination.page,
              limit: state.pagination.limit,
              search: state.searchQuery || undefined,
              project_id: projectId || (state.projectFilter !== 'all' ? Number(state.projectFilter) : undefined),
              sort_by: state.sortBy,
              sort_order: state.sortOrder
            }
            
            const response = await TaskService.getTasks(params)
            set({ 
              tasks: response.data,
              pagination: {
                ...state.pagination,
                total: response.pagination?.total || response.data.length
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
        
        fetchTaskById: async (id: number) => {
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
        
        fetchTaskStatistics: async (projectId?: number) => {
          set({ loading: true, error: null })
          try {
            if (projectId) {
              const stats = await TaskService.getProjectTaskStats(projectId)
              set({ 
                statistics: {
                  total: stats.total,
                  completed: stats.byStatus['completed'] || 0,
                  in_progress: stats.byStatus['in_progress'] || 0,
                  pending: stats.byStatus['todo'] || 0,
                  overdue: 0 // 需要单独计算
                },
                loading: false 
              })
            } else {
              set({ loading: false })
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '获取任务统计失败',
              loading: false 
            })
          }
        },
        
        fetchOverdueTasks: async () => {
          set({ loading: true, error: null })
          try {
            const tasks = await TaskService.getOverdueTasks() // 移除多余的参数
            set({ tasks, loading: false })
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
            const tasks = await TaskService.getUpcomingTasks(days) // 移除多余的用户ID参数
            set({ tasks, loading: false })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '获取即将到期任务失败',
              loading: false 
            })
          }
        },
        
        // 数据操作
        createTask: async (taskData) => {
          set({ loading: true, error: null })
          try {
            const newTask = await TaskService.createTask(taskData)
            set(state => ({ 
              tasks: [newTask, ...state.tasks],
              loading: false 
            }))
            get().fetchTasks()
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '创建任务失败',
              loading: false 
            })
          }
        },
        
        updateTask: async (id: number, updates: Partial<Task>) => {
          set({ loading: true, error: null })
          try {
            const updatedTask = await TaskService.updateTask(id, updates)
            set(state => ({
              tasks: state.tasks.map(task => 
                task.id === id ? updatedTask : task
              ),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
              loading: false
            }))
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '更新任务失败',
              loading: false 
            })
          }
        },
        
        deleteTask: async (id: number) => {
          set({ loading: true, error: null })
          try {
            await TaskService.deleteTask(id)
            set(state => ({
              tasks: state.tasks.filter(task => task.id !== id),
              currentTask: state.currentTask?.id === id ? null : state.currentTask,
              loading: false,
              pagination: {
                ...state.pagination,
                total: Math.max(0, state.pagination.total - 1)
              }
            }))
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '删除任务失败',
              loading: false 
            })
          }
        },
        
        logWorkHours: async (id: number, hours: number, description?: string) => {
          set({ loading: true, error: null })
          try {
            const updatedTask = await TaskService.updateTaskHours(id, hours)
            set(state => ({
              tasks: state.tasks.map(task => 
                task.id === id ? updatedTask : task
              ),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
              loading: false
            }))
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '记录工时失败',
              loading: false 
            })
          }
        },
        
        // 批量操作
        batchDelete: async (taskIds: number[]) => {
          set({ loading: true, error: null })
          try {
            await TaskService.batchDelete(taskIds)
            set(state => ({
              tasks: state.tasks.filter(task => !taskIds.includes(task.id)),
              loading: false,
              pagination: {
                ...state.pagination,
                total: Math.max(0, state.pagination.total - taskIds.length)
              }
            }))
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
          set({ searchQuery: query })
          get().fetchTasks()
        },
        
        setProjectFilter: (projectId) => {
          set({ projectFilter: projectId })
          get().fetchTasks()
        },
        
        setAssigneeFilter: (assigneeId) => {
          set({ assigneeFilter: assigneeId })
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
          set(state => ({ pagination: { ...state.pagination, page } }))
          get().fetchTasks()
        },
        
        setLimit: (limit) => {
          set(state => ({ pagination: { ...state.pagination, limit, page: 1 } }))
          get().fetchTasks()
        },
        
        // 重置
        resetFilters: () => {
          set({
            searchQuery: '',
            projectFilter: 'all',
            assigneeFilter: 'all',
            sortBy: 'updated_at',
            sortOrder: 'desc'
          })
          get().fetchTasks()
        },
        
        clearError: () => set({ error: null })
      }),
      {
        name: 'task-store',
        partialize: (state) => ({
          searchQuery: state.searchQuery,
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
)
