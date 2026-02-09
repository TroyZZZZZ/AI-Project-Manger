import React, { useState, useEffect } from 'react'
import { X, User, Plus } from 'lucide-react'
import { Stakeholder } from '../types'
import { StakeholderService } from '../services/stakeholderService'

interface AddStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  onAddStakeholder: (stakeholderId: string) => void
  projectId: string
  existingStakeholderIds: string[]
}

export const AddStakeholderModal: React.FC<AddStakeholderModalProps> = ({
  isOpen,
  onClose,
  onAddStakeholder,
  projectId,
  existingStakeholderIds
}) => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newStakeholder, setNewStakeholder] = useState({
    name: '',
    role: '',
    company: ''
  })

  const normalizeName = (value: string) => value.replace(/[\s\u00A0\u3000]/g, '')

  useEffect(() => {
    if (isOpen) {
      loadStakeholders()
    }
  }, [isOpen, projectId])

  const loadStakeholders = async () => {
    try {
      setLoading(true)
      // 过滤掉已离职的干系人
      const data = await StakeholderService.getStakeholders(projectId, { excludeResigned: true })
      setStakeholders(data)
    } catch (error) {
      console.error('加载干系人失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStakeholder = async () => {
    if (!newStakeholder.name.trim()) return

    try {
      const allStakeholders = await StakeholderService.getAllStakeholdersAll(1000)
      const exists = allStakeholders.some(
        s => normalizeName(s.name) === normalizeName(newStakeholder.name)
      )
      if (exists) {
        alert('系统已存在相同姓名的干系人（全局唯一）')
        return
      }
    } catch (error) {
      console.error('重名校验失败:', error)
    }

    try {
      const stakeholderData = {
        project_id: projectId,
        name: newStakeholder.name.trim(),
        role: newStakeholder.role.trim() || null,
        company: newStakeholder.company.trim() || null,
        identity_type: 'supplier'
      }

      const createdStakeholder = await StakeholderService.createStakeholder(projectId, stakeholderData)
      
      // 刷新干系人列表
      await loadStakeholders()
      
      // 自动添加新创建的干系人到故事
      onAddStakeholder(createdStakeholder.id)
      
      // 重置表单
      setNewStakeholder({ name: '', role: '', company: '' })
      setShowCreateForm(false)
      onClose()
    } catch (error) {
      console.error('创建干系人失败:', error)
    }
  }

  const availableStakeholders = stakeholders.filter(
    stakeholder => !existingStakeholderIds.includes(stakeholder.id)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">添加干系人</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-4">加载中...</div>
          ) : (
            <>
              {/* 现有干系人列表 */}
              {availableStakeholders.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">选择现有干系人</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableStakeholders.map(stakeholder => (
                      <div
                        key={stakeholder.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium">{stakeholder.name}</div>
                          <div className="text-sm text-gray-500">
                            {stakeholder.role}
                            {stakeholder.company && ` - ${stakeholder.company}`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onAddStakeholder(stakeholder.id)
                            onClose()
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          添加
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 创建新干系人 */}
              <div className="border-t pt-4">
                {!showCreateForm ? (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    创建新干系人
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">创建新干系人</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        姓名 *
                      </label>
                      <input
                        type="text"
                        value={newStakeholder.name}
                        onChange={(e) => setNewStakeholder(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入姓名"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        角色
                      </label>
                      <input
                        type="text"
                        value={newStakeholder.role}
                        onChange={(e) => setNewStakeholder(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入角色"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        公司
                      </label>
                      <input
                        type="text"
                        value={newStakeholder.company}
                        onChange={(e) => setNewStakeholder(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入公司"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={handleCreateStakeholder}
                        disabled={!newStakeholder.name.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        创建并添加
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateForm(false)
                          setNewStakeholder({ name: '', role: '', company: '' })
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
