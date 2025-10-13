import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  BarChart3,
  Bell,
  Users,
  Download,
  Settings,
  Menu,
  X,
  Home,
  ChevronRight,
  User,
  LogOut,
  Moon,
  Sun
} from 'lucide-react'
import { navigationItems, getBreadcrumbs, getActiveNavItem } from '../router'
import { useAppStore } from '../stores/useAppStore'
import { useResponsive } from '../hooks/useResponsive'
import { cn } from '../utils/cn'

const iconMap = {
  FolderOpen,
  BarChart3,
  Bell,
  Users,
  Download,
  Settings
}

const Layout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const { user, theme, toggleTheme, logout } = useAppStore()
  const { isMobile, isTablet } = useResponsive()
  const activeNavItem = getActiveNavItem(location.pathname)
  const breadcrumbs = getBreadcrumbs(location.pathname)

  const handleNavigation = (path: string) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 自动关闭移动端侧边栏
  React.useEffect(() => {
    if (!isMobile && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [isMobile, sidebarOpen])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 移动端遮罩 */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out',
        isMobile ? 'w-64' : isTablet ? 'w-56' : 'w-64',
        sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full',
        !isMobile && 'static inset-0'
      )}>
        <div className="flex items-center justify-between h-16 px-4 lg:px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className={cn(
            'font-bold text-gray-900 dark:text-white',
            isMobile ? 'text-lg' : isTablet ? 'text-base' : 'text-xl'
          )}>
            {isMobile || isTablet ? '项目管理' : '项目管理系统'}
          </h1>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="mt-6 px-2 lg:px-3">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap]
              const isActive = activeNavItem === item.id
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    )}
                  >
                    <Icon className={cn(
                      'flex-shrink-0',
                      isMobile || isTablet ? 'mr-2 h-4 w-4' : 'mr-3 h-5 w-5'
                    )} />
                    <span className={cn(
                      'truncate',
                      isTablet && 'text-xs'
                    )}>
                      {item.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* 用户信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={cn(
                'rounded-full bg-blue-500 flex items-center justify-center',
                isMobile || isTablet ? 'h-7 w-7' : 'h-8 w-8'
              )}>
                <User className={cn(
                  'text-white',
                  isMobile || isTablet ? 'h-3 w-3' : 'h-4 w-4'
                )} />
              </div>
            </div>
            <div className="ml-2 lg:ml-3 flex-1 min-w-0">
              <p className={cn(
                'font-medium text-gray-900 dark:text-white truncate',
                isMobile || isTablet ? 'text-xs' : 'text-sm'
              )}>
                {user?.name || '用户'}
              </p>
              {!isTablet && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 lg:ml-2 p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="退出登录"
            >
              <LogOut className={cn(
                isMobile || isTablet ? 'h-3 w-3' : 'h-4 w-4'
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className={cn(
        'transition-all duration-300',
        !isMobile && 'pl-56 lg:pl-64'
      )}>
        {/* 顶部栏 */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className={cn(
            'flex items-center justify-between h-14 lg:h-16',
            isMobile ? 'px-3' : 'px-4 sm:px-6 lg:px-8'
          )}>
            <div className="flex items-center flex-1 min-w-0">
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 mr-2"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              
              {/* 面包屑导航 */}
              <nav className="flex-1 min-w-0">
                <ol className="flex items-center space-x-1 lg:space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.path} className="flex items-center min-w-0">
                      {index > 0 && (
                        <ChevronRight className={cn(
                          'text-gray-400 mx-1 lg:mx-2 flex-shrink-0',
                          isMobile ? 'h-3 w-3' : 'h-4 w-4'
                        )} />
                      )}
                      {index === 0 ? (
                        <Home className={cn(
                          'text-gray-400',
                          isMobile ? 'h-3 w-3' : 'h-4 w-4'
                        )} />
                      ) : (
                        <span
                          className={cn(
                            'font-medium truncate',
                            index === breadcrumbs.length - 1
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer',
                            isMobile ? 'text-xs' : 'text-sm'
                          )}
                          onClick={() => {
                            if (index < breadcrumbs.length - 1) {
                              navigate(crumb.path)
                            }
                          }}
                        >
                          {isMobile && crumb.label.length > 8 
                            ? crumb.label.substring(0, 8) + '...' 
                            : crumb.label
                          }
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            {/* 右侧操作区域 */}
            <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              >
                {theme === 'dark' ? (
                  <Sun className={cn(isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
                ) : (
                  <Moon className={cn(isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
                )}
              </button>
              {/* 通知按钮 */}
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                <Bell className={cn(isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>

        {/* 页面内容 */}
        <main className="flex-1">
          <div className={cn(
            isMobile ? 'py-4' : 'py-6'
          )}>
            <div className={cn(
              'max-w-7xl mx-auto',
              isMobile ? 'px-3' : 'px-4 sm:px-6 lg:px-8'
            )}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout