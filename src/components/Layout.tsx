import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { navigationItems, getActiveNavItem } from '../router'
import { useResponsive } from '../hooks/useResponsive'
import { cn } from '../utils/cn'

const Layout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const activeNavItem = getActiveNavItem(location.pathname)

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className={cn(
          'flex items-center justify-between h-14 lg:h-16',
          isMobile ? 'px-3' : 'px-4 sm:px-6 lg:px-8'
        )}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className={cn(
              'font-bold text-gray-900 dark:text-white',
              isMobile ? 'text-lg' : isTablet ? 'text-base' : 'text-xl'
            )}>
              {isMobile || isTablet ? '项目管理' : '项目管理系统'}
            </h1>
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto">
            {navigationItems.map((item) => {
              const isActive = activeNavItem === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-all shadow-sm',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:shadow'
                  )}
                >
                  <span className={cn(
                    'truncate',
                    isTablet && 'text-xs'
                  )}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        <div className={cn(
          'w-full',
          isMobile ? 'py-0 px-2' : 'py-0 px-4'
        )}>
          <div className="w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout
