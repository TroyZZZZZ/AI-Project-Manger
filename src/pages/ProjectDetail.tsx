import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Plus, Calendar, Clock, Users, BarChart3, CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { ProjectService } from '../services/projectService'
import { TaskService } from '../services/taskService'
import { WorkloadService } from '../services/workloadService'
import type { Project, Task, WorkloadStats } from '../types'

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [workloadStats, setWorkloadStats] = useState<WorkloadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timeline'>('overview')
  const [taskFilter, setTaskFilter] = useState<string>('all')

  useEffect(() => {
    if (id) {
      loadProjectData(id)
    }
  }, [id])

  const loadProjectData = async (projectId: string) => {
    try {
      setLoading(true)
      
      const [projectData, tasksData, statsData] = await Promise.all([
        ProjectService.getProject(projectId),
        TaskService.getTasks({ project_id: projectId, page: 1, limit: 100 }),
        WorkloadService.getProjectWorkloadStats(projectId)
      ])
      
      setProject(projectData)
      setTasks(tasksData.data)
      setWorkloadStats(statsData)
    } catch (error) {
      console.error('Error loading project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await TaskService.updateTask(taskId, { status: newStatus })
      // 重新加载任务数据
      if (id) {
        const tasksData = await TaskService.getTasks({ project_id: id, page: 1, limit: 100 })
        setTasks(tasksData.data)
        // 重新加载统计数据
        const statsData = await WorkloadService.getProjectWorkloadStats(id)
        setWorkloadStats(statsData)
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

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
      case 'todo': return '待办'
      case 'in_review': return '审核中'
      case 'done': return '已完成'
      default: return status
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600" />
      case 'in_review': return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default: return <Circle className="w-5 h-5 text-gray-400" />
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

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'all') return true
    return task.status === taskFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">项目未找到</h2>
            <Link to="/" className="text-blue-600 hover:text-blue-800">返回项目列表</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
        </div>

        {/* 项目基本信息 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">开始日期</p>
                    <p className="text-gray-900">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('zh-CN') : '未设置'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">结束日期</p>
                    <p className="text-gray-900">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('zh-CN') : '未设置'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">优先级</p>
                    <p className={`font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority === 'high' ? '高' : project.priority === 'medium' ? '中' : '低'}
                    </p>
                  </div>
                </div>
              </div>
              <button className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        {workloadStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总任务数</p>
                  <p className="text-2xl font-bold text-gray-900">{workloadStats.total_tasks}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">已完成</p>
                  <p className="text-2xl font-bold text-green-600">{workloadStats.completed_tasks}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">预估工时</p>
                  <p className="text-2xl font-bold text-purple-600">{workloadStats.total_estimated_hours}h</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">完成率</p>
                  <p className="text-2xl font-bold text-indigo-600">{workloadStats.completion_rate}%</p>
                </div>
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
          </div>
        )}

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                项目概览
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                任务管理
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                项目时间线
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">项目进度</h3>
                {workloadStats && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>任务完成进度</span>
                        <span>{workloadStats.completed_tasks}/{workloadStats.total_tasks}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${workloadStats.completion_rate}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>工时效率</span>
                        <span>{workloadStats.efficiency_rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            workloadStats.efficiency_rate > 100 ? 'bg-red-500' : 
                            workloadStats.efficiency_rate > 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(workloadStats.efficiency_rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">任务列表</h3>
                  <div className="flex items-center gap-4">
                    <select
                      value={taskFilter}
                      onChange={(e) => setTaskFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">所有任务</option>
                      <option value="todo">待办</option>
                      <option value="in_progress">进行中</option>
                      <option value="in_review">审核中</option>
                      <option value="done">已完成</option>
                    </select>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                      <Plus className="w-4 h-4" />
                      新建任务
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={() => handleTaskStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
                            className="mt-1"
                          >
                            {getTaskStatusIcon(task.status)}
                          </button>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                            {task.description && (
                              <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className={`px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                {getStatusText(task.status)}
                              </span>
                              {task.priority && (
                                <span className={getPriorityColor(task.priority)}>
                                  优先级: {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span>预估: {task.estimated_hours}h</span>
                              )}
                              {task.actual_hours && (
                                <span>实际: {task.actual_hours}h</span>
                              )}
                              {task.due_date && (
                                <span>截止: {new Date(task.due_date).toLocaleDateString('zh-CN')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      暂无任务
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">项目时间线</h3>
                <div className="text-center py-8 text-gray-500">
                  时间线功能开发中...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetail