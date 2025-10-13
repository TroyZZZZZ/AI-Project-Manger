import React, { useState, useEffect } from 'react'
import { Users, Plus, Mail, Phone, Building, Edit, Trash2, Search, Filter, UserCheck, UserX } from 'lucide-react'
import { StakeholderService } from '../services/stakeholderService'
import { ProjectService } from '../services/projectService'
import type { Stakeholder, Project } from '../types'
import { useResponsive } from '../hooks/useResponsive'
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid'
import { cn } from '../utils/cn'

const StakeholderManagement: React.FC = () => {
  const { isMobile, isTablet } = useResponsive()
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  const [newStakeholder, setNewStakeholder] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'member' as const,
    department: '',
    company: '',
    project_id: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [stakeholdersData, projectsData] = await Promise.all([
        StakeholderService.getStakeholders({ page: 1, limit: 100 }),
        ProjectService.getProjects({ page: 1, limit: 100 })
      ])
      setStakeholders(stakeholdersData.data)
      setProjects(projectsData.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStakeholder = async () => {
    try {
      await StakeholderService.createStakeholder(newStakeholder)
      
      setShowCreateModal(false)
      setNewStakeholder({
        name: '',
        email: '',
        phone: '',
        role: 'member',
        department: '',
        company: '',
        project_id: '',
        notes: ''
      })
      
      await loadData()
    } catch (error) {
      console.error('Error creating stakeholder:', error)
    }
  }

  const handleUpdateStakeholder = async (id: string, updates: Partial<Stakeholder>) => {
    try {
      await StakeholderService.updateStakeholder(id, updates)
      await loadData()
      setEditingStakeholder(null)
    } catch (error) {
      console.error('Error updating stakeholder:', error)
    }
  }

  const handleDeleteStakeholder = async (id: string) => {
    if (window.confirm('确定要删除这个干系人吗？')) {
      try {
        await StakeholderService.deleteStakeholder(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting stakeholder:', error)
      }
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner': return '项目负责人'
      case 'manager': return '项目经理'
      case 'member': return '团队成员'
      case 'stakeholder': return '干系人'
      case 'client': return '客户'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      case 'stakeholder': return 'bg-yellow-100 text-yellow-800'
      case 'client': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || '未分配项目'
  }

  const filteredStakeholders = stakeholders.filter(stakeholder => {
    const matchesSearch = stakeholder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stakeholder.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stakeholder.company?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || stakeholder.role === roleFilter
    const matchesProject = projectFilter === 'all' || stakeholder.project_id === projectFilter
    
    return matchesSearch && matchesRole && matchesProject
  })

  const roleStats = stakeholders.reduce((acc, stakeholder) => {
    acc[stakeholder.role] = (acc[stakeholder.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className={cn(
          'flex justify-between items-center mb-8',
          isMobile && 'flex-col space-y-3 items-start'
        )}>
          <h1 className={cn(
            'font-bold text-gray-900',
            isMobile ? 'text-xl' : 'text-3xl'
          )}>干系人管理</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
              isMobile && 'w-full justify-center'
            )}
          >
            <Plus className="w-4 h-4" />
            添加干系人
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总干系人数</p>
                <p className="text-2xl font-bold text-gray-900">{stakeholders.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">项目负责人</p>
                <p className="text-2xl font-bold text-purple-600">{roleStats.owner || 0}</p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">团队成员</p>
                <p className="text-2xl font-bold text-green-600">{roleStats.member || 0}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">客户</p>
                <p className="text-2xl font-bold text-orange-600">{roleStats.client || 0}</p>
              </div>
              <Building className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className={cn(
            'flex gap-4',
            isMobile ? 'flex-col' : 'flex-col md:flex-row'
          )}>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={isMobile ? "搜索干系人..." : "搜索干系人姓名、邮箱或公司..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className={cn(
              'flex gap-3',
              isMobile && 'flex-col'
            )}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={cn(
                  'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  isMobile && 'w-full'
                )}
              >
                <option value="all">所有角色</option>
                <option value="owner">项目负责人</option>
                <option value="manager">项目经理</option>
                <option value="member">团队成员</option>
                <option value="stakeholder">干系人</option>
                <option value="client">客户</option>
              </select>
              
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className={cn(
                  'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  isMobile && 'w-full'
                )}
              >
                <option value="all">所有项目</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 干系人列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredStakeholders.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无干系人</h3>
              <p className="text-gray-500 mb-4">添加您的第一个干系人吧</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加干系人
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      姓名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      联系方式
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      公司/部门
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      项目
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStakeholders.map((stakeholder) => (
                    <tr key={stakeholder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {stakeholder.name}
                            </div>
                            {stakeholder.notes && (
                              <div className="text-sm text-gray-500">
                                {stakeholder.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(stakeholder.role)}`}>
                          {getRoleText(stakeholder.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          {stakeholder.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <a href={`mailto:${stakeholder.email}`} className="text-blue-600 hover:text-blue-800">
                                {stakeholder.email}
                              </a>
                            </div>
                          )}
                          {stakeholder.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <a href={`tel:${stakeholder.phone}`} className="text-blue-600 hover:text-blue-800">
                                {stakeholder.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {stakeholder.company && (
                            <div className="font-medium">{stakeholder.company}</div>
                          )}
                          {stakeholder.department && (
                            <div className="text-gray-500">{stakeholder.department}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getProjectName(stakeholder.project_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingStakeholder(stakeholder)}
                            className="text-blue-600 hover:text-blue-900"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStakeholder(stakeholder.id)}
                            className="text-red-600 hover:text-red-900"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 创建/编辑干系人模态框 */}
        {(showCreateModal || editingStakeholder) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingStakeholder ? '编辑干系人' : '添加干系人'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingStakeholder(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <UserX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    value={editingStakeholder ? editingStakeholder.name : newStakeholder.name}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, name: e.target.value })
                      } else {
                        setNewStakeholder({ ...newStakeholder, name: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入姓名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={editingStakeholder ? editingStakeholder.email || '' : newStakeholder.email}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, email: e.target.value })
                      } else {
                        setNewStakeholder({ ...newStakeholder, email: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入邮箱地址"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    电话
                  </label>
                  <input
                    type="tel"
                    value={editingStakeholder ? editingStakeholder.phone || '' : newStakeholder.phone}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, phone: e.target.value })
                      } else {
                        setNewStakeholder({ ...newStakeholder, phone: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入电话号码"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色 *
                  </label>
                  <select
                    value={editingStakeholder ? editingStakeholder.role : newStakeholder.role}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, role: e.target.value as any })
                      } else {
                        setNewStakeholder({ ...newStakeholder, role: e.target.value as any })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="owner">项目负责人</option>
                    <option value="manager">项目经理</option>
                    <option value="member">团队成员</option>
                    <option value="stakeholder">干系人</option>
                    <option value="client">客户</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公司
                  </label>
                  <input
                    type="text"
                    value={editingStakeholder ? editingStakeholder.company || '' : newStakeholder.company}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, company: e.target.value })
                      } else {
                        setNewStakeholder({ ...newStakeholder, company: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入公司名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    部门
                  </label>
                  <input
                    type="text"
                    value={editingStakeholder ? editingStakeholder.department || '' : newStakeholder.department}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, department: e.target.value })
                      } else {
                        setNewStakeholder({ ...newStakeholder, department: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入部门名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    关联项目
                  </label>
                  <select
                    value={editingStakeholder ? editingStakeholder.project_id : newStakeholder.project_id}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, project_id: e.target.value })
                      } else {
                        setNewStakeholder({ ...newStakeholder, project_id: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">选择项目</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={editingStakeholder ? editingStakeholder.notes || '' : newStakeholder.notes}
                    onChange={(e) => {
                      if (editingStakeholder) {
                        setEditingStakeholder({ ...editingStakeholder, notes: e.target.value })
                      } else {
                        setNewStakeholder({ ...newStakeholder, notes: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="输入备注信息"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingStakeholder(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (editingStakeholder) {
                      handleUpdateStakeholder(editingStakeholder.id, editingStakeholder)
                    } else {
                      handleCreateStakeholder()
                    }
                  }}
                  disabled={editingStakeholder ? !editingStakeholder.name : !newStakeholder.name}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingStakeholder ? '更新' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StakeholderManagement