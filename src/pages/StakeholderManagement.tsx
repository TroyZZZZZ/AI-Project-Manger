import React, { useState, useEffect } from 'react'
import { Search, Users, Plus, Settings, Eye, Edit2, Trash2 } from 'lucide-react'
import { Stakeholder } from '../types'
import { StakeholderService } from '../services/stakeholderService'
import { ProjectService } from '../services/projectService'

const StakeholderManagement: React.FC = () => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | ''>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([])

  // 创建/编辑表单字段
  const [formProjectId, setFormProjectId] = useState<string>('')
  const [formName, setFormName] = useState<string>('')
  const [formRole, setFormRole] = useState<string>('')
  const [formCompany, setFormCompany] = useState<string>('')
  const [formIdentityType, setFormIdentityType] = useState<string | ''>('')
  const [formIsResigned, setFormIsResigned] = useState(false)
  const [nameError, setNameError] = useState<string>('')
  const [identityTypes, setIdentityTypes] = useState<{ value: string; label: string; color: string }[]>([])
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [identityDraft, setIdentityDraft] = useState<{ value: string; label: string; color: string }[]>([])

  const normalizeName = (value: string) => value.replace(/[\s\u00A0\u3000]/g, '')
  
  useEffect(() => {
    loadStakeholders()
    // 预取项目列表用于创建表单
    loadProjects()
    // 加载身份类型配置
    loadIdentityTypesConfig()
  }, [])

  const loadStakeholders = async () => {
    try {
      setLoading(true)
      const data = await StakeholderService.getAllStakeholders()
      // 前端兜底排序（中文首字母）
      data.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'))
      setStakeholders(data)
    } catch (error) {
      console.error('获取干系人失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const res = await ProjectService.getProjects(undefined, 1, 100)
      setProjects(res.data.map(p => ({ id: p.id, name: p.name })))
    } catch (error) {
      console.error('获取项目列表失败:', error)
    }
  }

  const loadIdentityTypesConfig = async () => {
    const list = await StakeholderService.getIdentityTypes()
    if (Array.isArray(list) && list.length > 0) {
      setIdentityTypes(list)
    }
  }

  const saveIdentityTypesConfig = async (next: { value: string; label: string; color: string }[]) => {
    setIdentityTypes(next)
    await StakeholderService.saveIdentityTypes(next)
  }

  // 将列表中出现的身份类型自动合并到筛选/选择配置
  // 取消基于列表自动添加类型，改为统一从后端配置加载与保存

  const filteredStakeholders = (stakeholders || []).filter(stakeholder => {
    const matchesSearch = stakeholder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         stakeholder.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         stakeholder.company?.toLowerCase().includes(searchQuery.toLowerCase())
    const normalize = (s?: string) => (s || '').replace(/\s+/g, '')
    const identityLabel = getIdentityTypeLabel(stakeholder.identity_type || undefined)
    const matchesType = !filterType || normalize(identityLabel) === normalize(filterType)
    return matchesSearch && matchesType
  })

  const handleDeleteStakeholder = async (stakeholder: Stakeholder) => {
    if (!confirm('确定要删除这个干系人吗？')) return
    
    try {
      await StakeholderService.deleteStakeholder(stakeholder.project_id, stakeholder.id)
      await loadStakeholders() // 重新加载列表
    } catch (error) {
      console.error('删除干系人失败:', error)
      alert('删除干系人失败: ' + (error as Error).message)
    }
  }

  const openCreateModal = () => {
    setFormProjectId(projects[0]?.id?.toString() || '')
    setFormName('')
    setFormRole('')
    setFormCompany('')
    setFormIdentityType('')
    setFormIsResigned(false)
    setNameError('')
    setShowCreateModal(true)
  }

  const submitCreateStakeholder = async () => {
    try {
      if (!formProjectId) {
        alert('系统未检测到项目，请先创建项目')
        return
      }
      if (!formName.trim()) {
        alert('请填写干系人姓名')
        return
      }
      // 姓名重复校验（全局范围）
      try {
        const allStakeholders = await StakeholderService.getAllStakeholdersAll(1000)
        const duplicate = allStakeholders.some(s => normalizeName(s.name) === normalizeName(formName))
        if (duplicate) {
          setNameError('该干系人姓名已存在（全局重复）')
          alert('该干系人姓名已存在（全局重复）')
          return
        }
      } catch (err) {
        console.error('重名校验失败', err)
        // 即使校验失败也允许尝试提交，或者阻断？为了安全起见，如果校验接口失败，暂不阻断，但后端可能没校验
      }
    const payload = {
      name: formName.trim(),
      role: formRole.trim(),
      company: formCompany.trim() || undefined,
      identity_type: formIdentityType || undefined,
      project_id: formProjectId
    } as Omit<Stakeholder, 'id' | 'created_at' | 'updated_at'>

      await StakeholderService.createStakeholder(formProjectId, payload)
      setShowCreateModal(false)
      await loadStakeholders()
    } catch (error) {
      console.error('创建干系人失败:', error)
      alert('创建干系人失败: ' + (error as Error).message)
    }
  }

  const openViewModal = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder)
    setShowViewModal(true)
  }

  const openEditModal = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder)
    setFormProjectId(stakeholder.project_id)
    setFormName(stakeholder.name || '')
    setFormRole(stakeholder.role || '')
    setFormCompany(stakeholder.company || '')
    setFormIdentityType(stakeholder.identity_type || '')
    setFormIsResigned(!!stakeholder.is_resigned)
    setNameError('')
    setShowEditModal(true)
  }

  const submitEditStakeholder = async () => {
    try {
      if (!selectedStakeholder) return
      if (!formName.trim()) {
        alert('请填写干系人姓名')
        return
      }
      // 姓名重复校验（全局，排除自身）
      try {
        const allStakeholders = await StakeholderService.getAllStakeholdersAll(1000)
        const duplicate = allStakeholders.some(s => normalizeName(s.name) === normalizeName(formName) && s.id !== selectedStakeholder.id)
        if (duplicate) {
          setNameError('系统已存在相同姓名的干系人（全局唯一）')
          alert('系统已存在相同姓名的干系人（全局唯一）')
          return
        }
      } catch (err) {
        console.error('重名校验失败', err)
      }
    const updates: Partial<Stakeholder> = {
      name: formName.trim(),
      role: formRole.trim(),
      company: formCompany.trim() || undefined,
      identity_type: formIdentityType || undefined,
      is_resigned: formIsResigned
    }
      await StakeholderService.updateStakeholder(selectedStakeholder.project_id, selectedStakeholder.id, updates)
      setShowEditModal(false)
      setSelectedStakeholder(null)
      await loadStakeholders()
    } catch (error) {
      console.error('更新干系人失败:', error)
      alert('更新干系人失败: ' + (error as Error).message)
    }
  }

  function getIdentityTypeLabel(type?: string) {
    if (!type) return '-'
    const found = identityTypes.find(t => t.value === type || t.label === type)
    if (found?.label) return found.label
    const alias: Record<string, { label: string; color: string }> = {
      supplier: { label: '供应商', color: 'bg-blue-100 text-blue-800' },
      suzhou_tech_equity_service: { label: '苏州科技股权服务', color: 'bg-green-100 text-green-800' },
      internal: { label: '内部', color: 'bg-gray-100 text-gray-800' },
    }
    return alias[type]?.label || type
  }

  function getIdentityTypeColor(type?: string) {
    if (!type) return 'bg-gray-100 text-gray-800'
    const found = identityTypes.find(t => t.value === type || t.label === type)
    if (found?.color) return found.color
    const alias: Record<string, { label: string; color: string }> = {
      supplier: { label: '供应商', color: 'bg-blue-100 text-blue-800' },
      suzhou_tech_equity_service: { label: '苏州科技股权服务', color: 'bg-green-100 text-green-800' },
      internal: { label: '内部', color: 'bg-gray-100 text-gray-800' },
    }
    return alias[type]?.color || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">干系人管理</h1>
        </div>
        <div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="w-4 h-4 mr-2" /> 新增干系人
          </button>
          <button
            onClick={() => { setIdentityDraft(identityTypes); setShowIdentityModal(true) }}
            className="inline-flex items-center ml-3 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
          >
            <Settings className="w-4 h-4 mr-2" /> 配置身份类型
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* 搜索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              搜索干系人
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索姓名、角色或公司..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 类型筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              身份类型
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as string | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部类型</option>
              {identityTypes.map(t => (
                <option key={t.value} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 统计信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              统计信息
            </label>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>共 {filteredStakeholders.length} 个干系人</span>
            </div>
          </div>
        </div>
      </div>

      {/* 干系人列表 */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-md p-10 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">加载中...</p>
        </div>
      ) : filteredStakeholders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-10 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无干系人</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || filterType ? '没有找到匹配的干系人' : '暂无干系人'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStakeholders.map((stakeholder) => (
            <div key={stakeholder.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    {stakeholder.name}
                    {stakeholder.is_resigned && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        离职
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{stakeholder.role}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIdentityTypeColor(stakeholder.identity_type)}`}>
                  {getIdentityTypeLabel(stakeholder.identity_type || undefined)}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span>{stakeholder.company || '-'}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openViewModal(stakeholder)}
                  className="px-3 py-1.5 text-sm border border-gray-200 bg-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded transition-colors"
                >
                  查看
                </button>
                <button
                  onClick={() => openEditModal(stakeholder)}
                  className="px-3 py-1.5 text-sm border border-blue-200 bg-transparent text-blue-600 hover:text-blue-900 hover:border-blue-400 rounded transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteStakeholder(stakeholder)}
                  className="px-3 py-1.5 text-sm border border-red-200 bg-transparent text-red-600 hover:text-red-900 hover:border-red-400 rounded transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 移除了项目范围的创建/编辑模态框：在干系人页面统一管理 */}
      {/* 新增干系人模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">新增干系人</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* 已按默认项目赋值，不展示项目选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    if (e.target.value.trim()) {
                      // 全局重名校验（忽略项目）
                      const dup = stakeholders.some(s => normalizeName(s.name) === normalizeName(e.target.value))
                      setNameError(dup ? '系统已存在相同姓名的干系人（全局唯一）' : '')
                    } else {
                      setNameError('')
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <input
                  type="text"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">身份类型</label>
                <select
                  value={formIdentityType}
                  onChange={(e) => setFormIdentityType(e.target.value as string | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">未选择</option>
                  {identityTypes.map(t => (
                    <option key={t.value} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  id="create-resigned"
                  type="checkbox"
                  checked={formIsResigned}
                  onChange={(e) => setFormIsResigned(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="create-resigned" className="ml-2 block text-sm text-gray-900">
                  是否已离职
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公司</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >取消</button>
              <button
                onClick={submitCreateStakeholder}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={!!nameError}
              >保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 查看干系人模态框 */}
      {showViewModal && selectedStakeholder && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">查看干系人</h3>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm text-gray-700">
              <p><span className="font-medium">姓名：</span>{selectedStakeholder.name}</p>
              <p><span className="font-medium">角色：</span>{selectedStakeholder.role || '-'}</p>
              <p><span className="font-medium">身份类型：</span>{selectedStakeholder.identity_type ? getIdentityTypeLabel(selectedStakeholder.identity_type) : '-'}</p>
              <p><span className="font-medium">公司：</span>{selectedStakeholder.company || '-'}</p>
              <p><span className="font-medium">所属项目ID：</span>{selectedStakeholder.project_id}</p>
              <p><span className="font-medium">创建时间：</span>{selectedStakeholder.created_at}</p>
              <p><span className="font-medium">更新时间：</span>{selectedStakeholder.updated_at}</p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => { setShowViewModal(false); setSelectedStakeholder(null) }}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑干系人模态框 */}
      {showEditModal && selectedStakeholder && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">编辑干系人</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属项目（不可更改）</label>
                <input
                  type="text"
                  value={formProjectId}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    if (formProjectId && e.target.value.trim()) {
                      const dup = stakeholders.some(s => normalizeName(s.name) === normalizeName(e.target.value) && s.id !== selectedStakeholder.id)
                      setNameError(dup ? '该项目下已存在相同姓名的干系人' : '')
                    } else {
                      setNameError('')
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <input
                  type="text"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">身份类型</label>
                <select
                  value={formIdentityType}
                  onChange={(e) => setFormIdentityType(e.target.value as string | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">未选择</option>
                  {identityTypes.map(t => (
                    <option key={t.value} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  id="edit-resigned"
                  type="checkbox"
                  checked={formIsResigned}
                  onChange={(e) => setFormIsResigned(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-resigned" className="ml-2 block text-sm text-gray-900">
                  是否已离职
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公司</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => { setShowEditModal(false); setSelectedStakeholder(null) }}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >取消</button>
              <button
                onClick={submitEditStakeholder}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={!!nameError}
              >保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 身份类型配置模态框 */}
      {showIdentityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">身份类型配置</h3>
              <button onClick={() => setShowIdentityModal(false)} className="text-gray-600 hover:text-gray-900">×</button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-500 mb-3">添加或编辑身份类型名称；系统将自动生成值并使用默认颜色。</p>
              <div className="space-y-3">
                {identityDraft.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-11">
                      <label className="block text-xs text-gray-500">类型名称</label>
                      <input
                        value={item.label}
                        onChange={e => setIdentityDraft(prev => prev.map((it, i) => i === idx ? { ...it, label: e.target.value } : it))}
                        className="w-full px-2 py-1 border rounded"
                        placeholder="例如：供应商"
                      />
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => setIdentityDraft(prev => prev.filter((_, i) => i !== idx))} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">删除</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button onClick={() => setIdentityDraft(prev => [...prev, { value: '', label: '', color: 'bg-gray-100 text-gray-800' }])} className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200">添加类型</button>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button onClick={() => setShowIdentityModal(false)} className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">取消</button>
              <button onClick={() => {
                // 仅根据名称保存：自动生成 value，使用默认颜色
                const slugify = (s: string) => {
                  const raw = s.trim()
                  const ascii = raw
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_\-]/g, '')
                  // 对于非拉丁字符（如中文），ascii 可能为空，回退为原始名称
                  return ascii || raw
                }

                const cleaned = identityDraft
                  .map(i => ({
                    label: i.label.trim(),
                    value: (i.value || '').trim() || slugify(i.label),
                    color: (i.color || 'bg-gray-100 text-gray-800').trim()
                  }))
                  .filter(i => i.label)

                const setVals = new Set(cleaned.map(i => i.value))
                if (setVals.size !== cleaned.length) {
                  alert('身份类型名称生成的值存在重复，请调整名称')
                  return
                }
                saveIdentityTypesConfig(cleaned)
                setShowIdentityModal(false)
              }} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StakeholderManagement
