import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StorylineService } from '../services/storylineService'
import { StakeholderService } from '../services/stakeholderService'
import StakeholderPicker from '../components/StakeholderPicker'
import { MessageSquare } from 'lucide-react'

const StorylineFollowUpHistory: React.FC = () => {
  const { projectId, id } = useParams<{ projectId: string; id: string }>()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storyline, setStoryline] = useState<any | null>(null)
  const [editRemarkRecordId, setEditRemarkRecordId] = useState<number | null>(null)
  const [editRemarkText, setEditRemarkText] = useState<string>('')
  const [editRemarkCompletedDate, setEditRemarkCompletedDate] = useState<string>('')
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState<string>('')
  const [editingEventDate, setEditingEventDate] = useState<string>('')
  const [editingNextDate, setEditingNextDate] = useState<string>('')
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([])
  const [showEditStakeholderPicker, setShowEditStakeholderPicker] = useState<boolean>(false)
  const [showFUDialog, setShowFUDialog] = useState<boolean>(false)
  const [fuContent, setFuContent] = useState<string>('')
  const [fuEventDate, setFuEventDate] = useState<string>('')
  const [fuNextDate, setFuNextDate] = useState<string>('')
  const [fuSelectedIds, setFuSelectedIds] = useState<string[]>([])
  const [stakeholders, setStakeholders] = useState<any[]>([])
  const [showStakeholderPicker, setShowStakeholderPicker] = useState<boolean>(false)

  const handleDelete = async (recordId: number) => {
    if (!projectId || !id) return
    if (!confirm('确定删除该跟进记录吗？')) return
    try {
      await StorylineService.deleteFollowUpRecord(projectId, id, recordId)
      const r = await StorylineService.getFollowUpRecords(projectId, id, 50, 0)
      const list = Array.isArray((r as any)?.data) ? (r as any).data : (Array.isArray((r as any)?.records) ? (r as any).records : [])
      setRecords(list)
    } catch (e: any) {
      alert(e?.message || '删除失败')
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        if (projectId && id) {
          const r = await StorylineService.getFollowUpRecords(projectId, id, 50, 0)
          const list = Array.isArray((r as any)?.data) ? (r as any).data : (Array.isArray((r as any)?.records) ? (r as any).records : [])
          setRecords(list)
          try {
            const detail = await StorylineService.getStorylineById(projectId, id)
            setStoryline(detail)
          } catch {}
          try {
            const s = await StakeholderService.getAllStakeholdersAll(200, false)
            setStakeholders(Array.isArray(s) ? s : [])
          } catch {}
        }
      } catch (e: any) {
        setError(e?.message || '加载跟进记录失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, id])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">故事线跟进记录</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              onClick={() => { if (projectId) window.location.href = `/projects/${projectId}` }}
            >返回项目详情</button>
            <button
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              onClick={() => { setShowFUDialog(true); setFuContent(''); setFuEventDate(''); setFuSelectedIds([]) }}
            >登记跟进</button>
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 p-3">{error}</div>
        )}
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-600">暂无跟进记录</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {records.map((record, idx) => (
              <div key={record.id} className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items中心 gap-2">
                    <div className="text-sm text-gray-500">{new Date(record.created_at).toLocaleString('zh-CN')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {record.event_date && (
                      <div className="text-sm text-gray-500">事件时间: {new Date(record.event_date).toLocaleDateString()}</div>
                    )}
                    {!record.completed_at && record.action_date && (
                      <div className="text-sm text-gray-500">下次跟进: {new Date(record.action_date).toLocaleDateString()}</div>
                    )}
                    {record.completed_at && (
                      <div className="text-sm text-gray-500">完成时间: {new Date(record.completed_at).toLocaleDateString()}</div>
                    )}
                    {!record.completed_at && (
                      <button
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded"
                        onClick={() => { setEditRemarkRecordId(record.id); setEditRemarkText(record.result || '') }}
                      >标记完成</button>
                    )}
                    {record.completed_at && idx === 0 && (
                      <button
                        className="px-2 py-1 text-xs bg-gray-600 text-white rounded"
                        onClick={() => { setEditRemarkRecordId(record.id); setEditRemarkText(record.result || '') }}
                      >修改备注</button>
                    )}
                    <button
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded"
                      onClick={() => {
                        setEditingRecordId(record.id)
                        setEditingContent(record.content || '')
                        const d = record.event_date ? new Date(record.event_date) : null
                        setEditingEventDate(d ? new Date(d).toISOString().slice(0,10) : '')
                        setEditingNextDate(record.action_date ? String(record.action_date).slice(0,10) : '')
                        const names = String(record.contact_person || '').split(',')
                        const selected = (stakeholders || []).filter(s => names.includes(s.name)).map(s => String(s.id))
                        setEditSelectedIds(selected)
                      }}
                    >修改</button>
                    <button
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                      onClick={() => handleDelete(record.id)}
                    >删除</button>
                  </div>
                </div>
                {editingRecordId === record.id ? (
                  <div className="space-y-3">
                    <textarea className="w-full border rounded p-2 text-sm" rows={3} value={editingContent} onChange={(e)=>setEditingContent(e.target.value)} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">干系人</label>
                        <button type="button" className="px-3 py-2 border rounded w-full text-left" onClick={()=>setShowEditStakeholderPicker(true)}>
                          {editSelectedIds.length === 0 ? '请选择干系人' : `已选 ${editSelectedIds.length} 人`}
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">事件发生时间</label>
                        <input type="date" className="w-full border rounded p-2" value={editingEventDate} onChange={(e)=>setEditingEventDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">下次跟进日期</label>
                        <input type="date" className="w-full border rounded p-2" value={editingNextDate} onChange={(e)=>setEditingNextDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded" onClick={()=>{setEditingRecordId(null); setEditingContent(''); setEditSelectedIds([]); setEditingEventDate(''); setEditingNextDate('')}}>取消</button>
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded" onClick={async ()=>{
                        try {
                          if (!projectId || !id) return
                          const contact = (stakeholders || []).filter(s=> editSelectedIds.includes(String(s.id))).map(s=> s.name).join(',')
                          await StorylineService.updateFollowUpRecord(projectId, id, record.id, {
                            content: editingContent.trim(),
                            event_date: editingEventDate || undefined,
                            contact_person: contact || undefined,
                            action_date: editingNextDate || undefined,
                          })
                          setEditingRecordId(null); setEditingContent(''); setEditSelectedIds([]); setEditingEventDate(''); setEditingNextDate('')
                          const r = await StorylineService.getFollowUpRecords(projectId, id, 50, 0)
                          const list = Array.isArray((r as any)?.data) ? (r as any).data : (Array.isArray((r as any)?.records) ? (r as any).records : [])
                          setRecords(list)
                          const detail = await StorylineService.getStorylineById(projectId, id)
                          setStoryline(detail)
                        } catch (err) { alert('更新内容失败') }
                      }}>保存</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-900">{record.content}</div>
                )}
                {record.result && (
                  <div className="text-sm text-gray-700 mt-1">备注: {record.result}</div>
                )}
                {editRemarkRecordId === record.id && (
                  <div className="mt-2">
                    <textarea
                      className="w-full border rounded p-2 text-sm"
                      rows={2}
                      value={editRemarkText}
                      onChange={(e) => setEditRemarkText(e.target.value)}
                      placeholder="填写或修改备注"
                    />
                    <div className="mt-2">
                      <input type="date" className="w-full border rounded p-2 text-sm" value={editRemarkCompletedDate} onChange={(e)=>setEditRemarkCompletedDate(e.target.value)} />
                      <div className="text-xs text-gray-500 mt-1">完成时间不早于事件发生日期或记录创建时间</div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded"
                        onClick={() => { setEditRemarkRecordId(null); setEditRemarkText(''); setEditRemarkCompletedDate('') }}
                      >取消</button>
                      <button
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                        onClick={async () => {
                          try {
                            if (!projectId || !id) return
                            if (editRemarkRecordId) {
                              await StorylineService.updateFollowUpRecord(projectId, id, editRemarkRecordId, { result: editRemarkText.trim(), completed_at: editRemarkCompletedDate || new Date().toISOString().slice(0,10) })
                            }
                            const r = await StorylineService.getFollowUpRecords(projectId, id, 50, 0)
                            const list = Array.isArray((r as any)?.data) ? (r as any).data : (Array.isArray((r as any)?.records) ? (r as any).records : [])
                            setRecords(list)
                            const detail = await StorylineService.getStorylineById(projectId, id)
                            setStoryline(detail)
                            setEditRemarkRecordId(null)
                            setEditRemarkText('')
                            setEditRemarkCompletedDate('')
                          } catch (err) {
                            alert('保存备注/完成操作失败')
                          }
                        }}
                      >保存</button>
                    </div>
                  </div>
                )}
                {record.contact_person && (
                  <div className="text-sm text-gray-500 mt-1">干系人: {record.contact_person}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {showFUDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">登记跟进（故事线）</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">跟进内容</label>
                <textarea className="w-full border rounded p-2" rows={4} value={fuContent} onChange={(e)=>setFuContent(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">干系人</label>
                  <button type="button" className="px-3 py-2 border rounded w-full text-left" onClick={()=>setShowStakeholderPicker(true)}>
                    {fuSelectedIds.length === 0 ? '请选择干系人' : `已选 ${fuSelectedIds.length} 人`}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">事件发生时间（年月日）</label>
                  <input type="date" className="w-full border rounded p-2" value={fuEventDate} onChange={(e)=>setFuEventDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">下次跟进日期（年月日）</label>
                  <input type="date" className="w-full border rounded p-2" value={fuNextDate} onChange={(e)=>setFuNextDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50" onClick={()=>setShowFUDialog(false)}>取消</button>
              <button className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={async ()=>{
                if (!projectId || !id) return
                if (!fuContent.trim()) { alert('请填写跟进内容'); return }
                if (!fuEventDate) { alert('请选择事件发生时间'); return }
                try {
                  const contact = stakeholders.filter(s=> fuSelectedIds.includes(String(s.id))).map(s=> s.name).join(',')
                  await StorylineService.createFollowUpRecord(projectId, id, {
                    content: fuContent,
                    contact_person: contact || undefined,
                    event_date: fuEventDate,
                    action_date: fuNextDate || undefined,
                  })
                  setShowFUDialog(false)
                  setFuContent(''); setFuSelectedIds([]); setFuEventDate(''); setFuNextDate('')
                  const r = await StorylineService.getFollowUpRecords(projectId, id, 50, 0)
                  const list = Array.isArray((r as any)?.data) ? (r as any).data : (Array.isArray((r as any)?.records) ? (r as any).records : [])
                  setRecords(list)
                } catch (err) {
                  console.error('登记跟进失败:', err)
                  alert('登记跟进失败，请重试')
                }
              }}>保存</button>
            </div>
          </div>
        </div>
      )}

      <StakeholderPicker
        open={showStakeholderPicker}
        title="选择平台内的干系人"
        stakeholders={(stakeholders || []).map(s=>({id:s.id, name:s.name, role:s.role, company:(s as any).company}))}
        selectedIds={fuSelectedIds}
        onChange={(next)=>setFuSelectedIds(next)}
        onClose={()=>setShowStakeholderPicker(false)}
        onConfirm={()=>setShowStakeholderPicker(false)}
      />
      <StakeholderPicker
        open={showEditStakeholderPicker}
        title="选择平台内的干系人"
        stakeholders={(stakeholders || []).map(s=>({id:s.id, name:s.name, role:s.role, company:(s as any).company}))}
        selectedIds={editSelectedIds}
        onChange={(next)=>setEditSelectedIds(next)}
        onClose={()=>setShowEditStakeholderPicker(false)}
        onConfirm={()=>setShowEditStakeholderPicker(false)}
      />
    </div>
  )
}

export default StorylineFollowUpHistory
