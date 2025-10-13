import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, BarChart3, Calendar, Users, Clock } from 'lucide-react'
import { WorkloadService } from '../services/workloadService'
import { ProjectService } from '../services/projectService'
import type { Project, DashboardStats } from '../types'
import { useResponsive } from '../hooks/useResponsive'
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid'
import { cn } from '../utils/cn'

const ProjectOverview: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { isMobile, isTablet } = useResponsive()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 并行加载项目列表和仪表板统计
      const [projectsData, statsData] = await Promise.all([
        ProjectService.getProjects({ page: 1, limit: 50 }),
        WorkloadService.getDashboardStats()
      ])
      
      setProjects(projectsData.data)
      setDashboardStats(statsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return '规划中'
      case 'in_progress': return '进行中'
      case 'on_hold': return '暂停'
      case 'completed': return '已完成'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return priority
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className={cn(
          'flex justify-between items-center mb-8',
          isMobile && 'flex-col space-y-3 items-start'
        )}>
          <h1 className={cn(
            'font-bold text-gray-900',
            isMobile ? 'text-xl' : 'text-3xl'
          )}>项目概览</h1>
          <Link
            to="/projects/new"
            className={cn(
              'bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors',
              isMobile ? 'px-3 py-2 text-sm w-full justify-center' : 'px-4 py-2'
            )}
          >
            <Plus className="w-4 h-4" />
            新建项目
          </Link>
        </div>

        {/* 统计卡片 */}
        {dashboardStats && (
          <ResponsiveGrid 
            cols={{ mobile: 1, tablet: 2, desktop: 4 }}
            gap={{ mobile: 3, tablet: 4, desktop: 6 }}
            className="mb-8"
          >
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总项目数</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalProjects}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">进行中项目</p>
                  <p className="text-2xl font-bold text-green-600">{dashboardStats.activeProjects}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">本周工时</p>
                  <p className="text-2xl font-bold text-purple-600">{dashboardStats.thisWeekHours}h</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">即将到期</p>
                  <p className="text-2xl font-bold text-red-600">{dashboardStats.upcomingDeadlines}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </ResponsiveGrid>
        )}

        {/* 搜索和筛选 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索项目名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">所有状态</option>
                <option value="planning">规划中</option>
                <option value="in_progress">进行中</option>
                <option value="on_hold">暂停</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">项目列表</h2>
          </div>
          
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
              <p className="text-gray-500 mb-4">开始创建您的第一个项目吧</p>
              <Link
                to="/projects/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建项目
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {project.name}
                        </Link>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                        <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
                          优先级: {getPriorityText(project.priority)}
                        </span>
                      </div>
                      
                      {project.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        {project.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            开始: {new Date(project.start_date).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                        {project.end_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            结束: {new Date(project.end_date).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          更新: {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                      >
                        查看详情
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectOverview