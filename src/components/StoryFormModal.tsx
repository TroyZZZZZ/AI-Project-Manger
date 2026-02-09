import React, { useState, useEffect } from 'react'
import { Stakeholder, SubProject } from '../types'
import { ProjectStory } from '../services/storyService'
import { StakeholderService } from '../services/stakeholderService'
 

interface StoryFormModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  subproject: SubProject
  stakeholders: Stakeholder[]
  projectId: string
  story?: ProjectStory // 编辑模式时传入
  onSubmit: (data: {
    story_name: string
    time: string
    stakeholders: string[]
    content: string
  }) => Promise<void>
  onCancel: () => void
}

export const StoryFormModal: React.FC<StoryFormModalProps> = ({
  isOpen,
  mode,
  subproject,
  stakeholders,
  projectId,
  story,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    story_name: '',
    time: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    stakeholders: [] as string[],
    content: '',
  })
  const [selectedStakeholders, setSelectedStakeholders] = useState<Stakeholder[]>([])
  const [showGlobalSelector, setShowGlobalSelector] = useState(false)
  const [allStakeholders, setAllStakeholders] = useState<Stakeholder[]>([])
  const [globalSearch, setGlobalSearch] = useState('')
  const [loadingGlobal, setLoadingGlobal] = useState(false)

  // 编辑模式时初始化表单数据
  useEffect(() => {
    if (mode === 'edit' && story) {
      setFormData({
        story_name: story.story_name || '',
        time: story.time.slice(0, 10),
        stakeholders: story.stakeholders ? story.stakeholders.split(',') : [],
        content: story.content,
      })
      
      // 设置已选择的干系人
      if (story.stakeholders && Array.isArray(stakeholders)) {
        const stakeholderIds = story.stakeholders.split(',')
        const selected = stakeholders.filter(s => stakeholderIds.includes(s.id))
        setSelectedStakeholders(selected)
      }
    } else {
      // 新建模式重置表单
      setFormData({
        story_name: '',
        time: new Date().toISOString().slice(0, 10),
        stakeholders: [],
        content: '',
      })
      setSelectedStakeholders([])
    }
  }, [mode, story, stakeholders])

  

  // 处理干系人选择
  const handleStakeholderSelect = (stakeholder: Stakeholder) => {
    const isSelected = selectedStakeholders.some(s => s.id === stakeholder.id)
    if (isSelected) {
      setSelectedStakeholders(selectedStakeholders.filter(s => s.id !== stakeholder.id))
      setFormData({
        ...formData,
        stakeholders: formData.stakeholders.filter(id => id !== stakeholder.id)
      })
    } else {
      setSelectedStakeholders([...selectedStakeholders, stakeholder])
      setFormData({
        ...formData,
        stakeholders: [...formData.stakeholders, stakeholder.id]
      })
    }
  }

  // 移除已选择的干系人
  const removeStakeholder = (stakeholderId: string) => {
    setSelectedStakeholders(selectedStakeholders.filter(s => s.id !== stakeholderId))
    setFormData({
      ...formData,
      stakeholders: formData.stakeholders.filter(id => id !== stakeholderId)
    })
  }

  // 打开全局干系人选择弹窗并加载数据
  const openGlobalSelector = async () => {
    setShowGlobalSelector(true)
    if (allStakeholders.length === 0) {
      setLoadingGlobal(true)
      try {
        // 获取所有干系人，排除离职
        const data = await StakeholderService.getAllStakeholdersAll(500, true)
        setAllStakeholders(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('加载全局干系人失败:', error)
        alert('加载平台干系人失败，请稍后重试')
      } finally {
        setLoadingGlobal(false)
      }
    }
  }

  const closeGlobalSelector = () => {
    setShowGlobalSelector(false)
    setGlobalSearch('')
  }

  const toggleGlobalStakeholder = (stakeholder: Stakeholder, checked: boolean) => {
    const isSelected = selectedStakeholders.some(s => s.id === stakeholder.id)
    if (checked && !isSelected) {
      setSelectedStakeholders([...selectedStakeholders, stakeholder])
      setFormData({
        ...formData,
        stakeholders: Array.from(new Set([...formData.stakeholders, stakeholder.id]))
      })
    }
    if (!checked && isSelected) {
      setSelectedStakeholders(selectedStakeholders.filter(s => s.id !== stakeholder.id))
      setFormData({
        ...formData,
        stakeholders: Array.from(new Set(formData.stakeholders.filter(id => id !== stakeholder.id)))
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.story_name.trim()) {
      alert('请填写故事名')
      return
    }
    if (!formData.content.trim()) {
      alert('请填写故事内容')
      return
    }
    await onSubmit({
      ...formData,
      stakeholders: Array.from(new Set(formData.stakeholders))
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            {mode === 'create' ? '登记项目故事' : '编辑项目故事'} - {subproject.name}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                故事名 *
              </label>
              <input
                type="text"
                value={formData.story_name}
                onChange={(e) => setFormData({ ...formData, story_name: e.target.value })}
                placeholder="请输入故事名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                时间
              </label>
              <input
                type="date"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目干系人
              </label>
              <div className="mb-2">
                <button
                  type="button"
                  onClick={openGlobalSelector}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  选择干系人
                </button>
                <span className="ml-2 text-xs text-gray-500">（从平台内所有干系人中选择）</span>
              </div>
              <div className="space-y-2">
                {/* 已选择的干系人标签 */}
                {selectedStakeholders.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
                    {selectedStakeholders.map(stakeholder => (
                      <span
                        key={stakeholder.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{stakeholder.name}</span>
                          <span className="text-xs text-blue-600">
                            {stakeholder.role}
                            {stakeholder.company && ` - ${stakeholder.company}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStakeholder(stakeholder.id)}
                          className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* 本地模糊搜索已移除，统一使用平台干系人选择弹窗 */}
                <div className="mt-2 text-xs text-gray-500">
                  如需新增干系人，请前往
                  <a href="/stakeholders" className="text-blue-600 hover:underline">团队管理</a>
                  页面创建。
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                故事内容 *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请详细描述项目故事内容..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {mode === 'create' ? '登记故事' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 全局干系人选择弹窗 */}
      {showGlobalSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-semibold">选择平台内的干系人</h4>
              <button
                type="button"
                onClick={closeGlobalSelector}
                className="text-gray-500 hover:text-gray-700"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="mb-3">
              <input
                type="text"
                placeholder="搜索干系人（姓名/角色/公司）"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            {loadingGlobal ? (
              <div className="py-8 text-center text-gray-500">正在加载...</div>
            ) : (
              <div className="border border-gray-200 rounded-md divide-y max-h-[55vh] overflow-y-auto">
                {(allStakeholders || [])
                  .filter(s =>
                    s.name?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                    s.role?.toLowerCase().includes(globalSearch.toLowerCase()) ||
                    (s.company || '').toLowerCase().includes(globalSearch.toLowerCase())
                  )
                  .map(s => (
                    <label key={s.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.role}{s.company && ` · ${s.company}`}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedStakeholders.some(sel => sel.id === s.id)}
                        onChange={(e) => toggleGlobalStakeholder(s, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeGlobalSelector}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={closeGlobalSelector}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default StoryFormModal