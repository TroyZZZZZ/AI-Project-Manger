import React, { useMemo, useState } from 'react'

export interface PickerStakeholder {
  id: string | number
  name: string
  role?: string
  company?: string
}

interface StakeholderPickerProps {
  open: boolean
  title?: string
  stakeholders: PickerStakeholder[]
  selectedIds: string[]
  onChange: (next: string[]) => void
  onClose: () => void
  onConfirm: () => void
}

const StakeholderPicker: React.FC<StakeholderPickerProps> = ({ open, title = '选择平台内的干系人', stakeholders, selectedIds, onChange, onClose, onConfirm }) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return stakeholders
    return stakeholders.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q) ||
      (s.company || '').toLowerCase().includes(q)
    )
  }, [query, stakeholders])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-base font-semibold text-gray-900">{title}</h4>
          <button type="button" className="text-gray-500 hover:text-gray-700" aria-label="关闭" onClick={onClose}>×</button>
        </div>

        <div className="mb-3">
          <input
            type="text"
            placeholder="搜索干系人（姓名/角色/公司）"
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
          />
        </div>

        <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-[55vh] overflow-y-auto">
          {filtered.map(s => {
            const idStr = String(s.id)
            const checked = selectedIds.includes(idStr)
            return (
              <label key={idStr} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{s.name}</div>
                  <div className="text-xs text-gray-500 truncate">{[s.role, s.company].filter(Boolean).join(' · ')}</div>
                </div>
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                  checked={checked}
                  onChange={(e)=>{
                    onChange((prev => {
                      const set = new Set(prev)
                      if (e.target.checked) set.add(idStr); else set.delete(idStr)
                      return Array.from(set)
                    })(selectedIds))
                  }}
                />
              </label>
            )
          })}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50" onClick={onClose}>取消</button>
          <button type="button" className="px-4 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-900/90" onClick={onConfirm}>确认选择</button>
        </div>
      </div>
    </div>
  )
}

export default StakeholderPicker
