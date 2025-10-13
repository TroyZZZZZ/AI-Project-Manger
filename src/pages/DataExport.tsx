import React, { useState, useEffect } from 'react'
import { Download, FileText, Calendar, BarChart3, Users, CheckCircle, Clock, Filter, RefreshCw } from 'lucide-react'
import { ProjectService } from '../services/projectService'
import { TaskService } from '../services/taskService'
import { WorkloadService } from '../services/workloadService'
import { StakeholderService } from '../services/stakeholderService'
import { useResponsive } from '../hooks/useResponsive'
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid'
import { cn } from '../utils/cn'
import type { Project } from '../types'

interface ExportOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  format: 'csv' | 'json' | 'pdf'
  category: 'project' | 'task' | 'report' | 'stakeholder'
}

const DataExport: React.FC = () => {
  const { isMobile, isTablet } = useResponsive()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string
    name: string
    timestamp: string
    status: 'success' | 'failed'
  }>>([])

  const exportOptions: ExportOption[] = [
    {
      id: 'projects_csv',
      name: '项目列表',
      description: '导出所有项目的基本信息，包括名称、状态、进度等',
      icon: <FileText className="w-6 h-6" />,
      format: 'csv',
      category: 'project'
    },
    {
      id: 'tasks_csv',
      name: '任务清单',
      description: '导出指定项目或所有项目的任务详情',
      icon: <CheckCircle className="w-6 h-6" />,
      format: 'csv',
      category: 'task'
    },
    {
      id: 'workload_report',
      name: '工作量报告',
      description: '生成指定时间范围内的工作量统计报告',
      icon: <BarChart3 className="w-6 h-6" />,
      format: 'pdf',
      category: 'report'
    },
    {
      id: 'stakeholders_csv',
      name: '干系人列表',
      description: '导出项目相关干系人的联系信息',
      icon: <Users className="w-6 h-6" />,
      format: 'csv',
      category: 'stakeholder'
    },
    {
      id: 'timeline_json',
      name: '项目时间线',
      description: '导出项目的完整时间线数据',
      icon: <Calendar className="w-6 h-6" />,
      format: 'json',
      category: 'project'
    },
    {
      id: 'progress_report',
      name: '进度报告',
      description: '生成项目进度的详细分析报告',
      icon: <Clock className="w-6 h-6" />,
      format: 'pdf',
      category: 'report'
    }
  ]

  useEffect(() => {
    loadProjects()
    loadExportHistory()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await ProjectService.getProjects({ page: 1, limit: 100 })
      setProjects(data.data)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExportHistory = () => {
    // 从本地存储加载导出历史
    const history = localStorage.getItem('exportHistory')
    if (history) {
      setExportHistory(JSON.parse(history))
    }
  }

  const saveExportHistory = (newRecord: any) => {
    const updatedHistory = [newRecord, ...exportHistory].slice(0, 10) // 只保留最近10条记录
    setExportHistory(updatedHistory)
    localStorage.setItem('exportHistory', JSON.stringify(updatedHistory))
  }

  const handleExport = async (option: ExportOption) => {
    setExporting(option.id)
    
    try {
      let data: any
      let filename: string
      
      switch (option.id) {
        case 'projects_csv':
          data = await exportProjectsCSV()
          filename = `projects_${new Date().toISOString().split('T')[0]}.csv`
          break
          
        case 'tasks_csv':
          data = await exportTasksCSV()
          filename = `tasks_${selectedProject === 'all' ? 'all' : 'project'}_${new Date().toISOString().split('T')[0]}.csv`
          break
          
        case 'stakeholders_csv':
          data = await exportStakeholdersCSV()
          filename = `stakeholders_${new Date().toISOString().split('T')[0]}.csv`
          break
          
        case 'timeline_json':
          data = await exportTimelineJSON()
          filename = `timeline_${selectedProject === 'all' ? 'all' : 'project'}_${new Date().toISOString().split('T')[0]}.json`
          break
          
        case 'workload_report':
        case 'progress_report':
          await generateReport(option)
          return
          
        default:
          throw new Error('未知的导出选项')
      }
      
      downloadFile(data, filename, option.format)
      
      saveExportHistory({
        id: Date.now().toString(),
        name: option.name,
        timestamp: new Date().toISOString(),
        status: 'success'
      })
      
    } catch (error) {
      console.error('Export error:', error)
      saveExportHistory({
        id: Date.now().toString(),
        name: option.name,
        timestamp: new Date().toISOString(),
        status: 'failed'
      })
    } finally {
      setExporting(null)
    }
  }

  const exportProjectsCSV = async () => {
    const projectsData = selectedProject === 'all' 
      ? projects 
      : projects.filter(p => p.id === selectedProject)
    
    const csvHeader = 'ID,名称,描述,状态,优先级,进度,开始日期,结束日期,创建时间\n'
    const csvRows = projectsData.map(project => {
      return [
        project.id,
        `"${project.name}"`,
        `"${project.description || ''}"`,
        project.status,
        project.priority,
        project.progress || 0,
        project.start_date || '',
        project.end_date || '',
        new Date(project.created_at).toLocaleString('zh-CN')
      ].join(',')
    }).join('\n')
    
    return csvHeader + csvRows
  }

  const exportTasksCSV = async () => {
    const filters = selectedProject === 'all' ? {} : { project_id: selectedProject }
    const tasksData = await TaskService.getTasks({ ...filters, page: 1, limit: 1000 })
    
    const csvHeader = 'ID,标题,描述,状态,优先级,项目ID,分配给,开始日期,截止日期,完成日期,工时,创建时间\n'
    const csvRows = tasksData.data.map(task => {
      return [
        task.id,
        `"${task.title}"`,
        `"${task.description || ''}"`,
        task.status,
        task.priority,
        task.project_id,
        task.assigned_to || '',
        task.start_date || '',
        task.due_date || '',
        task.completed_at || '',
        task.estimated_hours || 0,
        new Date(task.created_at).toLocaleString('zh-CN')
      ].join(',')
    }).join('\n')
    
    return csvHeader + csvRows
  }

  const exportStakeholdersCSV = async () => {
    const filters = selectedProject === 'all' ? {} : { project_id: selectedProject }
    const stakeholdersData = await StakeholderService.getStakeholders({ ...filters, page: 1, limit: 1000 })
    
    const csvHeader = 'ID,姓名,邮箱,电话,角色,公司,部门,项目ID,备注,创建时间\n'
    const csvRows = stakeholdersData.data.map(stakeholder => {
      return [
        stakeholder.id,
        `"${stakeholder.name}"`,
        stakeholder.email || '',
        stakeholder.phone || '',
        stakeholder.role,
        `"${stakeholder.company || ''}"`,
        `"${stakeholder.department || ''}"`,
        stakeholder.project_id,
        `"${stakeholder.notes || ''}"`,
        new Date(stakeholder.created_at).toLocaleString('zh-CN')
      ].join(',')
    }).join('\n')
    
    return csvHeader + csvRows
  }

  const exportTimelineJSON = async () => {
    // 这里应该调用 TimelineService，但为了简化，我们使用模拟数据
    const timelineData = {
      export_date: new Date().toISOString(),
      project_filter: selectedProject,
      date_range: dateRange,
      events: [
        // 这里应该是实际的时间线数据
        {
          id: '1',
          type: 'project_created',
          title: '项目创建',
          description: '项目已创建',
          timestamp: new Date().toISOString(),
          project_id: selectedProject === 'all' ? null : selectedProject
        }
      ]
    }
    
    return JSON.stringify(timelineData, null, 2)
  }

  const generateReport = async (option: ExportOption) => {
    // 模拟报告生成
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const reportContent = `
      ${option.name}
      生成时间: ${new Date().toLocaleString('zh-CN')}
      项目范围: ${selectedProject === 'all' ? '所有项目' : '指定项目'}
      时间范围: ${dateRange.start} 至 ${dateRange.end}
      
      这是一个模拟的${option.name}内容。
      在实际应用中，这里会包含详细的数据分析和图表。
    `
    
    downloadFile(reportContent, `${option.name}_${new Date().toISOString().split('T')[0]}.txt`, 'txt')
  }

  const downloadFile = (content: string, filename: string, format: string) => {
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 
            format === 'csv' ? 'text/csv' : 'text/plain' 
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'project': return <FileText className="w-5 h-5" />
      case 'task': return <CheckCircle className="w-5 h-5" />
      case 'report': return <BarChart3 className="w-5 h-5" />
      case 'stakeholder': return <Users className="w-5 h-5" />
      default: return <Download className="w-5 h-5" />
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'project': return '项目数据'
      case 'task': return '任务数据'
      case 'report': return '分析报告'
      case 'stakeholder': return '干系人数据'
      default: return '其他'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'project': return 'text-blue-600'
      case 'task': return 'text-green-600'
      case 'report': return 'text-purple-600'
      case 'stakeholder': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const groupedOptions = exportOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = []
    }
    acc[option.category].push(option)
    return acc
  }, {} as Record<string, ExportOption[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'min-h-screen bg-gray-50',
      isMobile ? 'p-4' : 'p-6'
    )}>
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className={cn(
          'flex justify-between items-center mb-8',
          isMobile && 'flex-col space-y-4 items-start'
        )}>
          <h1 className={cn(
            'font-bold text-gray-900',
            isMobile ? 'text-2xl' : 'text-3xl'
          )}>数据导出</h1>
          <button
            onClick={loadExportHistory}
            className={cn(
              'bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
              isMobile && 'w-full justify-center'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            刷新历史
          </button>
        </div>

        {/* 筛选选项 */}
        <div className={cn(
          'bg-white rounded-lg shadow mb-8',
          isMobile ? 'p-4' : 'p-6'
        )}>
          <h2 className={cn(
            'font-semibold text-gray-900 mb-4',
            isMobile ? 'text-base' : 'text-lg'
          )}>导出设置</h2>
          <ResponsiveGrid
            cols={{
              mobile: 1,
              tablet: 2,
              desktop: 3
            }}
            gap={{
              mobile: 3,
              tablet: 4,
              desktop: 4
            }}
          >
            <div>
              <label className={cn(
                'block font-medium text-gray-700 mb-2',
                isMobile ? 'text-sm' : 'text-sm'
              )}>
                项目范围
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">所有项目</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={cn(
                'block font-medium text-gray-700 mb-2',
                isMobile ? 'text-sm' : 'text-sm'
              )}>
                开始日期
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className={cn(
                'block font-medium text-gray-700 mb-2',
                isMobile ? 'text-sm' : 'text-sm'
              )}>
                结束日期
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </ResponsiveGrid>
        </div>

        {/* 导出选项 */}
        <div className={cn(
          'space-y-6',
          !isMobile && 'space-y-8'
        )}>
          {Object.entries(groupedOptions).map(([category, options]) => (
            <div key={category}>
              <div className={cn(
                'flex items-center gap-3 mb-4',
                isMobile && 'mb-3'
              )}>
                <div className={getCategoryColor(category)}>
                  {getCategoryIcon(category)}
                </div>
                <h2 className={cn(
                  'font-semibold text-gray-900',
                  isMobile ? 'text-lg' : 'text-xl'
                )}>
                  {getCategoryName(category)}
                </h2>
              </div>
              
              <ResponsiveGrid
                cols={{
                  mobile: 1,
                  tablet: 2,
                  desktop: 3
                }}
                gap={{
                  mobile: 4,
                  tablet: 5,
                  desktop: 6
                }}
              >
                {options.map((option) => (
                  <div key={option.id} className={cn(
                    'bg-white rounded-lg shadow hover:shadow-md transition-shadow',
                    isMobile ? 'p-4' : 'p-6'
                  )}>
                    <div className={cn(
                      'flex items-start justify-between mb-4',
                      isMobile && 'mb-3'
                    )}>
                      <div className={`p-3 rounded-lg bg-gray-50 ${getCategoryColor(option.category)}`}>
                        {option.icon}
                      </div>
                      <span className={cn(
                        'font-medium text-gray-500 uppercase tracking-wider',
                        isMobile ? 'text-xs' : 'text-xs'
                      )}>
                        {option.format}
                      </span>
                    </div>
                    
                    <h3 className={cn(
                      'font-semibold text-gray-900 mb-2',
                      isMobile ? 'text-base' : 'text-lg'
                    )}>
                      {option.name}
                    </h3>
                    
                    <p className={cn(
                      'text-gray-600 mb-4',
                      isMobile ? 'text-sm' : 'text-sm'
                    )}>
                      {option.description}
                    </p>
                    
                    <button
                      onClick={() => handleExport(option)}
                      disabled={exporting === option.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      {exporting === option.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          导出中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          导出
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </ResponsiveGrid>
            </div>
          ))}
        </div>

        {/* 导出历史 */}
        {exportHistory.length > 0 && (
          <div className={cn(
            isMobile ? 'mt-8' : 'mt-12'
          )}>
            <h2 className={cn(
              'font-semibold text-gray-900 mb-4',
              isMobile ? 'text-lg' : 'text-xl'
            )}>最近导出</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={cn(
                        'text-left font-medium text-gray-500 uppercase tracking-wider',
                        isMobile ? 'px-4 py-3 text-xs' : 'px-6 py-3 text-xs'
                      )}>
                        导出内容
                      </th>
                      <th className={cn(
                        'text-left font-medium text-gray-500 uppercase tracking-wider',
                        isMobile ? 'px-4 py-3 text-xs' : 'px-6 py-3 text-xs'
                      )}>
                        导出时间
                      </th>
                      <th className={cn(
                        'text-left font-medium text-gray-500 uppercase tracking-wider',
                        isMobile ? 'px-4 py-3 text-xs' : 'px-6 py-3 text-xs'
                      )}>
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exportHistory.map((record) => (
                      <tr key={record.id}>
                        <td className={cn(
                          'whitespace-nowrap font-medium text-gray-900',
                          isMobile ? 'px-4 py-3 text-sm' : 'px-6 py-4 text-sm'
                        )}>
                          <span className={cn(
                            isMobile && 'truncate block max-w-32'
                          )}>
                            {record.name}
                          </span>
                        </td>
                        <td className={cn(
                          'whitespace-nowrap text-gray-500',
                          isMobile ? 'px-4 py-3 text-xs' : 'px-6 py-4 text-sm'
                        )}>
                          {new Date(record.timestamp).toLocaleString('zh-CN')}
                        </td>
                        <td className={cn(
                          'whitespace-nowrap',
                          isMobile ? 'px-4 py-3' : 'px-6 py-4'
                        )}>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status === 'success' ? '成功' : '失败'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DataExport