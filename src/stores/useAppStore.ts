import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  // 主题和外观
  theme: 'light' | 'dark' | 'system'
  colorScheme: string
  compactMode: boolean
  sidebarCollapsed: boolean
  
  // 通知设置
  notifications: {
    email_notifications: boolean
    push_notifications: boolean
    task_reminders: boolean
    project_updates: boolean
    deadline_alerts: boolean
  }
  
  // 应用状态
  loading: boolean
  error: string | null
  
  // 导航
  currentPage: string
  breadcrumbs: Array<{ label: string; path: string }>
  
  // 模态框和弹窗
  modals: {
    createProject: boolean
    createTask: boolean
    settings: boolean
    profile: boolean
  }
  
  // 搜索
  globalSearch: {
    query: string
    results: any[]
    loading: boolean
  }
}

interface AppActions {
  // 主题和外观
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setColorScheme: (scheme: string) => void
  setCompactMode: (compact: boolean) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // 通知设置
  updateNotificationSettings: (settings: Partial<AppState['notifications']>) => void
  
  // 应用状态
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // 导航
  setCurrentPage: (page: string) => void
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path: string }>) => void
  
  // 模态框和弹窗
  openModal: (modal: keyof AppState['modals']) => void
  closeModal: (modal: keyof AppState['modals']) => void
  closeAllModals: () => void
  
  // 全局搜索
  setGlobalSearchQuery: (query: string) => void
  setGlobalSearchResults: (results: any[]) => void
  setGlobalSearchLoading: (loading: boolean) => void
  clearGlobalSearch: () => void
  
  // 初始化
  initializeApp: () => Promise<void>
}

type AppStore = AppState & AppActions

const initialState: AppState = {
  // 主题和外观
  theme: 'light',
  colorScheme: 'blue',
  compactMode: false,
  sidebarCollapsed: false,
  
  // 通知设置
  notifications: {
    email_notifications: true,
    push_notifications: true,
    task_reminders: true,
    project_updates: true,
    deadline_alerts: true
  },
  
  // 应用状态
  loading: false,
  error: null,
  
  // 导航
  currentPage: '',
  breadcrumbs: [],
  
  // 模态框和弹窗
  modals: {
    createProject: false,
    createTask: false,
    settings: false,
    profile: false
  },
  
  // 搜索
  globalSearch: {
    query: '',
    results: [],
    loading: false
  }
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // 主题和外观
        setTheme: (theme) => {
          set({ theme })
          // 应用主题到 DOM
          const root = document.documentElement
          if (theme === 'dark') {
            root.classList.add('dark')
          } else if (theme === 'light') {
            root.classList.remove('dark')
          } else {
            // system theme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (prefersDark) {
              root.classList.add('dark')
            } else {
              root.classList.remove('dark')
            }
          }
        },
        
        setColorScheme: (scheme) => {
          set({ colorScheme: scheme })
          // 应用颜色方案到 CSS 变量
          const root = document.documentElement
          root.setAttribute('data-color-scheme', scheme)
        },
        
        setCompactMode: (compact) => {
          set({ compactMode: compact })
          const root = document.documentElement
          if (compact) {
            root.classList.add('compact')
          } else {
            root.classList.remove('compact')
          }
        },
        
        toggleSidebar: () => {
          const { sidebarCollapsed } = get()
          set({ sidebarCollapsed: !sidebarCollapsed })
        },
        
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        
        // 通知设置
        updateNotificationSettings: (settings) => {
          const { notifications } = get()
          set({ notifications: { ...notifications, ...settings } })
        },
        
        // 应用状态
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        
        // 导航
        setCurrentPage: (page) => set({ currentPage: page }),
        
        setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
        
        // 模态框和弹窗
        openModal: (modal) => {
          const { modals } = get()
          set({ modals: { ...modals, [modal]: true } })
        },
        
        closeModal: (modal) => {
          const { modals } = get()
          set({ modals: { ...modals, [modal]: false } })
        },
        
        closeAllModals: () => {
          set({
            modals: {
              createProject: false,
              createTask: false,
              settings: false,
              profile: false
            }
          })
        },
        
        // 全局搜索
        setGlobalSearchQuery: (query) => {
          const { globalSearch } = get()
          set({ globalSearch: { ...globalSearch, query } })
        },
        
        setGlobalSearchResults: (results) => {
          const { globalSearch } = get()
          set({ globalSearch: { ...globalSearch, results } })
        },
        
        setGlobalSearchLoading: (loading) => {
          const { globalSearch } = get()
          set({ globalSearch: { ...globalSearch, loading } })
        },
        
        clearGlobalSearch: () => {
          set({
            globalSearch: {
              query: '',
              results: [],
              loading: false
            }
          })
        },
        
        // 初始化
        initializeApp: async () => {
          set({ loading: true })
          
          try {
            // 初始化主题
            const { theme, colorScheme, compactMode } = get()
            get().setTheme(theme)
            get().setColorScheme(colorScheme)
            get().setCompactMode(compactMode)
            
            // 检查用户认证状态 - 单用户系统，无需检查
            // 已移除用户认证相关逻辑
            
            // 监听系统主题变化
            if (theme === 'system') {
              const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
              const handleChange = () => get().setTheme('system')
              mediaQuery.addEventListener('change', handleChange)
            }
            
            set({ loading: false })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '应用初始化失败',
              loading: false 
            })
          }
        }
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          theme: state.theme,
          colorScheme: state.colorScheme,
          compactMode: state.compactMode,
          sidebarCollapsed: state.sidebarCollapsed,
          notifications: state.notifications
        })
      }
    ),
    {
      name: 'app-store'
    }
  )
)

// 导出常用的状态选择器
export const useTheme = () => useAppStore(state => state.theme)
export const useSidebarCollapsed = () => useAppStore(state => state.sidebarCollapsed)
export const useModals = () => useAppStore(state => state.modals)
export const useGlobalSearch = () => useAppStore(state => state.globalSearch)
