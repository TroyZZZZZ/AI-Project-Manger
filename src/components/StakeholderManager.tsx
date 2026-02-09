import React, { useState, useEffect } from 'react'
import { Stakeholder, StakeholderRole } from '../types'
import { StakeholderService } from '../services/stakeholderService'

interface StakeholderManagerProps {
  projectId: string
}

export const StakeholderManager: React.FC<StakeholderManagerProps> = ({ projectId }) => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadStakeholders()
    loadStats()
  }, [projectId])

  const loadStakeholders = async () => {
    try {
      const data = await StakeholderService.getStakeholders(projectId)
      setStakeholders(data)
    } catch (error) {
      console.error('加载干系人失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await StakeholderService.getStakeholderStats(projectId)
      setStats(data)
    } catch (error) {
      console.error('加载统计信息失败:', error)
    }
  }

  const normalizeName = (value: string) => value.replace(/[\s\u00A0\u3000]/g, '')

  const handleCreateStakeholder = async (formData: Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      try {
        const allStakeholders = await StakeholderService.getAllStakeholdersAll(1000)
        const duplicate = allStakeholders.some(s => normalizeName(s.name) === normalizeName(formData.name))
        if (duplicate) {
          alert('系统已存在相同姓名的干系人（全局唯一）')
          return
        }
      } catch (error) {
        console.error('重名校验失败:', error)
      }
      await StakeholderService.createStakeholder(projectId, formData)
      await loadStakeholders()
      await loadStats()
      setShowCreateForm(false)
    } catch (error) {
      console.error('创建干系人失败:', error)
    }
  }

  const handleDeleteStakeholder = async (stakeholderId: string) => {
    if (!confirm('确定要删除这个干系人吗？')) return
    
    try {
      await StakeholderService.deleteStakeholder(projectId, stakeholderId)
      await loadStakeholders()
      await loadStats()
    } catch (error) {
      console.error('删除干系人失败:', error)
    }
  }

  const getRoleText = (role: string) => {
    // 如果是旧的枚举值，转换为中文
    switch (role) {
      case 'sponsor': return '发起人'
      case 'owner': return '负责人'
      case 'manager': return '管理者'
      case 'member': return '成员'
      case 'consultant': return '顾问'
      case 'user': return '用户'
      case 'reviewer': return '审核者'
      case 'stakeholder': return '干系人'
      case 'observer': return '观察者'
      default: return role || '未知' // 直接显示角色名称
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">干系人管理</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          添加干系人
        </button>
        <button
          onClick={async ()=>{
            try {
              const targets = ['王纪虎','王俊']
              let total = 0
              for (const t of targets) {
                const res = await StakeholderService.deduplicateByName(t, projectId)
                total += Number(res.affected || 0)
              }
              await loadStakeholders()
              alert(`已完成按姓名去重，删除 ${total} 条重复记录`)
            } catch (e) {
              alert('去重失败')
            }
          }}
          className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          去重重名
        </button>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-medium text-gray-900 mb-2">总数统计</h4>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-medium text-gray-900 mb-2">按角色分布</h4>
            <div className="space-y-1 text-sm">
              {Object.entries(stats.by_role).map(([role, count]) => (
                <div key={role} className="flex justify-between">
                  <span>{getRoleText(role)}</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 干系人列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">干系人列表</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  公司
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stakeholders.map(stakeholder => (
                <tr key={stakeholder.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{stakeholder.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stakeholder.company || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {getRoleText(stakeholder.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedStakeholder(stakeholder)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteStakeholder(stakeholder.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 创建干系人表单 */}
      {showCreateForm && (
        <CreateStakeholderForm
          projectId={projectId}
          onSubmit={handleCreateStakeholder}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* 编辑干系人表单 */}
      {selectedStakeholder && (
        <EditStakeholderForm
          projectId={projectId}
          stakeholder={selectedStakeholder}
          onSubmit={async (updateData) => {
            try {
              await StakeholderService.updateStakeholder(projectId, selectedStakeholder.id, updateData)
              await loadStakeholders()
              setSelectedStakeholder(null)
            } catch (error) {
              console.error('更新干系人失败:', error)
            }
          }}
          onCancel={() => setSelectedStakeholder(null)}
        />
      )}
    </div>
  )
}

const CreateStakeholderForm: React.FC<{
  projectId: string
  onSubmit: (data: Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}> = ({ projectId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    project_id: projectId,
    name: '',
    role: '',
    company: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">添加干系人</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公司</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入角色名称"
              required
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

const EditStakeholderForm: React.FC<{
  projectId: string
  stakeholder: Stakeholder
  onSubmit: (data: Partial<Stakeholder>) => void
  onCancel: () => void
}> = ({ projectId, stakeholder, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: stakeholder.name,
    role: stakeholder.role,
    company: stakeholder.company || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">编辑干系人</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公司</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入角色名称"
              required
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

export { CreateStakeholderForm }
