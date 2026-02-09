import React, { useState, useEffect } from 'react'
import { Storyline, Stakeholder } from '../types'
import { StorylineService } from '../services/storylineService'
import { StakeholderService } from '../services/stakeholderService'

interface StorylineManagerProps {
  projectId: string
}

export const StorylineManager: React.FC<StorylineManagerProps> = ({ projectId }) => {
  const [storylines, setStorylines] = useState<Storyline[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedStoryline, setSelectedStoryline] = useState<Storyline | null>(null)
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<Storyline[]>([])
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [followUpTarget, setFollowUpTarget] = useState<Storyline | null>(null)
  const [nextFollowUpInput, setNextFollowUpInput] = useState<Record<string, string>>({})
  const [storylineFollowUps, setStorylineFollowUps] = useState<Record<string, any[]>>({})

  useEffect(() => {
    loadStorylines()
    loadStakeholders()
    loadUpcomingFollowUps()
  }, [projectId])

  const loadStorylines = async () => {
    try {
      const data = await StorylineService.getStorylines(projectId)
      // 后端返回的是包含storylines数组的对象，需要提取storylines字段
      setStorylines(data || [])
      try {
        const map: Record<string, any[]> = {}
        await Promise.all((data || []).map(async (sl: any) => {
          try {
            const resp = await StorylineService.getFollowUpRecords(projectId, sl.id, 3, 0)
            const rows = Array.isArray(resp?.data) ? resp.data : []
            const filtered = rows.filter((r: any) => {
              const sid = String(sl.id)
              const rid = r && (String(r.storyline_id ?? r.storylineId ?? ''))
              return !rid || rid === sid
            })
            map[String(sl.id)] = filtered
          } catch {
            map[String(sl.id)] = []
          }
        }))
        setStorylineFollowUps(map)
      } catch {}
    } catch (error) {
      console.error('加载故事线失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStakeholders = async () => {
    try {
      const data = await StakeholderService.getStakeholders(projectId, { excludeResigned: true })
      setStakeholders(data)
    } catch (error) {
      console.error('加载干系人失败:', error)
    }
  }

  const loadUpcomingFollowUps = async () => {
    try {
      const data = await StorylineService.getUpcomingFollowUps(projectId, 7)
      setUpcomingFollowUps(data)
    } catch (error) {
      console.error('加载即将到期的跟进事项失败:', error)
    }
  }

  const handleCreateStoryline = async (formData: Omit<Storyline, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await StorylineService.createStoryline(projectId, formData)
      await loadStorylines()
      await loadUpcomingFollowUps()
      setShowCreateForm(false)
    } catch (error) {
      console.error('创建故事线失败:', error)
    }
  }

  const handleDeleteStoryline = async (storylineId: string) => {
    if (!confirm('确定要删除这个故事线吗？')) return
    
    try {
      await StorylineService.deleteStoryline(projectId, storylineId)
      await loadStorylines()
      await loadUpcomingFollowUps()
    } catch (error) {
      console.error('删除故事线失败:', error)
    }
  }

  // 设置下次跟进时间
  const handleSetNextFollowUp = async (storylineId: string, next: string | undefined) => {
    if (!next) {
      alert('请先选择下次跟进时间')
      return
    }
    try {
      await StorylineService.setNextFollowUp(projectId, storylineId, next)
      await loadStorylines()
    } catch (error) {
      console.error('设置下次跟进时间失败:', error)
      alert('设置下次跟进时间失败')
    }
  }

  const getStakeholderNames = (stakeholderIds?: (string | number)[]) => {
    if (!stakeholderIds || stakeholderIds.length === 0) return '无'
    return stakeholderIds
      .map(id => stakeholders.find(s => s.id === String(id))?.name)
      .filter(Boolean)
      .join(', ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  if (loading) {
    return <div className="flex justify-center py-8">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">故事线管理</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          添加故事线
        </button>
      </div>

      {/* 故事线时间轴 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">故事线时间轴</h4>
        </div>
        <div className="p-6">
          {storylines.length > 0 ? (
            <div className="relative">
              {/* 时间轴线 */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* 故事线事件 */}
              <div className="space-y-6">
                {storylines
                  .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
                  .map((storyline, index) => (
                    <div key={storyline.id} className="relative flex items-start">
                      {/* 时间点 */}
                      <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow"></div>
                      
                      {/* 内容 */}
                      <div className="ml-12 bg-gray-50 rounded-lg p-4 w-full">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h5 className="font-medium text-gray-900">{storyline.title}</h5>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{storyline.content}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>📅 {formatDate(storyline.event_time)}</span>
                              <span>👥 {getStakeholderNames(storyline.stakeholder_ids)}</span>
                              {storyline.next_follow_up && (
                                <span>🔔 下次跟进: {formatDate(storyline.next_follow_up)}</span>
                              )}
                            </div>
                            {storyline.expected_outcome && (
                              <div className="mt-2 text-sm text-blue-600">
                                💡 预期结果: {storyline.expected_outcome}
                              </div>
                            )}
                            {storylineFollowUps[String(storyline.id)] && storylineFollowUps[String(storyline.id)].length > 0 && (
                              <div className="mt-3 border rounded bg-white p-3">
                                <div className="text-sm font-medium text-gray-700">跟进记录</div>
                                <div className="mt-2 space-y-3">
                                  {storylineFollowUps[String(storyline.id)].map((rec: any) => (
                                    <div key={rec.id} className="border rounded p-3 bg-gray-50">
                                      <div className="text-sm text-gray-900">{rec.content}</div>
                                      <div className="mt-2 text-xs text-gray-600">
                                        {rec.contact_person && <span className="mr-4">干系人: {rec.contact_person}</span>}
                                        {rec.event_date && <span className="mr-4">发生时间: {formatDate(rec.event_date)}</span>}
                                        {storyline.next_follow_up && <span>下一步: {formatDate(storyline.next_follow_up)}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => setSelectedStoryline(storyline)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteStoryline(storyline.id)}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              删除
                            </button>
                            {/* 下次跟进时间设置 */}
                            <input
                              type="datetime-local"
                              className="px-2 py-1 text-sm border rounded"
                              value={nextFollowUpInput[storyline.id] || ''}
                              onChange={(e) => setNextFollowUpInput(prev => ({ ...prev, [storyline.id]: e.target.value }))}
                              title="下次跟进时间"
                            />
                            <button
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                              onClick={() => handleSetNextFollowUp(storyline.id, nextFollowUpInput[storyline.id])}
                            >
                              保存跟进时间
                            </button>
                            {/* 登记跟进记录 */}
                            <button
                              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                              onClick={() => { setFollowUpTarget(storyline); setShowFollowUpModal(true) }}
                            >
                              登记跟进
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无故事线记录
            </div>
          )}
        </div>
      </div>

      {/* 创建故事线表单 */}
      {showCreateForm && (
        <CreateStorylineForm
          projectId={projectId}
          stakeholders={stakeholders}
          onSubmit={handleCreateStoryline}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* 编辑故事线表单 */}
      {selectedStoryline && (
        <EditStorylineForm
          projectId={projectId}
          storyline={selectedStoryline}
          stakeholders={stakeholders}
          onSubmit={async (updateData) => {
            try {
              await StorylineService.updateStoryline(projectId, selectedStoryline.id, updateData)
              await loadStorylines()
              await loadUpcomingFollowUps()
              setSelectedStoryline(null)
            } catch (error) {
              console.error('更新故事线失败:', error)
            }
          }}
          onCancel={() => setSelectedStoryline(null)}
        />
      )}

      {/* 登记跟进记录模态框 */}
      {showFollowUpModal && followUpTarget && (
        <FollowUpRecordModal
          open={showFollowUpModal}
          storyline={followUpTarget}
          projectId={projectId}
          stakeholders={stakeholders}
          onClose={() => { setShowFollowUpModal(false); setFollowUpTarget(null) }}
          onSubmit={async (record) => {
            try {
              await StorylineService.createFollowUpRecord(projectId, followUpTarget.id, record)
              await loadStorylines()
              try {
                const resp = await StorylineService.getFollowUpRecords(projectId, followUpTarget.id, 3, 0)
                const rows = Array.isArray(resp?.data) ? resp.data : []
                setStorylineFollowUps(prev => ({ ...prev, [String(followUpTarget.id)]: rows }))
              } catch {}
              setShowFollowUpModal(false)
              setFollowUpTarget(null)
            } catch (error) {
              console.error('创建跟进记录失败:', error)
              alert('创建跟进记录失败')
            }
          }}
        />
      )}
    </div>
  )
}

const CreateStorylineForm: React.FC<{
  projectId: string
  stakeholders: Stakeholder[]
  onSubmit: (data: Omit<Storyline, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}> = ({ projectId, stakeholders, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    project_id: projectId,
    title: '',
    content: '',
    event_time: new Date().toISOString().slice(0, 10),
    stakeholder_ids: [] as string[],
    next_follow_up: '',
    expected_outcome: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      stakeholder_ids: formData.stakeholder_ids.length > 0 ? formData.stakeholder_ids : undefined,
      next_follow_up: formData.next_follow_up || undefined,
      expected_outcome: formData.expected_outcome || undefined
    })
  }

  const handleStakeholderChange = (stakeholderId: string | number, checked: boolean) => {
    const id = String(stakeholderId)
    if (checked) {
      setFormData({
        ...formData,
        stakeholder_ids: [...formData.stakeholder_ids, id]
      })
    } else {
      setFormData({
        ...formData,
        stakeholder_ids: formData.stakeholder_ids.filter(existingId => existingId !== id)
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">添加故事线</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">事件时间</label>
            <input
              type="date"
              value={formData.event_time.slice(0, 10)}
              onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">相关干系人</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
              {stakeholders.map(stakeholder => (
                <label key={stakeholder.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={formData.stakeholder_ids.includes(String(stakeholder.id))}
                    onChange={(e) => handleStakeholderChange(stakeholder.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{stakeholder.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">下次跟进时间</label>
            <input
              type="datetime-local"
              value={formData.next_follow_up}
              onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预期结果</label>
            <textarea
              value={formData.expected_outcome}
              onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
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
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FollowUpRecordModal: React.FC<{
  open: boolean
  storyline: Storyline
  projectId: string
  stakeholders: Stakeholder[]
  onClose: () => void
  onSubmit: (record: {
    content: string
    follow_up_type?: string
    contact_person?: string
    contact_method?: string
    result?: string
    next_action?: string
  }) => void
}> = ({ open, storyline, projectId, stakeholders, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    content: '',
    follow_up_type: '',
    contact_person: '',
    contact_method: '',
    result: '',
    next_action: ''
  })
  const [projectStakeholders, setProjectStakeholders] = useState<Stakeholder[]>(stakeholders || [])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  useEffect(() => {
    setProjectStakeholders(stakeholders || [])
  }, [stakeholders])
  useEffect(() => {
    const load = async () => {
      try {
        const list = await StakeholderService.getAllStakeholdersAll(500, false)
        setProjectStakeholders(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error('刷新项目干系人失败:', e)
      }
    }
    if (open) load()
  }, [open, projectId])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.content.trim()) {
      alert('请填写跟进内容')
      return
    }
    const names = projectStakeholders.filter(s => selectedIds.includes(String(s.id))).map(s => s.name).filter(Boolean)
    const contactStr = names.length > 0 ? names.join(',') : (form.contact_person || undefined)
    onSubmit({
      content: form.content.trim(),
      follow_up_type: form.follow_up_type || undefined,
      contact_person: contactStr,
      contact_method: form.contact_method || undefined,
      result: form.result || undefined,
      next_action: form.next_action || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b">
          <h4 className="font-medium">登记跟进记录 - {storyline.title}</h4>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-gray-600 mb-1">跟进内容</label>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">跟进类型</label>
              <input
                className="w-full border rounded p-2"
                value={form.follow_up_type}
                onChange={(e) => setForm({ ...form, follow_up_type: e.target.value })}
                placeholder="电话/面谈/邮件等"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">选择干系人（平台内）</label>
              <div className="max-h-32 overflow-y-auto border rounded p-2">
                {projectStakeholders.map(st => (
                  <label key={st.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(String(st.id))}
                      onChange={(e) => {
                        const id = String(st.id)
                        setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id))
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{st.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">联系方式</label>
              <input
                className="w-full border rounded p-2"
                value={form.contact_method}
                onChange={(e) => setForm({ ...form, contact_method: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">结果</label>
              <input
                className="w-full border rounded p-2"
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">下一步行动</label>
            <input
              className="w-full border rounded p-2"
              value={form.next_action}
              onChange={(e) => setForm({ ...form, next_action: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button type="button" className="px-4 py-2 bg-gray-100 text-gray-700 rounded" onClick={onClose}>取消</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">提交</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const EditStorylineForm: React.FC<{
  projectId: string
  storyline: Storyline
  stakeholders: Stakeholder[]
  onSubmit: (data: Partial<Storyline>) => void
  onCancel: () => void
}> = ({ projectId, storyline, stakeholders, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: storyline.title,
    content: storyline.content,
    event_time: storyline.event_time.slice(0, 10),
    stakeholder_ids: (storyline.stakeholder_ids || []).map(String),
    next_follow_up: storyline.next_follow_up?.slice(0, 10) || '',
    expected_outcome: storyline.expected_outcome || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      stakeholder_ids: formData.stakeholder_ids.length > 0 ? formData.stakeholder_ids : undefined,
      next_follow_up: formData.next_follow_up || undefined,
      expected_outcome: formData.expected_outcome || undefined
    })
  }

  const handleStakeholderChange = (stakeholderId: string | number, checked: boolean) => {
    const id = String(stakeholderId)
    if (checked) {
      setFormData({
        ...formData,
        stakeholder_ids: [...formData.stakeholder_ids, id]
      })
    } else {
      setFormData({
        ...formData,
        stakeholder_ids: formData.stakeholder_ids.filter(existingId => existingId !== id)
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">编辑故事线</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">事件时间</label>
            <input
              type="date"
              value={formData.event_time.slice(0, 10)}
              onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">相关干系人</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
              {stakeholders.map(stakeholder => (
                <label key={stakeholder.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={formData.stakeholder_ids.includes(String(stakeholder.id))}
                    onChange={(e) => handleStakeholderChange(stakeholder.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{stakeholder.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">下次跟进时间</label>
            <input
              type="datetime-local"
              value={formData.next_follow_up}
              onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预期结果</label>
            <textarea
              value={formData.expected_outcome}
              onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
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
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
