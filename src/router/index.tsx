import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProjectOverview from '../pages/ProjectOverview'
import ProjectCreate from '../pages/ProjectCreate'
import ProjectDetail from '../pages/ProjectDetail'
import StakeholderManagement from '../pages/StakeholderManagement'
import StorylineFollowUpHistory from '../pages/StorylineFollowUpHistory'
import SubprojectStoriesPage from '../pages/SubprojectStoriesPage'
import Efficiency from '../pages/Efficiency'
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
        element: <Navigate to="/efficiency" replace />
      },
      {
        path: 'projects',
        element: <ProjectOverview />
      },
      {
        path: 'projects/new',
        element: <ProjectCreate />
      },
      {
        path: 'projects/:id',
        element: <ProjectDetail />
      },
      {
        path: 'stakeholders',
        element: <StakeholderManagement />
      },
      {
        path: 'reminders',
        element: <Navigate to="/efficiency" replace />
      },
      {
        path: 'projects/:projectId/subprojects/:subprojectId/stories',
        element: <SubprojectStoriesPage />
      },
      {
        path: 'storylines/:projectId/:id/follow-ups',
        element: <StorylineFollowUpHistory />
      },
      {
        path: 'efficiency',
        element: <Efficiency />
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
    id: 'efficiency',
    label: '效能工时',
    path: '/efficiency',
    icon: 'BarChart3',
    description: '工时登记与效能目标'
  },
  {
    id: 'projects',
    label: '项目概览',
    path: '/projects',
    icon: 'FolderOpen',
    description: '查看和管理所有项目'
  },
  {
    id: 'stakeholders',
    label: '干系人管理',
    path: '/stakeholders',
    icon: 'Users',
    description: '管理项目干系人信息'
  }
]

// 面包屑导航配置
export const getBreadcrumbs = (pathname: string, params?: Record<string, string>) => {
  const breadcrumbs = [{ label: '首页', path: '/' }]
  
  switch (true) {
    case pathname === '/projects':
      breadcrumbs.push({ label: '项目概览', path: '/projects' })
      break
      
    case pathname.startsWith('/projects/new'):
      breadcrumbs.push(
        { label: '项目概览', path: '/projects' },
        { label: '新建项目', path: '/projects/new' }
      )
      break
      
    case pathname.startsWith('/projects/') && !!params?.id:
      breadcrumbs.push(
        { label: '项目概览', path: '/projects' },
        { label: '项目详情', path: `/projects/${params.id}` }
      )
      break
      
    case pathname.startsWith('/efficiency'):
      breadcrumbs.push({ label: '效能工时', path: '/efficiency' })
      break
      
    default:
      break
  }
  
  return breadcrumbs
}

// 获取当前激活的导航项
export const getActiveNavItem = (pathname: string) => {
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/stakeholders')) return 'stakeholders'
  if (pathname.startsWith('/efficiency')) return 'efficiency'
  return 'projects'
}
