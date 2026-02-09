import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, X, FileText } from 'lucide-react'
import { ProjectService } from '../services/projectService'
import { cn } from '../utils/cn'

interface ProjectFormData {
  name: string
  description: string
}

const ProjectCreate: React.FC = () => {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '项目名称不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // 单用户系统，创建项目 - 只传递后端需要的字段
      await ProjectService.createProject({
        name: formData.name,
        description: formData.description,
        start_date: new Date().toISOString().split('T')[0],
        estimated_hours: 0,
        actual_hours: 0,
        project_level: 1
      })
      
      navigate('/projects')
    } catch (error: any) {
      console.error('创建项目失败:', error)
      // 显示具体的错误信息
      const errorMessage = error.message || '创建项目失败，请重试'
      setErrors({ submit: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // 处理输入变化
  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* 页面标题栏 */}
        <div className="flex items-center justify-between mb-8 bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">新建项目</h1>
              <p className="text-sm text-gray-500 mt-1">创建一个新的项目并设置基本信息</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={cn(
                'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              {loading ? '创建中...' : '创建项目'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* 项目名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  )}
                  placeholder="请输入项目名称，例如：移动端APP开发项目"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* 项目描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  项目描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors resize-none"
                  placeholder="请详细描述项目的目标、范围和主要功能..."
                />
              </div>
            </div>
          </div>

          {/* 错误信息 */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-600" />
                <p className="text-red-700 font-medium">{errors.submit}</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default ProjectCreate
