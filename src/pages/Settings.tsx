import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, User, Bell, Palette, Database, Shield, Globe, Save, RefreshCw, Check, X } from 'lucide-react'
import { useResponsive } from '../hooks/useResponsive'
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid'
import { cn } from '../utils/cn'

interface SettingsData {
  profile: {
    name: string
    email: string
    avatar: string
    timezone: string
    language: string
  }
  notifications: {
    email_notifications: boolean
    push_notifications: boolean
    task_reminders: boolean
    project_updates: boolean
    deadline_alerts: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    color_scheme: string
    compact_mode: boolean
    sidebar_collapsed: boolean
  }
  data: {
    auto_backup: boolean
    backup_frequency: 'daily' | 'weekly' | 'monthly'
    data_retention: number
    export_format: 'csv' | 'json' | 'xlsx'
  }
  security: {
    two_factor_auth: boolean
    session_timeout: number
    password_expiry: number
    login_notifications: boolean
  }
  integration: {
    calendar_sync: boolean
    email_integration: boolean
    slack_notifications: boolean
    webhook_url: string
  }
}

const Settings: React.FC = () => {
  const { isMobile, isTablet } = useResponsive()
  const [activeTab, setActiveTab] = useState('profile')
  const [settings, setSettings] = useState<SettingsData>({
    profile: {
      name: '用户',
      email: 'user@example.com',
      avatar: '',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN'
    },
    notifications: {
      email_notifications: true,
      push_notifications: true,
      task_reminders: true,
      project_updates: true,
      deadline_alerts: true
    },
    appearance: {
      theme: 'light',
      color_scheme: 'blue',
      compact_mode: false,
      sidebar_collapsed: false
    },
    data: {
      auto_backup: true,
      backup_frequency: 'daily',
      data_retention: 90,
      export_format: 'csv'
    },
    security: {
      two_factor_auth: false,
      session_timeout: 30,
      password_expiry: 90,
      login_notifications: true
    },
    integration: {
      calendar_sync: false,
      email_integration: false,
      slack_notifications: false,
      webhook_url: ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    // 从本地存储加载设置
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }

  const handleSettingChange = (category: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
    setHasChanges(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // 模拟保存到服务器
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 保存到本地存储
      localStorage.setItem('appSettings', JSON.stringify(settings))
      
      setSaved(true)
      setHasChanges(false)
      
      // 3秒后隐藏保存成功提示
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置吗？此操作不可撤销。')) {
      localStorage.removeItem('appSettings')
      window.location.reload()
    }
  }

  const tabs = [
    { id: 'profile', name: '个人资料', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', name: '通知设置', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', name: '外观设置', icon: <Palette className="w-4 h-4" /> },
    { id: 'data', name: '数据管理', icon: <Database className="w-4 h-4" /> },
    { id: 'security', name: '安全设置', icon: <Shield className="w-4 h-4" /> },
    { id: 'integration', name: '集成设置', icon: <Globe className="w-4 h-4" /> }
  ]

  const colorSchemes = [
    { id: 'blue', name: '蓝色', color: 'bg-blue-500' },
    { id: 'green', name: '绿色', color: 'bg-green-500' },
    { id: 'purple', name: '紫色', color: 'bg-purple-500' },
    { id: 'orange', name: '橙色', color: 'bg-orange-500' },
    { id: 'red', name: '红色', color: 'bg-red-500' }
  ]

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          姓名
        </label>
        <input
          type="text"
          value={settings.profile.name}
          onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={settings.profile.email}
          onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          时区
        </label>
        <select
          value={settings.profile.timezone}
          onChange={(e) => handleSettingChange('profile', 'timezone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
          <option value="America/New_York">美国东部时间 (UTC-5)</option>
          <option value="Europe/London">英国时间 (UTC+0)</option>
          <option value="Asia/Tokyo">日本时间 (UTC+9)</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          语言
        </label>
        <select
          value={settings.profile.language}
          onChange={(e) => handleSettingChange('profile', 'language', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
          <option value="ja-JP">日本語</option>
        </select>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      {Object.entries(settings.notifications).map(([key, value]) => {
        const labels: Record<string, string> = {
          email_notifications: '邮件通知',
          push_notifications: '推送通知',
          task_reminders: '任务提醒',
          project_updates: '项目更新',
          deadline_alerts: '截止日期提醒'
        }
        
        return (
          <div key={key} className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">{labels[key]}</h3>
              <p className="text-sm text-gray-500">接收{labels[key].toLowerCase()}消息</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        )
      })}
    </div>
  )

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          主题
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['light', 'dark', 'system'].map((theme) => {
            const labels = { light: '浅色', dark: '深色', system: '跟随系统' }
            return (
              <button
                key={theme}
                onClick={() => handleSettingChange('appearance', 'theme', theme)}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  settings.appearance.theme === theme
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {labels[theme as keyof typeof labels]}
              </button>
            )
          })}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          主题色
        </label>
        <div className="flex gap-3">
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => handleSettingChange('appearance', 'color_scheme', scheme.id)}
              className={`w-8 h-8 rounded-full ${scheme.color} relative ${
                settings.appearance.color_scheme === scheme.id
                  ? 'ring-2 ring-offset-2 ring-gray-400'
                  : ''
              }`}
              title={scheme.name}
            >
              {settings.appearance.color_scheme === scheme.id && (
                <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">紧凑模式</h3>
          <p className="text-sm text-gray-500">减少界面元素间距</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.appearance.compact_mode}
            onChange={(e) => handleSettingChange('appearance', 'compact_mode', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  )

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">自动备份</h3>
          <p className="text-sm text-gray-500">定期自动备份您的数据</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.data.auto_backup}
            onChange={(e) => handleSettingChange('data', 'auto_backup', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          备份频率
        </label>
        <select
          value={settings.data.backup_frequency}
          onChange={(e) => handleSettingChange('data', 'backup_frequency', e.target.value)}
          disabled={!settings.data.auto_backup}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="daily">每日</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          数据保留期（天）
        </label>
        <input
          type="number"
          min="30"
          max="365"
          value={settings.data.data_retention}
          onChange={(e) => handleSettingChange('data', 'data_retention', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          默认导出格式
        </label>
        <select
          value={settings.data.export_format}
          onChange={(e) => handleSettingChange('data', 'export_format', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xlsx">Excel</option>
        </select>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">双因素认证</h3>
          <p className="text-sm text-gray-500">增强账户安全性</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.security.two_factor_auth}
            onChange={(e) => handleSettingChange('security', 'two_factor_auth', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          会话超时（分钟）
        </label>
        <input
          type="number"
          min="5"
          max="480"
          value={settings.security.session_timeout}
          onChange={(e) => handleSettingChange('security', 'session_timeout', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          密码过期时间（天）
        </label>
        <input
          type="number"
          min="30"
          max="365"
          value={settings.security.password_expiry}
          onChange={(e) => handleSettingChange('security', 'password_expiry', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">登录通知</h3>
          <p className="text-sm text-gray-500">新设备登录时发送通知</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.security.login_notifications}
            onChange={(e) => handleSettingChange('security', 'login_notifications', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  )

  const renderIntegrationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">日历同步</h3>
          <p className="text-sm text-gray-500">与外部日历应用同步</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.integration.calendar_sync}
            onChange={(e) => handleSettingChange('integration', 'calendar_sync', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">邮件集成</h3>
          <p className="text-sm text-gray-500">通过邮件创建任务</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.integration.email_integration}
            onChange={(e) => handleSettingChange('integration', 'email_integration', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Slack 通知</h3>
          <p className="text-sm text-gray-500">发送通知到 Slack</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.integration.slack_notifications}
            onChange={(e) => handleSettingChange('integration', 'slack_notifications', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Webhook URL
        </label>
        <input
          type="url"
          value={settings.integration.webhook_url}
          onChange={(e) => handleSettingChange('integration', 'webhook_url', e.target.value)}
          placeholder="https://your-webhook-url.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">用于接收系统事件通知</p>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileSettings()
      case 'notifications': return renderNotificationSettings()
      case 'appearance': return renderAppearanceSettings()
      case 'data': return renderDataSettings()
      case 'security': return renderSecuritySettings()
      case 'integration': return renderIntegrationSettings()
      default: return null
    }
  }

  return (
    <div className={cn(
      'min-h-screen bg-gray-50',
      isMobile ? 'p-4' : 'p-6'
    )}>
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className={cn(
          'flex justify-between items-center',
          isMobile ? 'mb-6' : 'mb-8'
        )}>
          <div className="flex items-center gap-3">
            <SettingsIcon className={cn(
              'text-gray-600',
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            )} />
            <h1 className={cn(
              'font-bold text-gray-900',
              isMobile ? 'text-2xl' : 'text-3xl'
            )}>系统设置</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {saved && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">设置已保存</span>
              </div>
            )}
            
            <button
              onClick={handleReset}
              className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              title="重置设置"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>

        <div className={cn(
          'flex',
          isMobile ? 'flex-col gap-4' : 'gap-8'
        )}>
          {/* 侧边栏导航 */}
          <div className={cn(
            'flex-shrink-0',
            isMobile ? 'w-full' : 'w-64'
          )}>
            <div className="bg-white rounded-lg shadow p-4">
              <nav className={cn(
                isMobile ? 'flex overflow-x-auto space-x-2 pb-2' : 'space-y-2'
              )}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isMobile ? 'flex-shrink-0 whitespace-nowrap' : 'w-full text-left',
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {React.cloneElement(tab.icon, {
                      className: cn(
                        tab.icon.props.className,
                        isMobile ? 'w-4 h-4' : 'w-4 h-4'
                      )
                    })}
                    <span className={cn(
                      'font-medium',
                      isMobile ? 'text-sm' : ''
                    )}>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="flex-1">
            <div className={cn(
              'bg-white rounded-lg shadow',
              isMobile ? 'p-4' : 'p-8'
            )}>
              <div className={cn(
                isMobile ? 'mb-4' : 'mb-6'
              )}>
                <h2 className={cn(
                  'font-semibold text-gray-900',
                  isMobile ? 'text-lg' : 'text-xl'
                )}>
                  {tabs.find(tab => tab.id === activeTab)?.name}
                </h2>
                <p className={cn(
                  'text-gray-600 mt-1',
                  isMobile ? 'text-sm' : ''
                )}>
                  管理您的{tabs.find(tab => tab.id === activeTab)?.name.toLowerCase()}选项
                </p>
              </div>
              
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings