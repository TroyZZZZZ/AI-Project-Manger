import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SubprojectService } from '../services/subprojectService'
import { StoryDetailPage } from '../components/StoryDetailPage'
import { SubProject } from '../types'

const SubprojectStoriesPage: React.FC = () => {
  const { projectId, subprojectId } = useParams<{ projectId: string; subprojectId: string }>()
  const [subproject, setSubproject] = useState<SubProject | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        if (projectId && subprojectId) {
          const sp = await SubprojectService.getSubprojectById(projectId, subprojectId)
          setSubproject(sp)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, subprojectId])

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>
  if (!subproject) return <div className="min-h-screen flex items-center justify-center text-red-600">子项目未找到</div>

  return (
    <StoryDetailPage
      subproject={subproject}
      onBack={() => {
        history.back()
      }}
    />
  )
}

export default SubprojectStoriesPage