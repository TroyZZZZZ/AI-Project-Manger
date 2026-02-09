import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Reminder {
  id: string
  title: string
  description?: string
  type: 'deadline' | 'meeting' | 'milestone' | 'task' | 'other'
  dueDate: Date
  projectId?: string
  isCompleted: boolean
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

interface ReminderState {
  reminders: Reminder[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchReminders: () => Promise<void>
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAsCompleted: (id: string) => Promise<void>
  getUnreadCount: () => number
  getUpcomingReminders: (days?: number) => Reminder[]
  getRemindersByProject: (projectId: string) => Reminder[]
  getRemindersByType: (type: Reminder['type']) => Reminder[]
}

export const useReminderStore = create<ReminderState>()(devtools(
  (set, get) => ({
    reminders: [
      {
        id: '1',
        title: '项目A里程碑检查',
        description: '检查项目A第一阶段的完成情况',
        type: 'milestone',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后
        projectId: '1',
        isCompleted: false,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: '团队周会',
        description: '每周例行团队会议',
        type: 'meeting',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1天后
        isCompleted: false,
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        title: '项目B交付截止',
        description: '项目B最终版本交付',
        type: 'deadline',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后
        projectId: '2',
        isCompleted: false,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    loading: false,
    error: null,

    fetchReminders: async () => {
      set({ loading: true, error: null })
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        // 实际实现中，这里会调用API获取提醒数据
        set({ loading: false })
      } catch (error) {
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : '获取提醒失败' 
        })
      }
    },

    addReminder: async (reminderData) => {
      set({ loading: true, error: null })
      try {
        const newReminder: Reminder = {
          ...reminderData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        set(state => ({
          reminders: [...state.reminders, newReminder],
          loading: false
        }))
      } catch (error) {
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : '添加提醒失败' 
        })
      }
    },

    updateReminder: async (id, updates) => {
      set({ loading: true, error: null })
      try {
        set(state => ({
          reminders: state.reminders.map(reminder => 
            reminder.id === id 
              ? { ...reminder, ...updates, updatedAt: new Date() }
              : reminder
          ),
          loading: false
        }))
      } catch (error) {
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : '更新提醒失败' 
        })
      }
    },

    deleteReminder: async (id) => {
      set({ loading: true, error: null })
      try {
        set(state => ({
          reminders: state.reminders.filter(reminder => reminder.id !== id),
          loading: false
        }))
      } catch (error) {
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : '删除提醒失败' 
        })
      }
    },

    markAsRead: async (id) => {
      const { updateReminder } = get()
      await updateReminder(id, { isRead: true })
    },

    markAsCompleted: async (id) => {
      const { updateReminder } = get()
      await updateReminder(id, { isCompleted: true })
    },

    getUnreadCount: () => {
      const { reminders } = get()
      return reminders.filter(reminder => !reminder.isRead && !reminder.isCompleted).length
    },

    getUpcomingReminders: (days = 7) => {
      const { reminders } = get()
      const now = new Date()
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      
      return reminders
        .filter(reminder => 
          !reminder.isCompleted && 
          reminder.dueDate >= now && 
          reminder.dueDate <= futureDate
        )
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    },

    getRemindersByProject: (projectId) => {
      const { reminders } = get()
      return reminders.filter(reminder => reminder.projectId === projectId)
    },

    getRemindersByType: (type) => {
      const { reminders } = get()
      return reminders.filter(reminder => reminder.type === type)
    }
  }),
  {
    name: 'reminder-store'
  }
))