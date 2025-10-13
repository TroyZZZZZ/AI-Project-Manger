import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Calendar, TrendingUp, Clock, Users, Filter, Download } from 'lucide-react'
import { WorkloadService } from '../services/workloadService'
import { ProjectService } from '../services/projectService'
import type { Project, WorkloadStats, DashboardStats } from '../types'
import { useResponsive } from '../hooks/useResponsive'
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid'
import { cn } from '../utils/cn'

const WorkloadStatsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [workloadStats, setWorkloadStats] = useState<WorkloadStats | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')
  const { isMobile, isTablet } = useResponsive()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedProject !== 'all') {
      loadProjectStats(selectedProject)
    } else {
      loadOverallStats()
    }
  }, [selectedProject])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [projectsData, statsData] = await Promise.all([
        ProjectService.getProjects({ page: 1, limit: 100 }),
        WorkloadService.getDashboardStats()
      ])
      
      setProjects(projectsData.data)
      setDashboardStats(statsData)
      
      // 加载整体统计数据
      await loadOverallStats()
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjectStats = async (projectId: string) => {
    try {
      const stats = await WorkloadService.getProjectWorkloadStats(projectId)
      setWorkloadStats(stats)
      setWeeklyData(stats.weekly_hours || [])
      setMonthlyData(stats.monthly_hours || [])
    } catch (error) {
      console.error('Error loading project stats:', error)
    }
  }

  const loadOverallStats = async () => {
    try {
      const [weeklyHours, monthlyHours] = await Promise.all([
        WorkloadService.getWeeklyHours(undefined, 12),
        WorkloadService.getMonthlyHours(undefined, 6)
      ])
      
      setWeeklyData(weeklyHours)
      setMonthlyData(monthlyHours)
      setWorkloadStats(null) // 清除单个项目统计
    } catch (error) {
      console.error('Error loading overall stats:', error)
    }
  }

  const exportData = () => {
    const data = timeRange === 'week' ? weeklyData : monthlyData
    const csvContent = "data:text/csv;charset=utf-8," + 
      "时间,工时\n" +
      data.map(item => `${timeRange === 'week' ? item.week : item.month},${item.hours}`).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `workload_stats_${timeRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const chartData = timeRange === 'week' ? weeklyData : monthlyData
  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  // 准备饼图数据
  const pieData = dashboardStats ? [
    { name: '进行中', value: dashboardStats.activeProjects, color: '#10B981' },
    { name: '已完成', value: dashboardStats.completedProjects, color: '#3B82F6' },
    { name: '其他', value: dashboardStats.totalProjects - dashboardStats.activeProjects - dashboardStats.completedProjects, color: '#6B7280' }
  ].filter(item => item.value > 0) : []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
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
            isMobile ? 'text-2xl' : 'text-3xl'
          )}>工作量统计</h1>
          <button
            onClick={exportData}
            className={cn(
              'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
              isMobile && 'w-full justify-center'
            )}
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>

        {/* 筛选器 */}
        <div className={cn(
          'bg-white rounded-lg shadow mb-6',
          isMobile ? 'p-4' : 'p-6'
        )}>
          <div className={cn(
            'flex gap-4',
            isMobile ? 'flex-col' : 'flex-col sm:flex-row'
          )}>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={cn(
                  'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  isMobile && 'flex-1'
                )}
              >
                <option value="all">所有项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'week' | 'month')}
                className={cn(
                  'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  isMobile && 'flex-1'
                )}
              >
                <option value="week">按周统计</option>
                <option value="month">按月统计</option>
              </select>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <ResponsiveGrid 
          cols={{ mobile: 1, tablet: 2, desktop: 4 }}
          gap={{ mobile: 4, tablet: 5, desktop: 6 }}
          className="mb-8"
        >
          {dashboardStats && (
            <>
              <div className="bg-white rounded-lg shadow">
                <div className={cn(
                  'flex items-center justify-between',
                  isMobile ? 'p-4' : 'p-6'
                )}>
                  <div>
                    <p className={cn(
                      'font-medium text-gray-600',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}>总工时</p>
                    <p className={cn(
                      'font-bold text-blue-600',
                      isMobile ? 'text-xl' : 'text-2xl'
                    )}>{dashboardStats.totalHours}h</p>
                  </div>
                  <div className={cn(
                    'bg-blue-100 rounded-full',
                    isMobile ? 'p-2' : 'p-3'
                  )}>
                    <Clock className={cn(
                      'text-blue-600',
                      isMobile ? 'w-5 h-5' : 'w-6 h-6'
                    )} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className={cn(
                  'flex items-center justify-between',
                  isMobile ? 'p-4' : 'p-6'
                )}>
                  <div>
                    <p className={cn(
                      'font-medium text-gray-600',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}>本周工时</p>
                    <p className={cn(
                      'font-bold text-green-600',
                      isMobile ? 'text-xl' : 'text-2xl'
                    )}>{dashboardStats.thisWeekHours}h</p>
                  </div>
                  <div className={cn(
                    'bg-green-100 rounded-full',
                    isMobile ? 'p-2' : 'p-3'
                  )}>
                    <TrendingUp className={cn(
                      'text-green-600',
                      isMobile ? 'w-5 h-5' : 'w-6 h-6'
                    )} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className={cn(
                  'flex items-center justify-between',
                  isMobile ? 'p-4' : 'p-6'
                )}>
                  <div>
                    <p className={cn(
                      'font-medium text-gray-600',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}>活跃项目</p>
                    <p className={cn(
                      'font-bold text-purple-600',
                      isMobile ? 'text-xl' : 'text-2xl'
                    )}>{dashboardStats.activeProjects}</p>
                  </div>
                  <div className={cn(
                    'bg-purple-100 rounded-full',
                    isMobile ? 'p-2' : 'p-3'
                  )}>
                    <Users className={cn(
                      'text-purple-600',
                      isMobile ? 'w-5 h-5' : 'w-6 h-6'
                    )} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className={cn(
                  'flex items-center justify-between',
                  isMobile ? 'p-4' : 'p-6'
                )}>
                  <div>
                    <p className={cn(
                      'font-medium text-gray-600',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}>完成任务</p>
                    <p className={cn(
                      'font-bold text-indigo-600',
                      isMobile ? 'text-xl' : 'text-2xl'
                    )}>{dashboardStats.completedTasks}</p>
                  </div>
                  <div className={cn(
                    'bg-indigo-100 rounded-full',
                    isMobile ? 'p-2' : 'p-3'
                  )}>
                    <Calendar className={cn(
                      'text-indigo-600',
                      isMobile ? 'w-5 h-5' : 'w-6 h-6'
                    )} />
                  </div>
                </div>
              </div>
            </>
          )}
        </ResponsiveGrid>

        {/* 项目特定统计 */}
        {workloadStats && selectedProject !== 'all' && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">项目详细统计</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{workloadStats.total_tasks}</p>
                <p className="text-sm text-gray-600">总任务数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{workloadStats.completed_tasks}</p>
                <p className="text-sm text-gray-600">已完成任务</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{workloadStats.completion_rate}%</p>
                <p className="text-sm text-gray-600">完成率</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{workloadStats.efficiency_rate}%</p>
                <p className="text-sm text-gray-600">效率率</p>
              </div>
            </div>
          </div>
        )}

        {/* 图表区域 */}
        <ResponsiveGrid 
          cols={{ mobile: 1, tablet: 1, desktop: 2 }}
          gap={{ mobile: 4, tablet: 5, desktop: 6 }}
          className="mb-6"
        >
          {/* 工时趋势图 */}
          <div className="bg-white rounded-lg shadow">
            <div className={cn(
              isMobile ? 'p-4' : 'p-6'
            )}>
              <h2 className={cn(
                'font-semibold text-gray-900 mb-4',
                isMobile ? 'text-lg' : 'text-xl'
              )}>
                {timeRange === 'week' ? '周工时趋势' : '月工时趋势'}
              </h2>
              <div className={cn(
                isMobile ? 'h-64' : 'h-80',
                isMobile && 'overflow-x-auto'
              )}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={timeRange === 'week' ? 'week' : 'month'} 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip 
                      labelFormatter={(label) => timeRange === 'week' ? `周: ${label}` : `月: ${label}`}
                      formatter={(value) => [`${value}小时`, '工时']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 项目状态分布 */}
          <div className="bg-white rounded-lg shadow">
            <div className={cn(
              isMobile ? 'p-4' : 'p-6'
            )}>
              <h2 className={cn(
                'font-semibold text-gray-900 mb-4',
                isMobile ? 'text-lg' : 'text-xl'
              )}>项目状态分布</h2>
              <div className={cn(
                isMobile ? 'h-64' : 'h-80'
              )}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 40 : 60}
                      outerRadius={isMobile ? 80 : 120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}个`, '项目数']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={cn(
                'flex justify-center gap-4 mt-4',
                isMobile && 'flex-wrap gap-2'
              )}>
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className={cn(
                        'rounded-full',
                        isMobile ? 'w-2 h-2' : 'w-3 h-3'
                      )}
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className={cn(
                      'text-gray-600',
                      isMobile ? 'text-xs' : 'text-sm'
                    )}>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ResponsiveGrid>

        {/* 工时柱状图 */}
        <div className="bg-white rounded-lg shadow">
          <div className={cn(
            isMobile ? 'p-4' : 'p-6'
          )}>
            <h2 className={cn(
              'font-semibold text-gray-900 mb-4',
              isMobile ? 'text-lg' : 'text-xl'
            )}>
              {timeRange === 'week' ? '周工时分布' : '月工时分布'}
            </h2>
            <div className={cn(
              isMobile ? 'h-64' : 'h-80',
              isMobile && 'overflow-x-auto'
            )}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={timeRange === 'week' ? 'week' : 'month'} 
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip 
                    labelFormatter={(label) => timeRange === 'week' ? `周: ${label}` : `月: ${label}`}
                    formatter={(value) => [`${value}小时`, '工时']}
                  />
                  <Bar 
                    dataKey="hours" 
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkloadStatsPage