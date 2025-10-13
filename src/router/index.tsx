import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProjectOverview from '../pages/ProjectOverview'
import ProjectDetail from '../pages/ProjectDetail'
import WorkloadStats from '../pages/WorkloadStats'
import ReminderCenter from '../pages/ReminderCenter'
import StakeholderManagement from '../pages/StakeholderManagement'
import DataExport from '../pages/DataExport'
import Settings from '../pages/Settings'
import ErrorBoundary from '../components/ErrorBoundary'
import NotFound from '../components/NotFound'

// 路由配置
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/projects" replace />
      },
      {
        path: 'projects',
        element: <ProjectOverview />
      },
      {
        path: 'projects/:id',
        element: <ProjectDetail />
      },
      {
        path: 'workload',
        element: <WorkloadStats />
      },
      {
        path: 'reminders',
        element: <ReminderCenter />
      },
      {
        path: 'stakeholders',
        element: <StakeholderManagement />
      },
      {
        path: 'export',
        element: <DataExport />
      },
      {
        path: 'settings',
        element: <Settings />
      }
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
])

// 导航菜单配置
export const navigationItems = [
  {
    id: 'projects',
    label: '项目概览',
    path: '/projects',
    icon: 'FolderOpen',
    description: '查看和管理所有项目'
  },
  {
    id: 'workload',
    label: '工作量统计',
    path: '/workload',
    icon: 'BarChart3',
    description: '查看工作量分析和统计'
  },
  {
    id: 'reminders',
    label: '提醒中心',
    path: '/reminders',
    icon: 'Bell',
    description: '管理任务提醒和通知'
  },
  {
    id: 'stakeholders',
    label: '干系人管理',
    path: '/stakeholders',
    icon: 'Users',
    description: '管理项目干系人信息'
  },
  {
    id: 'export',
    label: '数据导出',
    path: '/export',
    icon: 'Download',
    description: '导出项目和任务数据'
  },
  {
    id: 'settings',
    label: '系统设置',
    path: '/settings',
    icon: 'Settings',
    description: '配置系统参数和偏好'
  }
]

// 面包屑导航配置
export const getBreadcrumbs = (pathname: string, params?: Record<string, string>) => {
  const breadcrumbs = [{ label: '首页', path: '/' }]
  
  switch (true) {
    case pathname === '/projects':
      breadcrumbs.push({ label: '项目概览', path: '/projects' })
      break
      
    case pathname.startsWith('/projects/') && params?.id:
      breadcrumbs.push(
        { label: '项目概览', path: '/projects' },
        { label: '项目详情', path: `/projects/${params.id}` }
      )
      break
      
    case pathname === '/workload':
      breadcrumbs.push({ label: '工作量统计', path: '/workload' })
      break
      
    case pathname === '/reminders':
      breadcrumbs.push({ label: '提醒中心', path: '/reminders' })
      break
      
    case pathname === '/stakeholders':
      breadcrumbs.push({ label: '干系人管理', path: '/stakeholders' })
      break
      
    case pathname === '/export':
      breadcrumbs.push({ label: '数据导出', path: '/export' })
      break
      
    case pathname === '/settings':
      breadcrumbs.push({ label: '系统设置', path: '/settings' })
      break
      
    default:
      break
  }
  
  return breadcrumbs
}

// 路由权限检查
export const checkRoutePermission = (path: string, userRole?: string) => {
  // 这里可以根据用户角色检查路由权限
  // 目前所有路由都允许访问
  return true
}

// 获取当前激活的导航项
export const getActiveNavItem = (pathname: string) => {
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname === '/workload') return 'workload'
  if (pathname === '/reminders') return 'reminders'
  if (pathname === '/stakeholders') return 'stakeholders'
  if (pathname === '/export') return 'export'
  if (pathname === '/settings') return 'settings'
  return 'projects' // 默认
}