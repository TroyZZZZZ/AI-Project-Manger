import React, { useState, useEffect } from 'react'
import {
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Filter,
  Plus
} from 'lucide-react'
import { useReminderStore } from '../stores/useReminderStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useResponsive } from '../hooks/useResponsive'
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid'
import { cn } from '../utils/cn'

const ReminderCenter: React.FC = () => {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminderStore()
  const { projects } = useProjectStore()
  const { isMobile, isTablet } = useResponsive()
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadReminders()
  }, [])

  const loadReminders = async () => {
    try {
      setLoading(true)
      const data = await ReminderService.getReminders({ page: 1, limit: 100 })
      setReminders(data.data)
    } catch (error) {
      console.error('Error loading reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReminder = async () => {
    try {
      await ReminderService.createReminder({
        ...newReminder,
        remind_at: new Date(newReminder.remind_at).toISOString()
      })
      
      setShowCreateModal(false)
      setNewReminder({
        title: '',
        description: '',
        type: 'task_deadline',
        remind_at: '',
        project_id: '',
        task_id: ''
      })
      
      await loadReminders()
    } catch (error) {
      console.error('Error creating reminder:', error)
    }
  }

  const handleUpdateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      await ReminderService.updateReminder(id, updates)
      await loadReminders()
    } catch (error) {
      console.error('Error updating reminder:', error)
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (window.confirm('确定要删除这个提醒吗？')) {
      try {
        await ReminderService.deleteReminder(id)
        await loadReminders()
      } catch (error) {
        console.error('Error deleting reminder:', error)
      }
    }
  }

  const markAsRead = async (id: string) => {
    await handleUpdateReminder(id, { is_read: true })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_deadline': return <Clock className="w-5 h-5 text-red-500" />
      case 'milestone': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'meeting': return <Calendar className="w-5 h-5 text-blue-500" />
      case 'review': return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default: return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'task_deadline': return '任务截止'
      case 'milestone': return '里程碑'
      case 'meeting': return '会议'
      case 'review': return '评审'
      default: return '其他'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task_deadline': return 'bg-red-100 text-red-800'
      case 'milestone': return 'bg-green-100 text-green-800'
      case 'meeting': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (remindAt: string) => {
    return new Date(remindAt) < new Date()
  }

  const filteredReminders = reminders.filter(reminder => {
    switch (filter) {
      case 'unread': return !reminder.is_read
      case 'overdue': return isOverdue(reminder.remind_at) && !reminder.is_read
      case 'today': {
        const today = new Date()
        const remindDate = new Date(reminder.remind_at)
        return remindDate.toDateString() === today.toDateString()
      }
      default: return true
    }
  })

  const unreadCount = reminders.filter(r => !r.is_read).length
  const overdueCount = reminders.filter(r => isOverdue(r.remind_at) && !r.is_read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className={cn(
          'flex items-center justify-between',
          isMobile && 'flex-col space-y-3 items-start'
        )}>
          <div className={cn(isMobile && 'w-full')}>
            <h1 className={cn(
              'font-bold text-gray-900 dark:text-white',
              isMobile ? 'text-xl' : 'text-2xl'
            )}>
              提醒中心
            </h1>
            <p className={cn(
              'mt-1 text-gray-500 dark:text-gray-400',
              isMobile ? 'text-xs' : 'text-sm'
            )}>
              管理项目提醒和重要事件
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className={cn(
              'inline-flex items-center px-4 py-2 border border-transparent font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              isMobile ? 'w-full justify-center text-sm' : 'text-sm'
            )}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加提醒
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">未读提醒</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">逾期提醒</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总提醒数</p>
                <p className="text-2xl font-bold text-gray-900">{reminders.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className={cn(
            isMobile ? 'p-3' : 'p-4'
          )}>
            <div className={cn(
              'flex items-center',
              isMobile ? 'flex-col space-y-3 items-start' : 'space-x-4'
            )}>
              <div className="flex items-center space-x-2">
                <Filter className={cn(
                  'text-gray-400',
                  isMobile ? 'h-4 w-4' : 'h-5 w-5'
                )} />
                {!isMobile && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    筛选：
                  </span>
                )}
              </div>
              <div className={cn(
                'flex gap-2',
                isMobile && 'w-full flex-wrap'
              )}>
                <button
                  onClick={() => setFilter('all')}
                  className={cn(
                    'px-3 py-1 rounded-full font-medium',
                    isMobile ? 'text-xs flex-1' : 'text-sm',
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  全部 ({reminders.length})
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={cn(
                    'px-3 py-1 rounded-full font-medium',
                    isMobile ? 'text-xs flex-1' : 'text-sm',
                    filter === 'pending'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  待处理 ({pendingReminders.length})
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={cn(
                    'px-3 py-1 rounded-full font-medium',
                    isMobile ? 'text-xs flex-1' : 'text-sm',
                    filter === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  已完成 ({completedReminders.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 提醒列表 */}
        <div className={cn(
          'space-y-3',
          !isMobile && 'space-y-4'
        )}>
          {filteredReminders.length === 0 ? (
            <div className={cn(
              'text-center',
              isMobile ? 'py-8' : 'py-12'
            )}>
              <Bell className={cn(
                'mx-auto text-gray-400',
                isMobile ? 'h-10 w-10' : 'h-12 w-12'
              )} />
              <h3 className={cn(
                'mt-2 font-medium text-gray-900 dark:text-white',
                isMobile ? 'text-sm' : 'text-sm'
              )}>
                暂无提醒
              </h3>
              <p className={cn(
                'mt-1 text-gray-500 dark:text-gray-400',
                isMobile ? 'text-xs' : 'text-sm'
              )}>
                {filter === 'all' ? '还没有创建任何提醒' : `没有${filter === 'pending' ? '待处理' : '已完成'}的提醒`}
              </p>
            </div>
          ) : (
            filteredReminders.map((reminder) => {
              const project = projects.find(p => p.id === reminder.projectId)
              const isOverdue = new Date(reminder.dueDate) < new Date() && !reminder.completed
              
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    'bg-white dark:bg-gray-800 shadow rounded-lg border-l-4',
                    isMobile ? 'p-4' : 'p-6',
                    isOverdue
                      ? 'border-red-400'
                      : reminder.priority === 'high'
                      ? 'border-orange-400'
                      : reminder.priority === 'medium'
                      ? 'border-yellow-400'
                      : 'border-green-400'
                  )}
                >
                  <div className={cn(
                    'flex items-start justify-between',
                    isMobile && 'flex-col space-y-3'
                  )}>
                    <div className={cn(
                      'flex-1',
                      isMobile && 'w-full'
                    )}>
                      <div className="flex items-center space-x-2">
                        <h3 className={cn(
                          'font-medium text-gray-900 dark:text-white',
                          isMobile ? 'text-base' : 'text-lg'
                        )}>
                          {reminder.title}
                        </h3>
                        {isOverdue && (
                          <AlertTriangle className={cn(
                            'text-red-500',
                            isMobile ? 'h-4 w-4' : 'h-5 w-5'
                          )} />
                        )}
                        {reminder.completed && (
                          <CheckCircle className={cn(
                            'text-green-500',
                            isMobile ? 'h-4 w-4' : 'h-5 w-5'
                          )} />
                        )}
                      </div>
                      
                      {reminder.description && (
                        <p className={cn(
                          'mt-1 text-gray-600 dark:text-gray-400',
                          isMobile ? 'text-xs' : 'text-sm'
                        )}>
                          {reminder.description}
                        </p>
                      )}
                      
                      <div className={cn(
                        'mt-3 flex items-center text-gray-500 dark:text-gray-400',
                        isMobile ? 'flex-col space-y-2 items-start text-xs' : 'space-x-4 text-sm'
                      )}>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(reminder.dueDate).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{reminder.time}</span>
                        </div>
                        
                        {project && (
                          <div className="flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className={cn(
                              isMobile && 'truncate max-w-24'
                            )}>{project.name}</span>
                          </div>
                        )}
                        
                        <span className={cn(
                          'px-2 py-1 rounded-full font-medium',
                          isMobile ? 'text-xs' : 'text-xs',
                          reminder.priority === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : reminder.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        )}>
                          {reminder.priority === 'high' ? '高优先级' :
                           reminder.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={cn(
                      'flex items-center space-x-2',
                      isMobile ? 'w-full justify-end' : 'ml-4'
                    )}>
                      {!reminder.completed && (
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className={cn(
                            'text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-full',
                            isMobile ? 'p-1.5' : 'p-2'
                          )}
                          title="标记为完成"
                        >
                          <CheckCircle className={cn(
                            isMobile ? 'h-4 w-4' : 'h-5 w-5'
                          )} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className={cn(
                          'text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-full',
                          isMobile ? 'p-1.5' : 'p-2'
                        )}
                        title="删除提醒"
                      >
                        <X className={cn(
                          isMobile ? 'h-4 w-4' : 'h-5 w-5'
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 创建提醒模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">新建提醒</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标题
                  </label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入提醒标题"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="输入提醒描述"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    类型
                  </label>
                  <select
                    value={newReminder.type}
                    onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="task_deadline">任务截止</option>
                    <option value="milestone">里程碑</option>
                    <option value="meeting">会议</option>
                    <option value="review">评审</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    提醒时间
                  </label>
                  <input
                    type="datetime-local"
                    value={newReminder.remind_at}
                    onChange={(e) => setNewReminder({ ...newReminder, remind_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={!newReminder.title || !newReminder.remind_at}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReminderCenter