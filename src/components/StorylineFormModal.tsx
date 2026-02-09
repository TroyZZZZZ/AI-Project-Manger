import React, { useState, useEffect } from 'react'
import { X, FileText, Calendar } from 'lucide-react'
import { Storyline, Stakeholder } from '../types'
import { StakeholderService } from '../services/stakeholderService'

interface StorylineFormModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  storyline?: Storyline
  stakeholders: Stakeholder[]
  projectId: string
  onSubmit: (storylineData: Partial<Storyline>) => void
  onCancel: () => void
}

const StorylineFormModal: React.FC<StorylineFormModalProps> = ({
  isOpen,
  mode,
  storyline,
  stakeholders,
  projectId,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    title: storyline?.title || '',
    content: storyline?.content || '',
    event_time: storyline?.event_time ? storyline.event_time.split('T')[0] : new Date().toISOString().split('T')[0],
    stakeholder_ids: Array.isArray(storyline?.stakeholder_ids)
      ? (storyline!.stakeholder_ids as (string | number)[]).map(id => String(id))
      : []
  })

  // 本项目干系人（用于显示与选择），以 props 为初始值并在导入后本地追加
  const [projectStakeholders, setProjectStakeholders] = useState<Stakeholder[]>(stakeholders || [])
  useEffect(() => {
    setProjectStakeholders(stakeholders || [])
  }, [stakeholders])

  // 全局干系人选择弹窗状态
  const [showGlobalSelector, setShowGlobalSelector] = useState(false)
  const [allStakeholders, setAllStakeholders] = useState<Stakeholder[]>([])
  const [globalSearch, setGlobalSearch] = useState('')
  const [loadingGlobal, setLoadingGlobal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写标题和内容')
      return
    }

    // 提交前确保所有选中干系人属于当前项目（必要时自动导入并替换ID）
    try {
      const selectedIds = [...formData.stakeholder_ids]
      const existingIdSet = new Set(projectStakeholders.map(s => String(s.id)))
      const missingIds = selectedIds.filter(id => !existingIdSet.has(id))

      if (missingIds.length > 0) {
        // 如果未加载全局列表，尝试加载一次用于匹配信息
        if ((allStakeholders || []).length === 0) {
          try {
            setLoadingGlobal(true)
            // 获取全量干系人用于数据匹配，包含离职（因为可能是之前选中的），但展示时前端可自行过滤
            // 修正：根据需求“离职后的干系人不可在展示在新项目、新故事和新跟进的干系人选择列表中”
            // 但此处是“提交前导入”，如果用户已经选了（比如编辑模式下），应该允许？
            // 不，用户说“仍能选到夏怡雯”，说明是在选择列表中出现了。
            // 这里是 backend load，用于 fix missing IDs。
            // 真正的选择列表在 openGlobalSelector
            const data = await StakeholderService.getAllStakeholdersAll(500, true) 
            setAllStakeholders(Array.isArray(data) ? data : [])
          } catch (err) {
            console.error('加载平台干系人失败:', err)
          } finally {
            setLoadingGlobal(false)
          }
        }

        const toCreate = (allStakeholders || []).filter(s => missingIds.includes(String(s.id)))
        const created: Stakeholder[] = []
        for (const s of toCreate) {
          const createdS = await StakeholderService.createStakeholder(projectId, {
            name: s.name,
            role: s.role ?? null,
            company: s.company ?? null,
            identity_type: s.identity_type ?? null
          })
          created.push(createdS)
        }
        const idMap: Record<string, string> = {}
        for (let i = 0; i < toCreate.length; i++) {
          idMap[String(toCreate[i].id)] = String(created[i].id)
        }
        // 更新本地所选ID和项目干系人列表
        const replacedIds = selectedIds.map(id => idMap[id] || id)
        setFormData(prev => ({ ...prev, stakeholder_ids: replacedIds }))
        setProjectStakeholders(prev => [...prev, ...created])
      }
    } catch (err) {
      console.error('提交前导入干系人失败:', err)
      alert('提交前导入干系人失败，请稍后重试')
      return
    }

    const storylineData: Partial<Storyline> = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      event_time: formData.event_time,
      stakeholder_ids: formData.stakeholder_ids
    }

    onSubmit(storylineData)
  }

  const handleStakeholderChange = (stakeholderId: string | number, checked: boolean) => {
    const id = String(stakeholderId)
    if (checked) {
      setFormData(prev => ({
        ...prev,
        stakeholder_ids: [...prev.stakeholder_ids, id]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        stakeholder_ids: prev.stakeholder_ids.filter(existingId => existingId !== id)
      }))
    }
  }

  // 打开全局选择弹窗并加载平台干系人
  const openGlobalSelector = async () => {
    setShowGlobalSelector(true)
    if (allStakeholders.length === 0) {
      setLoadingGlobal(true)
      try {
        // 获取所有干系人，排除离职
        const data = await StakeholderService.getAllStakeholdersAll(500, true)
        setAllStakeholders(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('加载平台干系人失败:', error)
        alert('加载平台干系人失败，请稍后再试')
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
    handleStakeholderChange(stakeholder.id, checked)
  }

  // 确认全局选择：自动将不属于本项目的干系人导入当前项目，并用新ID替换
  const confirmGlobalSelection = async () => {
    try {
      const selectedIds = [...formData.stakeholder_ids]
      const existingIdSet = new Set(projectStakeholders.map(s => String(s.id)))
      const missingIds = selectedIds.filter(id => !existingIdSet.has(id))

      if (missingIds.length > 0) {
        const toCreate = (allStakeholders || []).filter(s => missingIds.includes(String(s.id)))
        const created: Stakeholder[] = []
        // 逐个创建以避免批量结构不一致问题
        for (const s of toCreate) {
          const createdS = await StakeholderService.createStakeholder(projectId, {
            name: s.name,
            role: s.role ?? null,
            company: s.company ?? null,
            identity_type: s.identity_type ?? null
          })
          created.push(createdS)
        }

        // oldId -> newId 映射（按同序对应）
        const idMap: Record<string, string> = {}
        for (let i = 0; i < toCreate.length; i++) {
          const oldId = String(toCreate[i].id)
          const newId = String(created[i].id)
          idMap[oldId] = newId
        }

        // 用新ID替换所选ID，并把导入的干系人追加到本地列表用于展示
        setFormData(prev => ({
          ...prev,
          stakeholder_ids: prev.stakeholder_ids.map(id => idMap[id] || id)
        }))
        setProjectStakeholders(prev => [...prev, ...created])
      }
    } catch (err) {
      console.error('导入干系人失败:', err)
      alert('部分选中的干系人不在当前项目，自动导入失败，请稍后再试')
    } finally {
      closeGlobalSelector()
    }
  }

  if (!isOpen) return null

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? '新增项目集故事' : '编辑项目集故事'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} className="inline mr-1" />
              故事标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入故事标题"
              required
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              故事内容 *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请详细描述项目集故事内容"
              required
            />
          </div>

          {/* 事件时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              事件时间 *
            </label>
            <input
              type="date"
              value={formData.event_time}
              onChange={(e) => setFormData(prev => ({ ...prev, event_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 相关干系人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              相关干系人
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
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
              {projectStakeholders.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无干系人数据</p>
              ) : (
                <div className="space-y-2">
                  {projectStakeholders.map(stakeholder => (
                    <label key={stakeholder.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.stakeholder_ids.includes(String(stakeholder.id))}
                        onChange={(e) => handleStakeholderChange(stakeholder.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {stakeholder.name} ({stakeholder.role})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 已选择的干系人展示 */}
            {formData.stakeholder_ids.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">已选择：</div>
                <div className="flex flex-wrap gap-2">
                  {formData.stakeholder_ids.map(id => {
                    const s = projectStakeholders.find(ps => String(ps.id) === id) || allStakeholders.find(gs => String(gs.id) === id)
                    const label = s ? `${s.name}${s.role ? `(${s.role})` : ''}` : `ID:${id}`
                    return (
                      <span key={id} className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                        {label}
                        <button type="button" onClick={() => handleStakeholderChange(id, false)} className="ml-1 text-blue-600">×</button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {mode === 'create' ? '创建' : '更新'}
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
                      checked={formData.stakeholder_ids.includes(String(s.id))}
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
              onClick={confirmGlobalSelection}
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

export default StorylineFormModal
