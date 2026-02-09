import React, { useState, useEffect } from 'react'
// 已移除所有图标导入以满足极简风格要求
import * as storyFollowUpService from '../services/storyFollowUpService'
import type { FollowUpRecord } from '../services/storyFollowUpService'
import { getStoriesBySubproject, updateStory, deleteStory, ProjectStory, UpdateStoryData, createStory } from '../services/storyService'
import { SubProject, Stakeholder } from '../types'
import { StakeholderService } from '../services/stakeholderService'
import StoryFormModal from './StoryFormModal'
import { Button } from './ui/button'
// 极简风格下不使用徽章组件
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import StakeholderPicker from './StakeholderPicker'

interface StoryDetailPageProps {
  subproject: SubProject
  onBack: () => void
}

export const StoryDetailPage: React.FC<StoryDetailPageProps> = ({ subproject, onBack }) => {
  const [stories, setStories] = useState<ProjectStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingStory, setEditingStory] = useState<ProjectStory | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [globalStakeholders, setGlobalStakeholders] = useState<Stakeholder[]>([])
  const [selectedStory, setSelectedStory] = useState<ProjectStory | null>(null)
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [actionDate, setActionDate] = useState('')
  const [fuContent, setFuContent] = useState('')
  const [fuSelectedIds, setFuSelectedIds] = useState<string[]>([])
  const [showStakeholderPicker, setShowStakeholderPicker] = useState(false)
  const [fuEventDate, setFuEventDate] = useState('')
  const [followUps, setFollowUps] = useState<Record<number, FollowUpRecord[]>>({})
  const [completeStoryId, setCompleteStoryId] = useState<number | null>(null)
  const [completeRemark, setCompleteRemark] = useState('')
  const [completeDate, setCompleteDate] = useState('')
  const [completeSelectedIds, setCompleteSelectedIds] = useState<string[]>([])
  const [showCompleteStakeholderPicker, setShowCompleteStakeholderPicker] = useState(false)
  const [completeRecordId, setCompleteRecordId] = useState<number | null>(null)
  const [editRemarkStoryId, setEditRemarkStoryId] = useState<number | null>(null)
  const [editRemarkText, setEditRemarkText] = useState('')
  const [editRemarkRecordId, setEditRemarkRecordId] = useState<number | null>(null)
  const [editRemarkCompletedDate, setEditRemarkCompletedDate] = useState('')
  const [editRemarkSelectedIds, setEditRemarkSelectedIds] = useState<string[]>([])
  const [showEditRemarkStakeholderPicker, setShowEditRemarkStakeholderPicker] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FollowUpRecord | null>(null)

  const toDateOnly = (val?: string) => {
    if (!val) return ''
    const s = String(val)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) return s.slice(0,10)
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear()
        const m = String(d.getMonth()+1).padStart(2,'0')
        const dd = String(d.getDate()).padStart(2,'0')
        return `${y}-${m}-${dd}`
      }
    } catch {}
    return s.slice(0,10)
  }

  useEffect(() => {
    loadData()
  }, [subproject.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 检查subproject是否有效
      if (!subproject || !subproject.id) {
        throw new Error('子项目信息无效')
      }
      
      // 加载故事数据（容错）
      let storiesData: ProjectStory[] = []
      try {
        storiesData = await getStoriesBySubproject(subproject.id)
      } catch (e) {
        console.warn('获取项目故事失败，使用空列表:', e)
        storiesData = []
      }
      
      // 加载干系人数据 - 添加安全检查
      let stakeholdersData: any[] = []
      if (subproject.project_id) {
        stakeholdersData = await StakeholderService.getStakeholders(subproject.project_id.toString(), { excludeResigned: true })
      } else if (subproject.parent_id) {
        // 如果没有project_id，尝试使用parent_id
        stakeholdersData = await StakeholderService.getStakeholders(subproject.parent_id.toString(), { excludeResigned: true })
      }
      
      setStories(storiesData)
      setStakeholders(stakeholdersData || [])
      // 预加载平台干系人供展示回退（全量）
      try {
        const all = await StakeholderService.getAllStakeholdersAll(200, false)
        setGlobalStakeholders(Array.isArray(all) ? all : [])
      } catch {}

      try {
        const fuMap: Record<number, FollowUpRecord[]> = {}
        await Promise.all(
          (storiesData || []).map(async (s) => {
            try {
              const { records } = await storyFollowUpService.getStoryFollowUpRecords(Number(s.id), 200, 0)
              const toDateOnly = (val?: string) => {
                if (!val) return ''
                const s = String(val)
                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
                if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) return s.slice(0,10)
                try {
                  const d = new Date(s)
                  if (!isNaN(d.getTime())) {
                    const y = d.getFullYear()
                    const m = String(d.getMonth()+1).padStart(2,'0')
                    const dd = String(d.getDate()).padStart(2,'0')
                    return `${y}-${m}-${dd}`
                  }
                } catch {}
                return s.slice(0,10)
              }
              const sorted = (records || []).slice().sort((a,b)=>{
                const da = toDateOnly(a.updated_at || a.event_date || a.created_at)
                const db = toDateOnly(b.updated_at || b.event_date || b.created_at)
                return db.localeCompare(da)
              })
              fuMap[Number(s.id)] = sorted
            } catch {
              fuMap[Number(s.id)] = []
            }
          })
        )
        setFollowUps(fuMap)
      } catch {}
    } catch (err) {
      console.error('加载数据失败:', err)
      setError(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 重新加载干系人数据
  const reloadStakeholders = async () => {
    try {
      let stakeholdersData: any[] = []
      if (subproject.project_id) {
        stakeholdersData = await StakeholderService.getStakeholders(subproject.project_id.toString(), { excludeResigned: true })
      } else if (subproject.parent_id) {
        stakeholdersData = await StakeholderService.getStakeholders(subproject.parent_id.toString(), { excludeResigned: true })
      }
      setStakeholders(stakeholdersData || [])
    } catch (err) {
      console.error('重新加载干系人失败:', err)
    }
  }

  // 格式化时间
  const formatTime = (timeStr: string): string => {
    if (!timeStr) return ''
    const s = String(timeStr)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y,m,d] = s.split('-');
      return `${y}/${m}/${d}`
    }
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) {
      const core = s.slice(0,10)
      const [y,m,d] = core.split('-')
      return `${y}/${m}/${d}`
    }
    try {
      const date = new Date(s)
      const y = date.getFullYear()
      const m = String(date.getMonth()+1).padStart(2,'0')
      const d = String(date.getDate()).padStart(2,'0')
      return `${y}/${m}/${d}`
    } catch {
      return s
    }
  }

  // 格式化相对时间
  const formatRelativeTime = (timeStr: string): string => {
    try {
      const date = new Date(timeStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
      return `${Math.floor(diffDays / 365)}年前`
    } catch {
      return ''
    }
  }

  const handleEditStory = (story: ProjectStory) => {
    setEditingStory(story)
  }

  const handleDeleteStory = async (storyId: number) => {
    if (!confirm('确定要删除这个故事吗？')) return
    
    try {
      await deleteStory(storyId)
      await loadData()
    } catch (err) {
      console.error('删除故事失败:', err)
      setError(err instanceof Error ? err.message : '删除故事失败')
    }
  }

  // 打开跟进设置对话框
  const openFollowUpDialog = (story: ProjectStory) => {
    setSelectedStory(story)
    setShowFollowUpDialog(true)
  }

  // 保存跟进设置
  // 已移除故事级提醒设置（统一使用记录级 action_date）



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-full">
      {/* 头部 */}
      <div className="bg-white border-b w-full">
        <div className="w-full px-0 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={onBack} className="text-gray-800 hover:text-black">返回</button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{subproject.name}</h1>
                <p className="text-sm text-gray-600">项目故事记录</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => setShowCreateForm(true)} className="btn btn-sm">登记项目故事</button>
              <div className="text-sm text-gray-500">
                共 {stories.length} 条故事记录
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="w-full px-0 py-0">
        {stories.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无故事记录</h3>
            <p className="text-gray-600">该子项目还没有任何故事记录</p>
          </div>
        ) : (
          <div className="relative">
            {/* 时间轴线 */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {/* 故事列表 */}
            <div className="space-y-8">
              {stories.map((story, index) => (
                <div key={story.id} className="relative flex items-start space-x-6">
                  {/* 时间轴节点 */}
                  <div className="flex-shrink-0 w-16 flex flex-col items-center">
                    <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-sm z-10"></div>
                    {index < stories.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                    )}
                  </div>
                  
                  {/* 故事内容卡片 */}
                  <div className="flex-1 bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                    {/* 故事头部信息 */}
                     <div className="flex items-start justify-between mb-4">
                       <div className="flex-1">
                         {/* 故事标题 - 移到最顶部，更突出 */}
                         <div className="mb-3">
                           <h3 className="text-xl font-semibold text-gray-900 mb-2">
                             {story.story_name || '项目故事'}
                           </h3>
                         </div>
                         
                         <div className="text-sm text-gray-500">
                           <span>{formatTime(story.time)}</span>
                           {story.stakeholders && (
                             <span className="ml-4">
                               {Array.from(new Set((story.stakeholders || '').split(',').map(s => s.trim()).filter(Boolean))).map((stakeholderId, index) => {
                                 const sid = stakeholderId.trim()
                                 const stakeholder = stakeholders.find(s => String(s.id) === sid) || globalStakeholders.find(s => String(s.id) === sid)
                                 return stakeholder ? (
                                   <span key={sid}>
                                     {index > 0 && ', '}
                                     <span className="text-blue-600">{stakeholder.name}</span>
                                   </span>
                                 ) : null
                               })}
                             </span>
                           )}
                         </div>

                         {/* 故事内容 */}
                         <div className="mt-3">
                           <p className="text-gray-700 leading-relaxed">{story.content}</p>
                         </div>

                         {/* 最后更新时间 */}
                         <div className="mt-4 pt-3 border-t border-gray-100">
                           <div className="flex items-center justify-between text-xs text-gray-400">
                             <span>最后更新: {formatTime(story.updated_at)}</span>
                           </div>
                         </div>

                         <div className="mt-3 flex items-center space-x-2">
                          <button 
                            onClick={() => handleEditStory(story)}
                            className="px-4 py-2 text-sm border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                          >
                            编辑故事
                          </button>
                          <button 
                            onClick={() => handleDeleteStory(story.id)}
                            className="px-4 py-2 text-sm border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                          >
                            删除故事
                          </button>
                          <button
                            onClick={() => { setSelectedStory(story); setShowFollowUpDialog(true) }}
                            className="px-4 py-2 text-sm border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                          >
                            登记跟进
                          </button>
                         </div>

                         {followUps[Number(story.id)] && followUps[Number(story.id)].length > 0 && (
                           <div className="mt-4 border rounded bg-gray-50 p-3">
                             <div className="text-sm font-medium text-gray-700">跟进记录</div>
                             <div className="mt-2 space-y-3">
                               {followUps[Number(story.id)].map((rec, recIndex) => (
                                 <div key={rec.id} className="bg-white rounded border p-3">
                                  <div className="text-sm text-gray-900">{rec.content}</div>
                                  {rec.result && (
                                    <div className="mt-2 text-sm text-gray-700">备注: {rec.result}</div>
                                  )}
                                  {editRemarkStoryId === Number(story.id) && recIndex === 0 && (
                                    <div className="mt-2">
                                      <textarea
                                        className="w-full border rounded p-2 text-sm"
                                        rows={2}
                                        value={editRemarkText}
                                        onChange={(e) => setEditRemarkText(e.target.value)}
                                        placeholder="修改备注"
                                      />
                                      <div className="mt-2 flex items-center gap-2">
                                        <Input type="date" value={editRemarkCompletedDate} onChange={(e)=>setEditRemarkCompletedDate(e.target.value)} />
                                        <button
                                          className="px-2 py-1 text-xs border rounded"
                                          onClick={()=>{
                                            const source = (globalStakeholders && globalStakeholders.length > 0) ? globalStakeholders : stakeholders
                                            const names = String(rec.contact_person || '').split(',').map(s=>s.trim()).filter(Boolean)
                                            const ids = source.filter(s=> names.includes(String(s.name))).map(s=> String(s.id))
                                            setEditRemarkSelectedIds(ids)
                                            setShowEditRemarkStakeholderPicker(true)
                                            setEditRemarkRecordId(Number(rec.id))
                                          }}
                                        >选择干系人</button>
                                      </div>
                                      <div className="mt-2 flex items-center gap-2">
                                        <button
                                          className="px-3 py-1 text-sm border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                          onClick={() => { setEditRemarkStoryId(null); setEditRemarkRecordId(null); setEditRemarkText(''); setEditRemarkCompletedDate(''); setEditRemarkSelectedIds([]) }}
                                        >取消</button>
                                        <button
                                          className="px-3 py-1 text-sm border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                          onClick={async () => {
                                            try {
                                              const source = (globalStakeholders && globalStakeholders.length > 0) ? globalStakeholders : stakeholders
                                              const contact = source.filter(s=> editRemarkSelectedIds.includes(String(s.id))).map(s=> s.name).join(',')
                                              await storyFollowUpService.updateFollowUpRecord(Number(story.id), Number(rec.id), { result: editRemarkText.trim(), completed_at: editRemarkCompletedDate ? toDateOnly(editRemarkCompletedDate) : undefined, contact_person: contact })
                                              setEditRemarkStoryId(null); setEditRemarkRecordId(null); setEditRemarkText(''); setEditRemarkCompletedDate(''); setEditRemarkSelectedIds([])
                                              await loadData()
                                            } catch (err) {
                                              alert('修改备注失败')
                                            }
                                          }}
                                        >保存备注</button>
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-2 text-xs text-gray-600">
                                    {rec.contact_person && <span className="mr-4">干系人: {rec.contact_person}</span>}
                                    {toDateOnly(rec.event_date || rec.created_at) && <span className="mr-4">发生时间: {formatTime(toDateOnly(rec.event_date || rec.created_at))}</span>}
                                    {!rec.completed_at && rec.action_date && <span>下次跟进: {formatTime(rec.action_date)}</span>}
                                    {rec.completed_at && <span>完成时间: {formatTime(rec.completed_at)}</span>}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      className="px-2 py-1 text-xs border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                      onClick={() => {
                                        setSelectedStory(story)
                                        setEditingRecord(rec)
                                        setFuContent(rec.content || '')
                                        const source = (globalStakeholders && globalStakeholders.length > 0) ? globalStakeholders : stakeholders
                                        const names = String(rec.contact_person || '').split(',').map(s=>s.trim()).filter(Boolean)
                                        const ids = source.filter(s=> names.includes(String(s.name))).map(s=> String(s.id))
                                        setFuSelectedIds(ids)
                                        setFuEventDate(toDateOnly(rec.event_date))
                                        setActionDate(toDateOnly(rec.action_date))
                                        setShowFollowUpDialog(true)
                                      }}
                                    >编辑</button>
                                    {/* 已移除“取消跟进”按钮及其相关逻辑 */}
                                    <button
                                      className="px-2 py-1 text-xs border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                      onClick={async () => {
                                        try {
                                          if (!confirm('确定删除该跟进记录吗？')) return
                                          await storyFollowUpService.deleteStoryFollowUpRecord(Number(story.id), Number(rec.id))
                                          await loadData()
                                        } catch (err) {
                                          alert('删除跟进记录失败')
                                        }
                                      }}
                                    >删除</button>
                                    {rec.action_date && !rec.completed_at && (
                                      <button
                                        className="px-2 py-1 text-xs border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                        onClick={() => { setCompleteStoryId(Number(story.id)); setCompleteRecordId(Number(rec.id)); setCompleteRemark(''); setCompleteDate(new Date().toISOString().slice(0,10)) }}
                                      >标记完成</button>
                                    )}
                                    {rec.completed_at && (
                                      <button
                                        className="px-2 py-1 text-xs border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                        onClick={() => { setEditRemarkStoryId(Number(story.id)); setEditRemarkText(rec.result || '') }}
                                      >修改备注</button>
                                    )}
                                  </div>
                                   {completeRecordId === Number(rec.id) && (
                                     <div className="mt-2">
                                       <textarea
                                         className="w-full border rounded p-2 text-sm"
                                         rows={2}
                                         value={completeRemark}
                                         onChange={(e) => setCompleteRemark(e.target.value)}
                                         placeholder="完成备注（可选）"
                                       />
                                       <div className="mt-2">
                                        <Input type="date" value={completeDate} min={toDateOnly(rec.event_date || rec.created_at)} onChange={(e)=>setCompleteDate(e.target.value)} />
                                        <div className="mt-1 text-xs text-gray-500">完成时间可设置为当日日期（不早于事件发生日期或创建时间）</div>
                                        <button
                                          className="ml-2 px-2 py-1 text-xs border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                          onClick={() =>{
                                            const source = (globalStakeholders && globalStakeholders.length > 0) ? globalStakeholders : stakeholders
                                            const names = String(rec.contact_person || '').split(',').map(s=>s.trim()).filter(Boolean)
                                            const ids = source.filter(s=> names.includes(String(s.name))).map(s=> String(s.id))
                                            setCompleteSelectedIds(ids)
                                            setShowCompleteStakeholderPicker(true)
                                          }}
                                        >选择干系人</button>
                                       </div>
                                      <div className="mt-2 flex items-center gap-2">
                                        <button
                                          className="px-3 py-1 text-sm border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                          onClick={() => { setCompleteStoryId(null); setCompleteRecordId(null); setCompleteRemark('') }}
                                        >取消</button>
                                        <button
                                          className="px-3 py-1 text-sm border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors"
                                          onClick={async () => {
                                            try {
                                              const content = completeRemark.trim() || '完成'
                                              if (completeRecordId == null) { alert('未找到当前跟进记录'); return }
                                              if (!completeDate) { alert('请填写完成时间'); return }
                                              const source = (globalStakeholders && globalStakeholders.length > 0) ? globalStakeholders : stakeholders
                                              const contact = source.filter(s=> completeSelectedIds.includes(String(s.id))).map(s=> s.name).join(',')
                                              const createdOnly = toDateOnly(rec.created_at)
                                              const completedOnly = toDateOnly(completeDate)
                                              const eventOnly = toDateOnly(rec.event_date)
                                              const baseOnly = eventOnly || createdOnly
                                              if (completedOnly && baseOnly && completedOnly < baseOnly) { alert('完成时间不得早于事件发生日期或任务创建时间'); return }
                                              await storyFollowUpService.updateFollowUpRecord(Number(story.id), Number(completeRecordId), { result: content, completed_at: completedOnly, contact_person: contact })
                                               setCompleteStoryId(null); setCompleteRecordId(null); setCompleteRemark('')
                                               await loadData()
                                             } catch (err) {
                                               alert('标记完成失败')
                                               console.error('标记完成失败:', err)
                                             }
                                          }}
                                         >完成</button>
                                      </div>
                                     </div>
                                   )}
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                       
                      
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
         )}
       </div>

      {/* 编辑故事模态框 */}
      {editingStory && (
        <StoryFormModal
          isOpen={true}
          mode="edit"
          story={editingStory}
          subproject={subproject}
          stakeholders={stakeholders}
          projectId={subproject.project_id || subproject.parent_id?.toString() || ''}
          onCancel={() => setEditingStory(null)}
          onSubmit={async (storyData) => {
            await updateStory(editingStory.id, {
              story_name: storyData.story_name,
              time: storyData.time,
              stakeholders: Array.isArray(storyData.stakeholders) ? storyData.stakeholders.join(',') : storyData.stakeholders,
              content: storyData.content
            })
            
            // 更新本地状态
            setStories(stories.map(s => 
              s.id === editingStory.id 
                ? { ...s, story_name: storyData.story_name, time: storyData.time, stakeholders: Array.isArray(storyData.stakeholders) ? storyData.stakeholders.join(',') : storyData.stakeholders, content: storyData.content, updated_at: new Date().toISOString() }
                : s
            ))
            
            setEditingStory(null)
          }}
        />
      )}

      {/* 创建故事模态框 */}
      {showCreateForm && (
        <StoryFormModal
          isOpen={true}
          mode="create"
          subproject={subproject}
          stakeholders={stakeholders}
          projectId={subproject.project_id || subproject.parent_id?.toString() || ''}
          onCancel={() => setShowCreateForm(false)}
          onSubmit={async (storyData) => {
            try {
              await createStory({
                subproject_id: Number(subproject.id),
                story_name: storyData.story_name,
                time: storyData.time,
                stakeholders: storyData.stakeholders.join(','),
                content: storyData.content,
              })
              console.log('项目故事登记成功')
              setShowCreateForm(false)
              await loadData() // 重新加载数据
            } catch (error) {
              console.error('登记项目故事失败:', error)
              alert('登记项目故事失败: ' + (error as Error).message)
            }
          }}
        />
      )}

      {/* 跟进设置对话框（与项目集登记框字段一致） */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{editingRecord ? '编辑跟进' : '登记跟进'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="block mb-2">故事: {selectedStory?.story_name}</Label>
            </div>
            
            <div>
              <Label className="block mb-2">跟进内容</Label>
              <textarea className="w-full border rounded p-2" rows={4} value={fuContent} onChange={(e)=>setFuContent(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">干系人</Label>
                <button
                  type="button"
                  className="px-3 py-2 border rounded w-full text-left"
                  onClick={()=>setShowStakeholderPicker(true)}
                >
                  {fuSelectedIds.length === 0 ? '请选择干系人' : `已选 ${fuSelectedIds.length} 人`}
                </button>
              </div>
              <div>
                <Label className="block mb-2">事件发生时间（年月日）</Label>
                <Input type="date" value={fuEventDate} onChange={(e)=>setFuEventDate(e.target.value)} />
              </div>
            </div>

                  <div>
                    <Label htmlFor="actionDate" className="block mb-2">下次跟进时间（仅该记录）</Label>
                    <Input id="actionDate" type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} className="w-full" />
                  </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFollowUpDialog(false); setSelectedStory(null); setEditingRecord(null); setFuContent(''); setFuSelectedIds([]); setFuEventDate(''); setActionDate('') }}>
              取消
            </Button>
            <Button onClick={async ()=>{
              if (!selectedStory) return
              if (!fuContent.trim()) { alert('请填写跟进内容'); return }
              
              if (!fuEventDate) { alert('请选择事件发生时间'); return }
              try {
                const source = (globalStakeholders && globalStakeholders.length > 0) ? globalStakeholders : stakeholders
                const contact = source
                  .filter(s=> fuSelectedIds.includes(String(s.id)))
                  .map(s=> s.name)
                  .join(',')
                const eventDate = toDateOnly(fuEventDate)
                const action_date = editingRecord 
                  ? (actionDate ? toDateOnly(actionDate) : null) 
                  : (actionDate ? toDateOnly(actionDate) : undefined)
                if (editingRecord) {
                  await storyFollowUpService.updateFollowUpRecord(Number(selectedStory.id), Number(editingRecord.id), {
                    content: fuContent,
                    follow_up_type: 'progress',
                    contact_person: contact || undefined,
                    contact_method: '',
                    result: editingRecord.result || '',
                    next_action: editingRecord.next_action || '',
                    event_date: eventDate,
                    action_date,
                  })
                } else {
                  await storyFollowUpService.createFollowUpRecord(Number(selectedStory.id), {
                    content: fuContent,
                    follow_up_type: 'progress',
                    contact_person: contact || undefined,
                    contact_method: '',
                    result: '',
                    next_action: '',
                    event_date: eventDate,
                    action_date,
                  })
                }
                setShowFollowUpDialog(false)
                setSelectedStory(null)
                setEditingRecord(null)
                setFuContent(''); setFuSelectedIds([]); setFuEventDate(''); setActionDate('')
                await loadData()
              } catch (err) {
                console.error('登记跟进失败:', err)
                alert('登记跟进失败，请重试')
              }
            }}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StakeholderPicker
        open={showStakeholderPicker}
        title="选择平台内的干系人"
        stakeholders={(globalStakeholders && globalStakeholders.length > 0 ? globalStakeholders : stakeholders).map(s=>({id:s.id, name:s.name, role:s.role, company:(s as any).company}))}
        selectedIds={fuSelectedIds}
        onChange={(next)=>setFuSelectedIds(next)}
        onClose={()=>setShowStakeholderPicker(false)}
        onConfirm={()=>setShowStakeholderPicker(false)}
      />

      <StakeholderPicker
        open={showCompleteStakeholderPicker}
        title="选择完成干系人"
        stakeholders={(globalStakeholders && globalStakeholders.length > 0 ? globalStakeholders : stakeholders).map(s=>({id:s.id, name:s.name, role:s.role, company:(s as any).company}))}
        selectedIds={completeSelectedIds}
        onChange={(next)=>setCompleteSelectedIds(next)}
        onClose={()=>setShowCompleteStakeholderPicker(false)}
        onConfirm={()=>setShowCompleteStakeholderPicker(false)}
      />
    </div>
  )
}
