import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BarChart3, Calendar, Clock } from 'lucide-react'
import { ProjectService, Project as ServiceProject } from '../services/projectService'
import { useResponsive } from '../hooks/useResponsive'
import { cn } from '../utils/cn'

const ProjectOverview: React.FC = () => {
  const [projects, setProjects] = useState<ServiceProject[]>([])
  const [loading, setLoading] = useState(true)
  const { isMobile } = useResponsive()

  useEffect(() => {
    console.log('ProjectOverview: useEffect 触发，开始加载数据')
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('ProjectOverview: 开始加载项目数据...');
      const projectsData = await ProjectService.getProjects()
      console.log('ProjectOverview: 获取到项目数据:', projectsData);
      console.log('ProjectOverview: projectsData.data:', projectsData?.data);
      console.log('ProjectOverview: projectsData.data长度:', projectsData?.data?.length);
      console.log('ProjectOverview: projectsData.data类型:', typeof projectsData?.data);
      console.log('ProjectOverview: projectsData.data是否为数组:', Array.isArray(projectsData?.data));
      
      if (projectsData?.data && Array.isArray(projectsData.data)) {
        setProjects(projectsData.data);
        console.log('ProjectOverview: 成功设置projects，数量:', projectsData.data.length);
      } else {
        console.warn('ProjectOverview: 项目数据格式不正确:', projectsData);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('确定要删除这个项目吗？此操作不可撤销。')) {
      return
    }

    try {
      await ProjectService.deleteProject(projectId)
      // 重新加载项目列表
      await loadData()
    } catch (error) {
      console.error('删除项目失败:', error)
      alert('删除项目失败，请稍后重试')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="w-full px-4 py-0">
        {/* 页面标题 */}
        <div className={cn(
          'flex justify-between items-center mb-8',
          isMobile && 'flex-col space-y-3 items-start'
        )}>
          <h1 className={cn(
            'font-bold text-gray-900',
            isMobile ? 'text-xl' : 'text-3xl'
          )}>项目概览</h1>
          <Link to="/projects/new" className={cn('btn btn-sm', isMobile ? 'w-full justify-center' : '')}>新建项目</Link>
        </div>

        {/* 项目列表 */}
        <div className="border">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">项目列表</h2>
          </div>
          
          {(!projects || projects.length === 0) ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无项目</h3>
              <p className="text-gray-500">开始创建您的第一个项目吧</p>
              <div className="mt-4 text-sm text-gray-400">
                调试信息: projects数组长度 = {projects ? projects.length : 'undefined'}, projects类型 = {typeof projects}
                <br />
                projects内容: {projects ? JSON.stringify(projects.slice(0, 2)) : 'null'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {projects && projects.map((project) => {
                console.log('ProjectOverview: 渲染项目:', project)
                return (
                <div key={project.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          to={`/projects/${project.id}`}
                          className="text-lg font-semibold text-gray-900"
                        >
                          {project.name}
                        </Link>

                      </div>
                      
                      {project.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div>更新: {new Date(project.updated_at).toLocaleDateString('zh-CN')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Link to={`/projects/${project.id}`} className="btn btn-xs">
                        查看详情
                      </Link>
                      <button onClick={() => handleDeleteProject(project.id)} className="btn btn-xs">
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectOverview
