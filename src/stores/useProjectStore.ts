import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Project, ProjectStatus, ProjectPriority } from '../types'
import { ProjectService } from '../services/projectService'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  error: string | null
  searchQuery: string
  statusFilter: ProjectStatus | 'all'
  priorityFilter: ProjectPriority | 'all'
  sortBy: 'name' | 'created_at' | 'updated_at' | 'deadline'
  sortOrder: 'asc' | 'desc'
  pagination: {
    page: number
    limit: number
    total: number
  }
}

interface ProjectActions {
  // 数据获取
  fetchProjects: () => Promise<void>
  fetchProjectById: (id: string) => Promise<void>
  
  // 项目操作
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  
  // 状态管理
  setCurrentProject: (project: Project | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 筛选和搜索
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: ProjectStatus | 'all') => void
  setPriorityFilter: (priority: ProjectPriority | 'all') => void
  setSortBy: (sortBy: ProjectState['sortBy']) => void
  setSortOrder: (order: 'asc' | 'desc') => void
  
  // 分页
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  
  // 重置
  resetFilters: () => void
  clearError: () => void
}

type ProjectStore = ProjectState & ProjectActions

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  sortBy: 'updated_at',
  sortOrder: 'desc',
  pagination: {
    page: 1,
    limit: 10,
    total: 0
  }
}

export const useProjectStore = create<ProjectStore>()()
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 数据获取
        fetchProjects: async () => {
          const state = get()
          set({ loading: true, error: null })
          
          try {
            const filters = {
              search: state.searchQuery || undefined,
              status: state.statusFilter !== 'all' ? state.statusFilter : undefined,
              priority: state.priorityFilter !== 'all' ? state.priorityFilter : undefined
            }
            
            const result = await ProjectService.getProjects(
              filters,
              state.pagination.page,
              state.pagination.limit,
              state.sortBy,
              state.sortOrder
            )
            
            set({
              projects: result.data,
              pagination: {
                ...state.pagination,
                total: result.total
              },
              loading: false
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '获取项目列表失败',
              loading: false
            })
          }
        },
        
        fetchProjectById: async (id: string) => {
          set({ loading: true, error: null })
          
          try {
            const project = await ProjectService.getProjectById(id)
            set({ currentProject: project, loading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '获取项目详情失败',
              loading: false
            })
          }
        },
        
        // 项目操作
        createProject: async (projectData) => {
          set({ loading: true, error: null })
          
          try {
            const newProject = await ProjectService.createProject(projectData)
            const state = get()
            set({
              projects: [newProject, ...state.projects],
              loading: false
            })
            
            // 重新获取项目列表以确保数据同步
            await get().fetchProjects()
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '创建项目失败',
              loading: false
            })
          }
        },
        
        updateProject: async (id: string, updates: Partial<Project>) => {
          set({ loading: true, error: null })
          
          try {
            const updatedProject = await ProjectService.updateProject(id, updates)
            const state = get()
            
            set({
              projects: state.projects.map(p => p.id === id ? updatedProject : p),
              currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject,
              loading: false
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '更新项目失败',
              loading: false
            })
          }
        },
        
        deleteProject: async (id: string) => {
          set({ loading: true, error: null })
          
          try {
            await ProjectService.deleteProject(id)
            const state = get()
            
            set({
              projects: state.projects.filter(p => p.id !== id),
              currentProject: state.currentProject?.id === id ? null : state.currentProject,
              loading: false
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '删除项目失败',
              loading: false
            })
          }
        },
        
        // 状态管理
        setCurrentProject: (project) => set({ currentProject: project }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        
        // 筛选和搜索
        setSearchQuery: (query) => {
          set({ searchQuery: query, pagination: { ...get().pagination, page: 1 } })
          // 自动触发搜索
          setTimeout(() => get().fetchProjects(), 300)
        },
        
        setStatusFilter: (status) => {
          set({ statusFilter: status, pagination: { ...get().pagination, page: 1 } })
          get().fetchProjects()
        },
        
        setPriorityFilter: (priority) => {
          set({ priorityFilter: priority, pagination: { ...get().pagination, page: 1 } })
          get().fetchProjects()
        },
        
        setSortBy: (sortBy) => {
          set({ sortBy })
          get().fetchProjects()
        },
        
        setSortOrder: (order) => {
          set({ sortOrder: order })
          get().fetchProjects()
        },
        
        // 分页
        setPage: (page) => {
          set({ pagination: { ...get().pagination, page } })
          get().fetchProjects()
        },
        
        setLimit: (limit) => {
          set({ pagination: { ...get().pagination, limit, page: 1 } })
          get().fetchProjects()
        },
        
        // 重置
        resetFilters: () => {
          set({
            searchQuery: '',
            statusFilter: 'all',
            priorityFilter: 'all',
            sortBy: 'updated_at',
            sortOrder: 'desc',
            pagination: { ...get().pagination, page: 1 }
          })
          get().fetchProjects()
        },
        
        clearError: () => set({ error: null })
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          searchQuery: state.searchQuery,
          statusFilter: state.statusFilter,
          priorityFilter: state.priorityFilter,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'project-store'
    }
  )