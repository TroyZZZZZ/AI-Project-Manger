import React, { useState } from 'react'
import { X, User } from 'lucide-react'
// 移除枚举依赖，identity_type 改为字符串
import { StakeholderService } from '../services/stakeholderService'

interface StakeholderCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId: string
}

export const StakeholderCreateModal: React.FC<StakeholderCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId
}) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    role: '',
    contact_info: '',
    identity_type: 'supplier'
  })

  const normalizeName = (value: string) => value.replace(/[\s\u00A0\u3000]/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setLoading(true)
      try {
        const allStakeholders = await StakeholderService.getAllStakeholdersAll(1000)
        const exists = allStakeholders.some(
          s => normalizeName(s.name) === normalizeName(formData.name)
        )
        if (exists) {
          alert('系统已存在相同姓名的干系人（全局唯一）')
          return
        }
      } catch (error) {
        console.error('重名校验失败:', error)
      }
      const stakeholderData = {
        project_id: projectId,
        name: formData.name.trim(),
        role: formData.role.trim() || null,
        company: formData.company.trim() || null,
        contact_info: formData.contact_info.trim() || null,
        identity_type: formData.identity_type
      }

      await StakeholderService.createStakeholder(projectId, stakeholderData)
      
      // 重置表单
      setFormData({
        name: '',
        company: '',
        role: '',
        contact_info: '',
        identity_type: 'supplier'
      })
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('创建干系人失败:', error)
      alert('创建干系人失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      role: '',
      company: '',
      contact_info: '',
      identity_type: 'supplier'
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <User className="w-5 h-5 mr-2" />
            新增干系人
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入姓名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
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
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入公司"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              联系方式
            </label>
            <input
              type="text"
              value={formData.contact_info}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入邮箱或电话"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              身份类型
            </label>
          <select
            value={formData.identity_type}
            onChange={(e) => setFormData(prev => ({ ...prev, identity_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={'supplier'}>供应商</option>
            <option value={'suzhou_tech_equity_service'}>苏州科技股权服务</option>
          </select>
        </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
