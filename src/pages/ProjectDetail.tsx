import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ProjectService, Project as ServiceProject } from '../services/projectService'
import { SubprojectManager } from '../components/SubprojectManager'
import { SubprojectService } from '../services/subprojectService'
import { getStoriesBySubproject } from '../services/storyService'
import { StorylineService } from '../services/storylineService'

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<ServiceProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [latestStory, setLatestStory] = useState<{ title: string; content: string; time: string } | null>(null)
  const [latestFollowUp, setLatestFollowUp] = useState<{ title: string; content: string; date?: string } | null>(null)

  useEffect(() => {
    if (id) {
      console.log('ProjectDetail - 项目ID:', id)
      loadProjectData(id)
    }
  }, [id])

  const loadProjectData = async (projectId: string) => {
    try {
      setLoading(true)
      
      const projectData = await ProjectService.getProjectById(projectId)
      
      setProject(projectData)

      try {
        const subs = await SubprojectService.getSubprojects(projectId)
        let best: any = null
        for (const sp of subs) {
          const stories = await getStoriesBySubproject(sp.id)
          for (const s of stories) {
            const t = new Date(s.time || s.created_at).getTime()
            if (!best || t > new Date(best.time).getTime()) {
              best = { title: s.story_name || '项目故事', content: s.content, time: s.time || s.created_at }
            }
          }
        }
        if (best) setLatestStory(best)
      } catch {}

      try {
        const all = await StorylineService.getAllNextFollowUps()
        const mine = (Array.isArray(all) ? all : []).filter((x: any) => String(x.project_id) === String(projectId))
        let best: any = null
        for (const x of mine) {
          const ts = new Date(x.last_record_created_at || x.next_follow_up || x.created_at).getTime()
          if (!best || ts > new Date(best.date || 0).getTime()) {
            best = { title: x.title, content: x.last_record_content || '', date: x.last_record_created_at || x.next_follow_up }
          }
        }
        if (best) setLatestFollowUp(best)
      } catch {}
    } catch (error) {
      console.error('Error loading project data:', error)
    } finally {
      setLoading(false)
    }
  }

  console.log('ProjectDetail 渲染状态:', { loading, project, id })

  if (loading) {
    console.log('ProjectDetail: 显示加载状态')
    return (
      <div className="min-h-screen bg-white w-full">
        <div className="w-full px-4 py-0">
          <div className="text-sm text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  if (!project) {
    console.log('ProjectDetail: 项目未找到')
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg text-red-600">项目未找到</div>
    </div>
  }

  console.log('ProjectDetail: 正常渲染')

  return (
    <div className="min-h-screen bg-white w-full">
      <div className="w-full px-4 py-0">
        {/* 页面头部 */}
        <div className="flex items-center gap-4">
          <Link to="/" className="btn btn-xs">返回</Link>
          <h1 className="text-3xl font-bold text-gray-900">{project?.name || '项目详情'}</h1>
        </div>

        

        

        {/* 子项目管理 */}
        <div className="border mt-4">
          <div className="p-4">
            {id && <SubprojectManager projectId={id} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetail
