import React, { useState, useEffect } from 'react'
import { Plus, Clock, Users } from 'lucide-react'
import { SubProject, ProjectTreeNode, Stakeholder, StakeholderRole, Storyline } from '../types'
import { getStoriesBySubproject } from '../services/storyService'
import { SubprojectService } from '../services/subprojectService'
import { StakeholderService } from '../services/stakeholderService'
import { StorylineService } from '../services/storylineService'
import { createStory } from '../services/storyService'
import { StoryDetailPage } from './StoryDetailPage'
import StoryFormModal from './StoryFormModal'
import StorylineFormModal from './StorylineFormModal'
import StakeholderPicker from './StakeholderPicker'

interface SubprojectManagerProps {
  projectId: string
  onSubprojectSelect?: (subproject: SubProject) => void
}

export const SubprojectManager: React.FC<SubprojectManagerProps> = ({
  projectId,
  onSubprojectSelect
}) => {
  const [subprojects, setSubprojects] = useState<SubProject[]>([])
  const [storylines, setStorylines] = useState<Storyline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showCreateStorylineForm, setShowCreateStorylineForm] = useState(false)
  const [selectedSubproject, setSelectedSubproject] = useState<SubProject | null>(null)
  const [showStoryForm, setShowStoryForm] = useState(false)
  const [storySubproject, setStorySubproject] = useState<SubProject | null>(null)
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [showStoryDetail, setShowStoryDetail] = useState(false)
  const [storyDetailSubproject, setStoryDetailSubproject] = useState<SubProject | null>(null)
  const [loadingStakeholders, setLoadingStakeholders] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [followUpTarget, setFollowUpTarget] = useState<Storyline | null>(null)
  const [editingStoryline, setEditingStoryline] = useState<Storyline | null>(null)
  const [globalStakeholders, setGlobalStakeholders] = useState<Stakeholder[]>([])
  const [nextFollowUpInput, setNextFollowUpInput] = useState<Record<string, string>>({})
  const [latestRecords, setLatestRecords] = useState<Record<string, { content: string; event_date?: string; created_at?: string }>>({})
  const [latestSubStories, setLatestSubStories] = useState<Record<string, { title: string; content: string; time: string }>>({})
  const latestSubStoriesMemo = React.useMemo(() => latestSubStories, [latestSubStories])
  const [latestFollowUpProject, setLatestFollowUpProject] = useState<{ title: string; content: string; date?: string } | null>(null)
  const lfpState = latestFollowUpProject
  const renderLatestStoryFor = (sid: string) => {
    try {
      const m = latestSubStoriesMemo || {}
      const item = m[sid]
      if (!item) return null
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-500 mb-1">最新项目故事</div>
          <div className="font-medium text-gray-900">{item.title}</div>
          <div className="text-gray-700 mt-1 line-clamp-3">{item.content}</div>
          <div className="text-xs text-gray-500 mt-2">时间: {new Date(item.time).toLocaleDateString()}</div>
        </div>
      )
    } catch {
      return null
    }
  }
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<SubProject | null>(null)

  useEffect(() => {
    loadSubprojects()
    loadStakeholders()
    loadStorylines()
  }, [projectId])

  const loadStorylines = async () => {
    try {
      console.log('开始加载项目集故事线，项目ID:', projectId)
      const data = await StorylineService.getStorylines(projectId)
      // 防御性解析：确保设置为数组，避免 map 抛错
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.storylines)
          ? (data as any).storylines
          : []
      setStorylines(list)
      // 初始化每条故事线的下次跟进输入框（如果已设置则填充默认值）
      const toDateInputValue = (s?: string) => {
        if (!s) return ''
        const str = String(s)
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
        const d = new Date(str)
        if (isNaN(d.getTime())) return ''
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      }
      const init: Record<string, string> = {}
      list.forEach(sl => { if (sl.next_follow_up) { init[sl.id] = toDateInputValue(sl.next_follow_up) } })
      setNextFollowUpInput(init)
      const recs: Record<string, { content: string; event_date?: string; created_at?: string }> = {}
      for (const sl of list) {
        try {
          const r = await StorylineService.getFollowUpRecords(projectId, sl.id, 1, 0)
          const item = Array.isArray((r as any)?.data) ? (r as any).data[0] : (Array.isArray((r as any)?.records) ? (r as any).records[0] : undefined)
          if (item) recs[sl.id] = { content: item.content, event_date: item.event_date, created_at: item.created_at }
        } catch {}
      }
      setLatestRecords(recs)
      let best: any = null
      Object.values(recs).forEach((it:any)=>{
        const ts = new Date(it.created_at || it.event_date || '').getTime()
        if (!best || ts > new Date(best.date || 0).getTime()) {
          best = { title: '最新跟进', content: it.content, date: it.created_at || it.event_date }
        }
      })
      setLatestFollowUpProject(best)
    } catch (error) {
      console.error('加载项目集故事线失败:', error)
      setStorylines([])
    }
  }

  const loadStakeholders = async () => {
    try {
      setLoadingStakeholders(true)
      // 获取干系人时过滤掉已离职的
      const data = await StakeholderService.getStakeholders(projectId, { excludeResigned: true })
      setStakeholders(data)
      try {
        const all = await StakeholderService.getAllStakeholdersAll(500, false)
        setGlobalStakeholders(Array.isArray(all) ? all : [])
      } catch {}
    } catch (error) {
      console.error('加载干系人失败:', error)
    } finally {
      setLoadingStakeholders(false)
    }
  }

  const loadSubprojects = async () => {
    try {
      console.log('开始加载子项目，项目ID:', projectId)
      const data = await SubprojectService.getSubprojects(projectId)
      setSubprojects(data)
      const storyMap: Record<string, { title: string; content: string; time: string }> = {}
      for (const sp of data) {
        try {
          const stories = await getStoriesBySubproject(sp.id)
          let best: any = null
          for (const s of stories) {
            const t = new Date(s.time || s.created_at).getTime()
            if (!best || t > new Date(best.time).getTime()) {
              best = { title: s.story_name || '项目故事', content: s.content, time: s.time || s.created_at }
            }
          }
          if (best) storyMap[String(sp.id)] = best
        } catch {}
      }
      setLatestSubStories(storyMap)
    } catch (error) {
      console.error(' 加载子项目失败:', error)
      setSubprojects([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (subprojectData: Partial<SubProject>) => {
    try {
      await SubprojectService.createSubproject(projectId, subprojectData)
      loadSubprojects()
      setShowCreateForm(false)
    } catch (error) {
      console.error('创建子项目失败:', error)
    }
  }

  const handleCreateStoryline = async (storylineData: Omit<Storyline, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await StorylineService.createStoryline(projectId, storylineData)
      loadStorylines()
      setShowCreateStorylineForm(false)
    } catch (error) {
      console.error('创建项目集故事线失败:', error)
    }
  }

  const handleDelete = async (subprojectId: string) => {
    if (window.confirm('确定要删除这个子项目吗？')) {
      try {
        console.log('删除子项目 - projectId:', projectId, 'subprojectId:', subprojectId)
        await SubprojectService.deleteSubproject(projectId, subprojectId)
        loadSubprojects()
      } catch (error) {
        console.error('删除子项目失败:', error)
      }
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">加载中...</div>
  }

  return (
    <>
      {showStoryDetail && storyDetailSubproject ? (
        <StoryDetailPage
          subproject={storyDetailSubproject}
          onBack={() => {
            setShowStoryDetail(false)
            setStoryDetailSubproject(null)
          }}
        />
          ) : (
            <div className="space-y-6">
          {/* 项目集故事线区域 */}
          <div id="storylines" className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">项目集故事线</h3>
              <button
                onClick={() => setShowCreateStorylineForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                新增故事线
              </button>
            </div>

            {storylines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无项目集故事线
              </div>
            ) : (
              <div className="space-y-4">
                {storylines.map((storyline) => (
                  <div key={storyline.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{storyline.title}</h4>
                      <div className="flex items-center space-x-2">
                        <button
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          onClick={() => setEditingStoryline(storyline)}
                        >
                          编辑故事线
                        </button>
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          onClick={async () => {
                            if (!window.confirm('确定要删除这个故事线吗？')) return
                            try {
                              await StorylineService.deleteStoryline(projectId, storyline.id)
                              await loadStorylines()
                            } catch (error) {
                              console.error('删除故事线失败:', error)
                              alert('删除故事线失败')
                            }
                          }}
                        >
                          删除故事线
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{storyline.content}</p>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(storyline.event_time).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {storyline.stakeholder_ids ? storyline.stakeholder_ids.length : 0} 人
                      </div>
                    </div>

                    {latestRecords[storyline.id] && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        <div className="font-medium">最新跟进</div>
                        <div className="mt-1">{latestRecords[storyline.id].content}</div>
                        {latestRecords[storyline.id].event_date && (
                          <div className="text-xs text-gray-500 mt-1">事件时间: {new Date(latestRecords[storyline.id].event_date as string).toLocaleDateString()}</div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="flex space-x-2">
                        <button
                          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          onClick={() => { setFollowUpTarget(storyline); setShowFollowUpModal(true) }}
                        >
                          登记跟进
                        </button>
                        <button
                          className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                          onClick={() => {
                            const url = `/storylines/${storyline.project_id}/${storyline.id}/follow-ups`
                            window.open(url, '_blank')
                          }}
                        >
                          查看跟进记录
                        </button>
                      </div>
                      {storyline.next_follow_up && (
                        <div className="mt-2 text-xs text-blue-600">🔔 已设置: {new Date(storyline.next_follow_up).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 子项目管理区域 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">子项目管理</h3>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建子项目
              </button>
            </div>

            {subprojects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无子项目
              </div>
            ) : (
              <div className="space-y-4">
                {subprojects.map((subproject) => (
                  <div key={subproject.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{subproject.name}</h4>
                        <p className="text-gray-600 text-sm">{subproject.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setStorySubproject(subproject)
                            setShowStoryForm(true)
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          登记故事
                        </button>
                        <button
                          onClick={() => {
                            window.location.href = `/projects/${projectId}/subprojects/${subproject.id}/stories`
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          故事线
                        </button>
                        <button
                          onClick={() => {
                            setEditTarget(subproject)
                            setShowEditModal(true)
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(subproject.id.toString())}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      {subproject.end_date && (
                        <span>结束: {new Date(subproject.end_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    {renderLatestStoryFor(String(subproject.id))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 项目故事表单 */}
          {showStoryForm && storySubproject && (
            <StoryFormModal
              isOpen={showStoryForm}
              mode="create"
              subproject={storySubproject}
              stakeholders={stakeholders}
              projectId={projectId}
              onSubmit={async (storyData) => {
                try {
                  await createStory({
                    subproject_id: storySubproject.id,
                    story_name: storyData.story_name,
                    time: storyData.time,
                    stakeholders: storyData.stakeholders.join(','),
                    content: storyData.content,
                  })
                  console.log('项目故事登记成功')
                  setShowStoryForm(false)
                  setStorySubproject(null)
                } catch (error) {
                  console.error('登记项目故事失败:', error)
                  alert('登记项目故事失败: ' + (error as Error).message)
                }
              }}
              onCancel={() => {
                setShowStoryForm(false)
                setStorySubproject(null)
              }}
            />
          )}

          {/* 项目集故事线表单 */}
          {showCreateStorylineForm && (
            <StorylineFormModal
              isOpen={showCreateStorylineForm}
              mode="create"
              stakeholders={stakeholders}
              projectId={projectId}
              onSubmit={handleCreateStoryline}
              onCancel={() => setShowCreateStorylineForm(false)}
            />
          )}

          {/* 编辑故事线表单 */}
          {editingStoryline && (
            <StorylineFormModal
              isOpen={true}
              mode="edit"
              storyline={editingStoryline}
              stakeholders={stakeholders}
              projectId={projectId}
              onSubmit={async (updateData) => {
                try {
                  await StorylineService.updateStoryline(projectId, editingStoryline.id, updateData)
                  setEditingStoryline(null)
                  await loadStorylines()
                } catch (error) {
                  console.error('更新故事线失败:', error)
                  alert('更新故事线失败')
                }
              }}
              onCancel={() => setEditingStoryline(null)}
            />
          )}

          {/* 登记跟进记录模态框 */}
          {showFollowUpModal && followUpTarget && (
            <FollowUpRecordModal
              open={showFollowUpModal}
              storyline={followUpTarget}
              stakeholders={(globalStakeholders && globalStakeholders.length > 0) ? globalStakeholders : stakeholders}
              onClose={() => { setShowFollowUpModal(false); setFollowUpTarget(null) }}
              onSubmit={async (record) => {
                try {
                  await StorylineService.createFollowUpRecord(projectId, followUpTarget.id, record)
                  setShowFollowUpModal(false)
                  setFollowUpTarget(null)
                  await loadStorylines()
                } catch (error) {
                  console.error('创建跟进记录失败:', error)
                  alert('创建跟进记录失败')
                }
              }}
            />
          )}

          {/* 创建子项目表单 */}
          {showCreateForm && (
            <CreateSubprojectForm
              parentProjectId={projectId}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
            />
          )}
          {/* 子项目编辑模态框 */}
          {showEditModal && editTarget && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">编辑子项目</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">名称</label>
                    <input
                      type="text"
                      defaultValue={editTarget.name}
                      onChange={(e)=> setEditTarget({ ...editTarget!, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">描述</label>
                    <textarea
                      defaultValue={editTarget.description || ''}
                      onChange={(e)=> setEditTarget({ ...editTarget!, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                  <button className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded" onClick={()=>{setShowEditModal(false); setEditTarget(null)}}>取消</button>
                  <button
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={async ()=>{
                      if (!editTarget) return
                      try {
                        await SubprojectService.updateSubproject(projectId, String(editTarget.id), {
                          name: editTarget.name,
                          description: editTarget.description,
                        } as any)
                        setShowEditModal(false)
                        setEditTarget(null)
                        await loadSubprojects()
                      } catch (err) {
                        alert('更新子项目失败')
                      }
                    }}
                  >保存</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// 跟进记录模态框（轻量内置版本）
const FollowUpRecordModal: React.FC<{
  open: boolean
  storyline: Storyline
  stakeholders: Stakeholder[]
  onClose: () => void
  onSubmit: (record: {
    content: string
    contact_person: string
    event_date: string
    next_follow_up_date?: string
  }) => void
}> = ({ open, storyline, stakeholders, onClose, onSubmit }) => {
  const [content, setContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [eventDate, setEventDate] = useState<string>('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('')
  const [showPicker, setShowPicker] = useState<boolean>(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b">
          <h4 className="font-medium">登记跟进记录 - {storyline.title}</h4>
        </div>
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!content.trim()) {
              alert('请填写跟进内容')
              return
            }
            if (selectedIds.length === 0) { alert('请选择干系人'); return }
            if (!eventDate) {
              alert('请选择事件发生时间')
              return
            }
            const contact_person = stakeholders.filter(s=> selectedIds.includes(String(s.id))).map(s=> s.name).join(',')
            onSubmit({
              content: content.trim(),
              contact_person,
              event_date: eventDate,
              next_follow_up_date: nextFollowUpDate || undefined
            })
          }}
        >
          <div>
            <label className="block text-sm text-gray-600 mb-1">跟进内容</label>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">干系人</label>
            <button type="button" className="px-3 py-2 border rounded w-full text-left" onClick={()=>setShowPicker(true)}>
              {selectedIds.length === 0 ? '请选择干系人' : `已选 ${selectedIds.length} 人`}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">事件发生时间（年月日）</label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">下一步跟进时间（可选，年月日）</label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" className="px-3 py-2 border rounded" onClick={onClose}>取消</button>
            <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">提交</button>
          </div>
        </form>
        <StakeholderPicker
          open={showPicker}
          title="选择平台内的干系人"
          stakeholders={stakeholders.map(s=>({id:s.id, name:s.name, role:s.role, company:(s as any).company}))}
          selectedIds={selectedIds}
          onChange={(next)=>setSelectedIds(next)}
          onClose={()=>setShowPicker(false)}
          onConfirm={()=>setShowPicker(false)}
        />
      </div>
    </div>
  )
}

//


const CreateSubprojectForm = ({ parentProjectId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      parent_id: Number(parentProjectId)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">创建子项目</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
