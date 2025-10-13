import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search } from 'lucide-react'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  const handleGoHome = () => {
    navigate('/')
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 图标 */}
        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900 mb-6">
          <Search className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>

        {/* 404 标题 */}
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          404
        </h1>

        {/* 错误描述 */}
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          页面未找到
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          抱歉，您访问的页面不存在或已被移动。
          <br />
          请检查URL是否正确，或返回首页继续浏览。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            返回首页
          </button>
          
          <button
            onClick={handleGoBack}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回上页
          </button>
        </div>

        {/* 建议链接 */}
        <div className="mt-12">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            您可能想要访问：
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/projects')}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
            >
              项目概览
            </button>
            <button
              onClick={() => navigate('/workload')}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
            >
              工作量统计
            </button>
            <button
              onClick={() => navigate('/reminders')}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
            >
              提醒中心
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
            >
              系统设置
            </button>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            如果您认为这是一个错误，请联系系统管理员
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound