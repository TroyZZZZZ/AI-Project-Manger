import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Pause,
  Square,
  Zap,
  Coffee,
  Folder,
  Edit2,
  Clock,
  Trophy,
  ChevronRight,
  X,
  ChevronLeft,
  Calendar as CalendarIcon
} from 'lucide-react'
import { EfficiencyService } from '../services/efficiencyService'
import { ProjectService, Project } from '../services/projectService'
import { StorylineService } from '../services/storylineService'
import * as StoryFollowUpService from '../services/storyFollowUpService'
import { TaskSource, WorkLog } from '../types'
import { cn } from '../utils/cn'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDate
} from 'date-fns'

// --- Utility Functions ---

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${secs}`
}

const formatDurationDetailed = (hours: number) => {
  if (!hours) return '0小时0分钟0秒'
  const totalSeconds = Math.round(hours * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}小时${m}分钟${s}秒`
}

const formatSourceType = (type: string) => {
  if (type === 'project_story') return '项目故事'
  if (type === 'storyline') return '项目集故事'
  if (type === 'follow_up') return '跟进事项'
  return '任务来源'
}

// --- Components ---

// 1. Confetti Effect (Ported from Prototype)
const triggerConfetti = () => {
  const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#6366F1']
  for (let i = 0; i < 50; i++) {
    const conf = document.createElement('div')
    conf.className = 'fixed w-2.5 h-2.5 z-50 animate-confetti-fall'
    conf.style.left = Math.random() * 100 + 'vw'
    conf.style.top = '-10px'
    conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    conf.style.animation = `confetti-fall ${Math.random() * 2 + 1}s linear forwards`
    document.body.appendChild(conf)
    setTimeout(() => conf.remove(), 3000)
  }
}

// Add CSS for confetti if not exists (Injected via style tag for now to ensure it works without global css edit)
const ConfettiStyle = () => (
  <style>{`
    @keyframes confetti-fall {
      0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
    }
  `}</style>
)

interface SuspendedTask {
  id: string
  projectId: string
  sourceType: string
  sourceId: string
  description: string
  elapsedSeconds: number
  projectName?: string
  storyId?: string
}

const Efficiency: React.FC = () => {
  const navigate = useNavigate()
  // --- State Management ---
  // Data State
  const [projects, setProjects] = useState<Project[]>([])
  const [taskSources, setTaskSources] = useState<TaskSource[]>([])
  const [loading, setLoading] = useState(false)

  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [originalStartedAt, setOriginalStartedAt] = useState<Date | null>(null)
  const [baseSeconds, setBaseSeconds] = useState(0) // Seconds accumulated before current session
  
  // Active Task Form
  const [activeTask, setActiveTask] = useState({
    projectId: '',
    sourceType: '',
    sourceId: '',
    description: '',
    title: '未命名任务',
    storyId: ''
  })

  // Task Stack (Suspended Tasks)
  const [suspendedTasks, setSuspendedTasks] = useState<SuspendedTask[]>([])

  // UI State
  const [showInterruptModal, setShowInterruptModal] = useState(false)
  const [showStopModal, setShowStopModal] = useState(false)
  const [showGoalToast, setShowGoalToast] = useState(false)
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null)
  const [editForm, setEditForm] = useState({
    startTime: '',
    endTime: '',
  })
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)

  // Modal Form State
  const [modalSourceType, setModalSourceType] = useState<'project' | 'program' | 'followup'>('project')
  const [storyCategory, setStoryCategory] = useState<'program' | 'subproject' | null>(null)
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string>('')
  const [selectedStoryKey, setSelectedStoryKey] = useState<string>('')
  const [modalForm, setModalForm] = useState({
    projectId: '',
    sourceId: '', // Maps to TaskSource.source_id
    description: '' // Used as task title/name
  })

  // Stop Modal State
  const [stopForm, setStopForm] = useState({
    startTime: '',
    endTime: '',
    description: '',
    markCompleted: false,
    completionDate: format(new Date(), 'yyyy-MM-dd'),
    completionRemarks: '',
    addNewFollowUp: false,
    newFollowUpContent: '',
    newFollowUpDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  })
  
  const [subprojectsList, setSubprojectsList] = useState<Project[]>([])

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [monthLogs, setMonthLogs] = useState<WorkLog[]>([])

  const intervalRef = useRef<number | null>(null)
  
  // --- Persistence Logic ---
  const [isRestored, setIsRestored] = useState(false)

  // 1. Restore Logic (Boot)
  useEffect(() => {
    // Restore Suspended
    const savedSuspended = localStorage.getItem('efficiency_suspended_tasks')
    if (savedSuspended) {
      try {
        setSuspendedTasks(JSON.parse(savedSuspended))
      } catch (e) {
        console.error('Failed to restore suspended tasks', e)
      }
    }

    // Restore Active
    const savedState = localStorage.getItem('efficiency_timer_state')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.activeTask && parsed.activeTask.projectId) {
          setActiveTask({
            ...parsed.activeTask,
            storyId: parsed.activeTask.storyId || ''
          })
          setStartedAt(parsed.startedAt ? new Date(parsed.startedAt) : null)
          setOriginalStartedAt(parsed.originalStartedAt ? new Date(parsed.originalStartedAt) : (parsed.startedAt ? new Date(parsed.startedAt) : null))
          setIsPaused(parsed.isPaused)
          setIsRunning(true) // Always resume if task exists
          
          const base = parsed.baseSeconds || parsed.elapsedSeconds || 0
          setBaseSeconds(base)

          if (!parsed.isPaused && parsed.startedAt) {
            const start = new Date(parsed.startedAt).getTime()
            const now = Date.now()
            const diff = Math.floor((now - start) / 1000)
            setElapsedSeconds(base + diff)
          } else {
            setElapsedSeconds(base)
          }
        }
      } catch (e) {
        console.error('Failed to restore timer state', e)
      }
    }

    setIsRestored(true)
  }, [])

  // 2. Save Logic (Gated by isRestored)
  useEffect(() => {
    if (!isRestored) return
    localStorage.setItem('efficiency_suspended_tasks', JSON.stringify(suspendedTasks))
  }, [suspendedTasks, isRestored])

  useEffect(() => {
    if (!isRestored) return

    if (activeTask.projectId) {
      const state = {
        activeTask,
        startedAt: startedAt?.toISOString(),
        originalStartedAt: originalStartedAt?.toISOString(),
        isPaused,
        isRunning,
        elapsedSeconds, // Snapshot for reference
        baseSeconds, // IMPORTANT: Persist base seconds
        lastUpdated: Date.now()
      }
      localStorage.setItem('efficiency_timer_state', JSON.stringify(state))
    } else {
      localStorage.removeItem('efficiency_timer_state')
    }
  }, [activeTask, startedAt, originalStartedAt, isPaused, isRunning, elapsedSeconds, baseSeconds, isRestored])

  // Load Calendar Data
  const fetchMonthLogs = useCallback(async () => {
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    try {
      const res = await EfficiencyService.getWorkLogs({ 
        start_date: start, 
        end_date: end, 
        limit: 1000 
      })
      setMonthLogs(res.data)
    } catch (e) {
      console.error('Failed to load month logs', e)
    }
  }, [currentDate])

  useEffect(() => {
    fetchMonthLogs()
  }, [fetchMonthLogs])

  // --- Data Loading ---

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Fetch 100 projects to ensure all active projects are listed
      const projRes = await ProjectService.getProjects({}, 1, 100)
      setProjects(projRes.data)
      
      // Fetch task sources to update follow-up list
      const sources = await EfficiencyService.getTaskSources()
      setTaskSources(sources)

      await fetchMonthLogs()
    } catch (error) {
      console.error('Failed to load data', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Load Task Sources based on Modal Selection
  useEffect(() => {
    const fetchSources = async () => {
      // Fetch all sources to ensure subprojects are visible even if parent_id links are broken in DB
      const sources = await EfficiencyService.getTaskSources()
      setTaskSources(sources)

      // Fetch Subprojects if projectId is selected
      if (modalForm.projectId) {
         const subs = await ProjectService.getSubprojects(Number(modalForm.projectId))
         setSubprojectsList(subs)
      } else {
         setSubprojectsList([])
      }
      
      // Reset selections when project changes
      setSelectedStoryKey('')
      setStoryCategory(null)
      setSelectedSubprojectId('')
      setModalForm(prev => ({ ...prev, sourceId: '' }))
    }
    fetchSources()
  }, [modalForm.projectId])

  // --- Timer Logic ---

  useEffect(() => {
    if (!isRunning || isPaused || !startedAt) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    // Initial update
    const updateTimer = () => {
      const now = Date.now()
      const start = startedAt.getTime()
      const diff = Math.floor((now - start) / 1000)
      setElapsedSeconds(baseSeconds + diff)
    }
    
    updateTimer() // Immediate update

    intervalRef.current = window.setInterval(updateTimer, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isPaused, startedAt, baseSeconds])



  // --- Handlers ---

  const handleStartNewTask = () => {
    // Open Modal in "New Task" mode (not interrupt)
    setModalForm({ projectId: '', sourceId: '', description: '' })
    setSelectedStoryKey('')
    setStoryCategory(null)
    setSelectedSubprojectId('')
    setShowInterruptModal(true)
  }

  const handleInterruptClick = () => {
    setShowInterruptModal(true)
  }

  const confirmStartTask = () => {
    // If currently running, suspend it
    if (isRunning || isPaused || activeTask.description) {
      const suspended: SuspendedTask = {
        id: Date.now().toString(),
        projectId: activeTask.projectId,
        sourceType: activeTask.sourceType,
        sourceId: activeTask.sourceId,
        description: activeTask.description, // title
        elapsedSeconds: elapsedSeconds,
        projectName: projects.find(p => p.id === Number(activeTask.projectId))?.name,
        storyId: activeTask.storyId
      }
      setSuspendedTasks(prev => [suspended, ...prev])
    }

    // Find selected source details
    const sourceTypeMap: Record<string, string> = {
      'project': 'project_story',
      'program': 'storyline',
      'followup': 'follow_up'
    }
    let targetSourceType = sourceTypeMap[modalSourceType] || 'project_story'
    
    // Auto-detect specific follow-up type if generic 'followup' is selected
    if (modalSourceType === 'followup') {
       const source = taskSources.find(s => s.source_id === Number(modalForm.sourceId) && (s.source_type === 'follow_up' || s.source_type === 'storyline_follow_up'))
       if (source) {
          targetSourceType = source.source_type
       }
    }

    const selectedSource = taskSources.find(s => s.source_id === Number(modalForm.sourceId) && s.source_type === targetSourceType)
    const taskTitle = selectedSource ? selectedSource.title : '未命名任务'

    // Start new task
    setActiveTask({
      projectId: selectedSource ? String(selectedSource.project_id) : modalForm.projectId,
      sourceType: targetSourceType,
      sourceId: modalForm.sourceId,
      description: taskTitle,
      title: taskTitle,
      storyId: selectedSource?.story_id ? String(selectedSource.story_id) : ''
    })
    setElapsedSeconds(0)
    setBaseSeconds(0)
    const now = new Date()
    setStartedAt(now)
    setOriginalStartedAt(now)
    setIsRunning(true)
    setIsPaused(false)
    setShowInterruptModal(false)
  }

  const handleResumeFromStack = (task: SuspendedTask) => {
    // Suspend current if exists
    if (isRunning || isPaused || activeTask.description) {
      const currentSuspended: SuspendedTask = {
        id: Date.now().toString(),
        projectId: activeTask.projectId,
        sourceType: activeTask.sourceType,
        sourceId: activeTask.sourceId,
        description: activeTask.description,
        elapsedSeconds: elapsedSeconds, // Current total elapsed
        projectName: projects.find(p => p.id === Number(activeTask.projectId))?.name
      }
      setSuspendedTasks(prev => [currentSuspended, ...prev])
    }

    // Restore task
    setActiveTask({
      projectId: task.projectId,
      sourceType: task.sourceType,
      sourceId: task.sourceId,
      description: task.description,
      title: task.description,
      storyId: task.storyId || ''
    })
    
    // IMPORTANT: When resuming, previous elapsed time becomes the base
    setBaseSeconds(task.elapsedSeconds)
    setElapsedSeconds(task.elapsedSeconds)
    setStartedAt(new Date()) // New segment start time
    // Note: We don't restore originalStartedAt from stack currently, could add to SuspendedTask interface if needed for audit
    // For now, let's just keep track of current session start
    
    setIsRunning(true)
    setIsPaused(false)

    // Remove from stack
    setSuspendedTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const handleStopTask = async () => {
    if (!activeTask.projectId) return // Should not happen

    setIsRunning(false)
    setIsPaused(false)
    
    // Open Stop Modal
    const now = new Date()
    // Default start time: Now - Duration (Approximation if original lost, or use original if valid)
    // If we have originalStartedAt, use it. Otherwise approximate.
    // Actually, accurate start time should be what we tracked.
    // If paused/resumed multiple times, "Start Time" is usually the FIRST start.
    // But "Duration" is sum of parts.
    // If we just default to [Now - Duration] -> Now, we ignore breaks, but it ensures duration matches time range.
    // If we default to [OriginalStart] -> Now, duration might be less than range (due to breaks).
    // Let's use OriginalStart -> Now, and Duration = elapsedSeconds.
    
    const startT = originalStartedAt || new Date(now.getTime() - elapsedSeconds * 1000)
    
    setStopForm({
      startTime: format(startT, 'HH:mm'),
      endTime: format(now, 'HH:mm'),
      description: activeTask.description || activeTask.title || '',
      markCompleted: false,
      completionDate: format(new Date(), 'yyyy-MM-dd'),
      completionRemarks: '',
      addNewFollowUp: false,
      newFollowUpContent: '',
      newFollowUpDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
    })
    setShowStopModal(true)
  }

  const handleConfirmStop = async () => {
    try {
      // Parse times
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      // Use ISO format for robust parsing
      const startDateTime = new Date(`${todayStr}T${stopForm.startTime}:00`)
      const endDateTime = new Date(`${todayStr}T${stopForm.endTime}:00`)
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid time format')
      }
      
      // Calculate duration from times? Or use elapsedSeconds?
      // User requirement: "manual modify start and end time"
      // Usually modifying times implies updating duration.
      let durationSeconds = (endDateTime.getTime() - startDateTime.getTime()) / 1000
      if (durationSeconds < 0) durationSeconds += 24 * 3600 // Handle cross-midnight? Assuming same day for now.
      
      let hoursSpent = Number((durationSeconds / 3600).toFixed(2))
      
      // Ensure minimum 0.01 hours (36 seconds) if duration is positive but small
      if (hoursSpent === 0 && durationSeconds > 0) {
        hoursSpent = 0.01
      }

      console.log('Submitting WorkLog:', {
        projectId: activeTask.projectId,
        sourceType: activeTask.sourceType,
        sourceId: activeTask.sourceId,
        hoursSpent,
        durationSeconds
      })
      
      if (hoursSpent > 0) {
        if (!activeTask.projectId || !activeTask.sourceId) {
          alert('任务信息不完整(项目或来源ID丢失)，无法保存')
          console.error('Missing task info:', activeTask)
          return
        }

        await EfficiencyService.createWorkLog({
          project_id: Number(activeTask.projectId),
          source_type: activeTask.sourceType || 'project_story',
          source_id: Number(activeTask.sourceId),
          description: stopForm.description,
          hours_spent: hoursSpent,
          work_date: todayStr, // Use dynamic todayStr
          started_at: startDateTime.toISOString(),
          ended_at: endDateTime.toISOString()
        })
        triggerConfetti()

        // Handle Mark as Completed
        if (stopForm.markCompleted && (activeTask.sourceType === 'storyline_follow_up' || activeTask.sourceType === 'follow_up')) {
          try {
             let storyId = activeTask.storyId

             // Fallback for legacy data or if storyId is missing
             if (!storyId) {
                // Try to find in current taskSources if loaded
                const source = taskSources.find(s => String(s.source_id) === String(activeTask.sourceId) && s.source_type === activeTask.sourceType)
                if (source && source.story_id) {
                    storyId = String(source.story_id)
                } else {
                    // Fetch sources for the project
                    const sources = await EfficiencyService.getTaskSources(Number(activeTask.projectId))
                    const found = sources.find(s => String(s.source_id) === String(activeTask.sourceId) && s.source_type === activeTask.sourceType)
                    if (found && found.story_id) {
                        storyId = String(found.story_id)
                    }
                }
             }

             if (!storyId) {
                 throw new Error('无法解析跟进事项所属的故事ID，请手动到跟进列表标记完成')
             }

             if (activeTask.sourceType === 'storyline_follow_up') {
                const storylineId = String(storyId)
                const projectId = String(activeTask.projectId)
                // Use storylineId (which is the parent) to fetch records
                const res = await StorylineService.getFollowUpRecords(projectId, storylineId, 50, 0)
                const records = res.data || []
                // Find the specific record by activeTask.sourceId (which is the follow-up record ID)
                const targetRecord = records.find((r: any) => String(r.id) === String(activeTask.sourceId))
                
                if (targetRecord) {
                   await StorylineService.updateFollowUpRecord(projectId, storylineId, targetRecord.id, {
                      result: stopForm.completionRemarks,
                      completed_at: stopForm.completionDate
                   })
                }
                
                if (stopForm.addNewFollowUp && stopForm.newFollowUpContent) {
                   await StorylineService.createFollowUpRecord(projectId, storylineId, {
                      content: stopForm.newFollowUpContent,
                      next_follow_up_date: stopForm.newFollowUpDate,
                      event_date: todayStr
                   })
                }
             } else if (activeTask.sourceType === 'follow_up') {
                const sId = Number(storyId)
                // Use storyId to fetch records
                const res = await StoryFollowUpService.getStoryFollowUpRecords(sId, 50, 0)
                const records = res.records || []
                // Find the specific record by activeTask.sourceId
                const targetRecord = records.find(r => String(r.id) === String(activeTask.sourceId))
                
                if (targetRecord) {
                   await StoryFollowUpService.updateFollowUpRecord(sId, targetRecord.id, {
                      result: stopForm.completionRemarks,
                      completed_at: stopForm.completionDate
                   })
                }
                
                if (stopForm.addNewFollowUp && stopForm.newFollowUpContent) {
                   await StoryFollowUpService.createFollowUpRecord(sId, {
                      content: stopForm.newFollowUpContent,
                      action_date: stopForm.newFollowUpDate,
                      event_date: todayStr
                   })
                }
             }
          } catch (e) {
             console.error('Failed to mark as completed', e)
             alert('工时已保存，但标记跟进事项完成失败: ' + (e instanceof Error ? e.message : '未知错误'))
          }
        }
        
        // Ensure we view and select Today
        const now = new Date()
        if (!isSameMonth(currentDate, now)) {
          setCurrentDate(now)
        }
        if (!isSameDay(selectedDate, now)) {
          setSelectedDate(now)
        }
        
        loadAllData()
      }
    } catch (err) {
      alert('保存记录失败')
      console.error(err)
    }

    // Clear Active Task
    setActiveTask({ projectId: '', sourceType: '', sourceId: '', description: '', title: '', storyId: '' })
    setElapsedSeconds(0)
    setBaseSeconds(0)
    setStartedAt(null)
    setOriginalStartedAt(null)
    setShowStopModal(false)
  }

  const togglePause = () => {
    if (isPaused) {
      // Resuming
      setStartedAt(new Date())
      setIsPaused(false)
    } else {
      // Pausing
      // Freeze elapsedSeconds into baseSeconds
      setBaseSeconds(elapsedSeconds)
      setIsPaused(true)
    }
  }

  const handleEditLog = (log: WorkLog) => {
    setEditingLog(log)
    setEditForm({
      startTime: log.started_at ? format(new Date(log.started_at), 'HH:mm') : '09:00',
      endTime: log.ended_at ? format(new Date(log.ended_at), 'HH:mm') : '18:00',
    })
    setIsDeleteConfirming(false)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingLog) return

    try {
      // Robust date parsing
      // Ensure we extract just the YYYY-MM-DD part from work_date
      const dateObj = new Date(editingLog.work_date)
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid work_date')
      }
      const dateStr = format(dateObj, 'yyyy-MM-dd')
      
      // Construct ISO strings for start/end times
      // Using T separator is safer for Date parsing across browsers
      const startDateTime = new Date(`${dateStr}T${editForm.startTime}:00`)
      const endDateTime = new Date(`${dateStr}T${editForm.endTime}:00`)
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid time format')
      }
      
      let durationSeconds = (endDateTime.getTime() - startDateTime.getTime()) / 1000
      // Handle cross-day or invalid
      if (durationSeconds < 0) durationSeconds += 24 * 3600
      
      let hoursSpent = Number((durationSeconds / 3600).toFixed(2))
      if (hoursSpent === 0 && durationSeconds > 0) hoursSpent = 0.01

      await EfficiencyService.updateWorkLog(editingLog.id, {
        started_at: startDateTime.toISOString(),
        ended_at: endDateTime.toISOString(),
        hours_spent: hoursSpent
      })
      
      setShowEditModal(false)
      setEditingLog(null)
      loadAllData() // Refresh list
    } catch (e) {
      console.error('Failed to update log', e)
      alert('更新记录失败: 时间格式错误')
    }
  }

  const handleDeleteClick = () => {
    setIsDeleteConfirming(true)
  }

  const executeDeleteLog = async () => {
    if (!editingLog) return
    
    try {
      await EfficiencyService.deleteWorkLog(editingLog.id)
      setShowEditModal(false)
      setEditingLog(null)
      loadAllData()
    } catch (e) {
      console.error('Failed to delete log', e)
      alert('删除记录失败')
    }
  }

  // Derived Source Data for Cascade Selection
  const programStories = useMemo(() => 
    taskSources.filter(s => s.source_type === 'storyline' && (!modalForm.projectId || s.project_id === Number(modalForm.projectId))),
    [taskSources, modalForm.projectId]
  )

  const projectStories = useMemo(() => 
    taskSources.filter(s => s.source_type === 'project_story' && (!modalForm.projectId || s.project_id === Number(modalForm.projectId))),
    [taskSources, modalForm.projectId]
  )

  // Filtered stories based on category
  const visibleStories = useMemo(() => {
    if (storyCategory === 'program') {
      return programStories
    } else if (storyCategory === 'subproject') {
      if (!selectedSubprojectId) return []
      return projectStories.filter(s => s.subproject_id === Number(selectedSubprojectId))
    }
    return []
  }, [storyCategory, selectedSubprojectId, programStories, projectStories])
  
  const stories = useMemo(() => 
    taskSources.filter(s => s.source_type === 'project_story' || s.source_type === 'storyline'),
    [taskSources]
  )
  
  const currentStory = useMemo(() => {
    if (!selectedStoryKey) return undefined
    const [type, idStr] = selectedStoryKey.split(':')
    return stories.find(s => s.source_type === type && s.source_id.toString() === idStr)
  }, [stories, selectedStoryKey])
  
  const relevantFollowUps = useMemo(() => {
    if (!selectedStoryKey) return []
    const [type, idStr] = selectedStoryKey.split(':')
    if (type === 'project_story') {
      return taskSources.filter(s => s.source_type === 'follow_up' && s.story_id?.toString() === idStr)
    } else if (type === 'storyline') {
      return taskSources.filter(s => s.source_type === 'storyline_follow_up' && s.story_id?.toString() === idStr)
    }
    return []
  }, [taskSources, selectedStoryKey])

  const handleStoryChange = (key: string) => {
    setSelectedStoryKey(key)
    if (key) {
      const [type, idStr] = key.split(':')
      setModalSourceType(type === 'storyline' ? 'program' : 'project')
      setModalForm(prev => ({ ...prev, sourceId: idStr }))
    } else {
      setModalForm(prev => ({ ...prev, sourceId: '' }))
    }
  }

  const handleCategoryChange = (cat: 'program' | 'subproject') => {
    setStoryCategory(cat)
    setSelectedSubprojectId('')
    setSelectedStoryKey('')
    setModalForm(prev => ({ ...prev, sourceId: '' }))
  }

  const handleSubprojectChange = (id: string) => {
    setSelectedSubprojectId(id)
    setSelectedStoryKey('')
    setModalForm(prev => ({ ...prev, sourceId: '' }))
  }

  const handleFollowUpChange = (id: string) => {
    if (id) {
      setModalSourceType('followup')
      setModalForm(prev => ({ ...prev, sourceId: id }))
    } else {
      // Revert to story
      if (selectedStoryKey) {
        const [type, idStr] = selectedStoryKey.split(':')
        setModalSourceType(type === 'storyline' ? 'program' : 'project')
        setModalForm(prev => ({ ...prev, sourceId: idStr }))
      }
    }
  }

  // Follow-up Tasks for Quick Start
  const followUpTasks = useMemo(() => {
    return taskSources
      .filter(t => (t.source_type === 'follow_up' || t.source_type === 'storyline_follow_up') 
        && !!t.next_follow_up_date
      )
      .sort((a, b) => {
        const dateA = new Date(a.next_follow_up_date!).getTime()
        const dateB = new Date(b.next_follow_up_date!).getTime()
        return dateA - dateB
      })
  }, [taskSources])

  const handleQuickStart = (task: TaskSource) => {
     setActiveTask({
        projectId: String(task.project_id),
        sourceType: task.source_type,
        sourceId: String(task.source_id),
        description: task.title,
        title: task.title,
        storyId: task.story_id ? String(task.story_id) : ''
     })
     setElapsedSeconds(0)
     setBaseSeconds(0)
     const now = new Date()
     setStartedAt(now)
     setOriginalStartedAt(now)
     setIsRunning(true)
     setIsPaused(false)
     setShowInterruptModal(false)
  }

  const handleCardClick = (task: TaskSource) => {
    if (task.source_type === 'follow_up') {
      if (task.subproject_id) {
        navigate(`/projects/${task.project_id}/subprojects/${task.subproject_id}/stories`)
      } else {
        navigate(`/projects/${task.project_id}`)
      }
    } else if (task.source_type === 'storyline_follow_up') {
      navigate(`/storylines/${task.project_id}/${task.story_id}/follow-ups`)
    }
  }

  // Derived UI Data
  const activeProjectName = projects.find(p => p.id === Number(activeTask.projectId))?.name || '未关联项目'
  const isIdle = !activeTask.projectId && !activeTask.description

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <ConfettiStyle />

      {/* --- Main Content --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="w-full space-y-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-800">工时登记台</h2>
              {!isIdle && (
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                  <span className="text-sm font-medium text-indigo-700 font-mono">
                    {formatDuration(elapsedSeconds)}
                  </span>
                  <button onClick={handleStopTask} className="text-xs bg-white text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors">
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Section 1: Active Task / Switcher (The Hero) */}
          <section>
            {isIdle ? (
              /* Idle State with Quick Start Cards */
              <div className="space-y-6">
                
                {followUpTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {followUpTasks.map(task => {
                       const project = projects.find(p => p.id === task.project_id)
                       
                       return (
                         <div 
                           key={`${task.source_type}-${task.source_id}`}
                           onClick={() => handleCardClick(task)}
                           className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                         >
                            <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 group-hover:bg-gray-300"></div>
                            <div className="pl-3">
                               <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                                    {task.detail || '未知来源'}
                                  </span>
                               </div>
                               
                               <h4 className="font-bold text-gray-900 mb-2 line-clamp-3 text-lg">
                                 {task.title}
                               </h4>
                               
                               <div className="text-xs text-gray-500 line-clamp-2 mb-2">
                                  {task.source_type === 'follow_up' ? (task.subproject_name || project?.name) : (project?.name)}
                               </div>

                               {task.next_follow_up_date && (
                                 <div className="text-xs text-gray-400 font-medium mb-4 flex items-center gap-1">
                                   <span>下次跟进: {format(new Date(task.next_follow_up_date), 'yyyy-MM-dd')}</span>
                                 </div>
                               )}
                            </div>

                            <div className="pl-3 mt-auto flex justify-end">
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   handleQuickStart(task)
                                 }}
                                 className="px-4 py-1.5 bg-white text-gray-900 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1"
                               >
                                 <Play className="w-3 h-3" /> 开工
                               </button>
                            </div>
                         </div>
                       )
                    })}
                  </div>
                ) : (
                   <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Coffee className="w-6 h-6" />
                      </div>
                      <p>暂无待跟进事项</p>
                   </div>
                )}
              </div>
            ) : (
              /* Active Task Panel */
              <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden relative">
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Folder className="w-3 h-3 text-gray-400" /> {activeProjectName}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-3">
                      {activeTask.title}
                      <Edit2 className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-pointer" />
                    </h2>
                    <p className={cn("text-sm", isPaused ? "text-yellow-600 font-medium" : "text-gray-500")}>
                      {isPaused ? "任务已暂停..." : "正在进行中..."}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={cn("text-4xl font-mono font-bold text-gray-900 tracking-tight", isPaused && "opacity-50")}>
                        {formatDuration(elapsedSeconds)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        开始于 {startedAt ? startedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <button 
                        onClick={togglePause}
                        className={cn(
                          "w-full px-6 py-2.5 font-medium rounded-lg transition-colors border flex items-center justify-center gap-2",
                          isPaused 
                            ? "bg-green-50 text-green-600 border-green-100 hover:bg-green-100"
                            : "bg-yellow-50 text-yellow-600 border-yellow-100 hover:bg-yellow-100"
                        )}
                      >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        {isPaused ? "继续" : "暂停"}
                      </button>
                      <button 
                        onClick={handleStopTask}
                        className="w-full px-6 py-2.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-100 flex items-center justify-center gap-2"
                      >
                        <Square className="w-4 h-4 fill-current" /> 结束
                      </button>
                      <button 
                        onClick={handleInterruptClick}
                        className="w-full px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 animate-pulse"
                      >
                        <Zap className="w-4 h-4" /> 插入突发任务
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Task Stack (Suspended) */}
                {suspendedTasks.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">已挂起任务 (Task Stack)</div>
                    <div className="space-y-2">
                      {suspendedTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200 shadow-sm opacity-75 hover:opacity-100 transition-opacity cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center">
                              <Pause className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{task.description}</div>
                              <div className="text-xs text-gray-500">已用时 {formatDuration(task.elapsedSeconds)} · {task.projectName}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleResumeFromStack(task)}
                            className="text-xs text-indigo-600 font-medium hover:underline"
                          >
                            恢复任务
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>



          {/* Section 3: Recent Activity Log (Calendar View) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-card border border-gray-200 p-6 h-fit">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  工作日历
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium text-gray-900 w-20 text-center">
                    {format(currentDate, 'yyyy年M月')}
                  </span>
                  <button 
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <div key={day} className="py-2">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {eachDayOfInterval({
                  start: startOfWeek(startOfMonth(currentDate)),
                  end: endOfWeek(endOfMonth(currentDate))
                }).map((day, idx) => {
                  const isToday = isSameDay(day, new Date())
                  const isSelected = isSameDay(day, selectedDate)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const dayLogs = monthLogs.filter(log => {
                    const logDate = log.started_at ? new Date(log.started_at) : new Date(log.work_date)
                    return format(logDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  })
                  const hasLogs = dayLogs.length > 0
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm relative transition-all",
                        !isCurrentMonth && "text-gray-300",
                        isCurrentMonth && !isSelected && "text-gray-700 hover:bg-gray-50",
                        isSelected && "bg-indigo-600 text-white shadow-md",
                        isToday && !isSelected && "text-indigo-600 font-bold bg-indigo-50"
                      )}
                    >
                      {getDate(day)}
                      {hasLogs && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full"></span>
                      )}
                    </button>
                  )
                })}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                   <span>本月工时</span>
                   <span className="font-medium text-gray-900">
                     {monthLogs.reduce((acc, log) => acc + Number(log.hours_spent || 0), 0).toFixed(1)} 小时
                   </span>
                </div>
              </div>
            </div>

            {/* Daily Records List */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-800">
                  {format(selectedDate, 'M月d日')} 记录
                </h3>
                <div className="text-sm text-gray-500">
                  共 {monthLogs.filter(l => format(l.started_at ? new Date(l.started_at) : new Date(l.work_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).length} 条记录
                </div>
              </div>

              <div className="space-y-3">
                {monthLogs
                  .filter(log => format(log.started_at ? new Date(log.started_at) : new Date(log.work_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                  .sort((a, b) => {
                    const timeA = a.started_at ? new Date(a.started_at).getTime() : new Date(a.work_date).getTime()
                    const timeB = b.started_at ? new Date(b.started_at).getTime() : new Date(b.work_date).getTime()
                    return timeB - timeA
                  })
                  .map(log => (
                  <div key={log.id} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                    <div className="min-w-[6rem] text-sm text-gray-500 pt-0.5">
                      <div className="flex items-center gap-1">
                        <span>{log.started_at ? format(new Date(log.started_at), 'HH:mm') : '00:00'}</span>
                        <span className="text-gray-300">-</span>
                        <span>{log.ended_at ? format(new Date(log.ended_at), 'HH:mm') : '??:??'}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDurationDetailed(Number(log.hours_spent))}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">{log.description || log.source_title || '未命名任务'}</h4>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              {log.project_name || '无项目'}
                              {log.sub_project_name && ` - ${log.sub_project_name}`}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleEditLog(log)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 transition-opacity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {monthLogs.filter(log => format(log.started_at ? new Date(log.started_at) : new Date(log.work_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).length === 0 && (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Coffee className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>本日暂无记录</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Stop Task Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all scale-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">结束任务</h3>
              <button onClick={() => setShowStopModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
                <h4 className="font-medium text-gray-900 mb-1">{activeTask.description || activeTask.title}</h4>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs">
                    {activeProjectName}
                  </span>
                  <span>{formatDuration(elapsedSeconds)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={stopForm.startTime}
                    onChange={(e) => setStopForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={stopForm.endTime}
                    onChange={(e) => setStopForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注/描述</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                  value={stopForm.description}
                  onChange={(e) => setStopForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="补充一些细节..."
                />
              </div>

              {/* Mark as Completed Option for Follow-ups */}
              {(activeTask.sourceType === 'storyline_follow_up' || activeTask.sourceType === 'follow_up') && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      checked={stopForm.markCompleted}
                      onChange={(e) => setStopForm(prev => ({ ...prev, markCompleted: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-indigo-900">同时将此跟进事项标记为完成</span>
                  </label>

                  {stopForm.markCompleted && (
                    <div className="pl-6 space-y-3 animate-fade-in">
                      <div>
                        <label className="block text-xs font-medium text-indigo-800 mb-1">完成时间</label>
                        <input 
                          type="date"
                          className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          value={stopForm.completionDate}
                          onChange={(e) => setStopForm(prev => ({ ...prev, completionDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-indigo-800 mb-1">完成备注</label>
                        <textarea 
                          className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none text-sm"
                          value={stopForm.completionRemarks}
                          onChange={(e) => setStopForm(prev => ({ ...prev, completionRemarks: e.target.value }))}
                          placeholder="填写跟进结果或完成情况..."
                        />
                      </div>

                      <div className="pt-3 mt-1 border-t border-indigo-200/50">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            checked={stopForm.addNewFollowUp}
                            onChange={(e) => setStopForm(prev => ({ ...prev, addNewFollowUp: e.target.checked }))}
                          />
                          <span className="text-sm font-medium text-indigo-900">新增后续跟进事项?</span>
                        </label>

                        {stopForm.addNewFollowUp && (
                          <div className="pl-6 mt-3 space-y-3 animate-fade-in">
                            <div>
                              <label className="block text-xs font-medium text-indigo-800 mb-1">后续跟进内容</label>
                              <textarea 
                                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none text-sm"
                                value={stopForm.newFollowUpContent}
                                onChange={(e) => setStopForm(prev => ({ ...prev, newFollowUpContent: e.target.value }))}
                                placeholder="下一步需要做什么..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-indigo-800 mb-1">计划跟进日期</label>
                              <input 
                                type="date"
                                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                value={stopForm.newFollowUpDate}
                                onChange={(e) => setStopForm(prev => ({ ...prev, newFollowUpDate: e.target.value }))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl shrink-0">
              <button 
                onClick={() => setShowStopModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmStop}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all scale-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">编辑记录</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
                <h4 className="font-medium text-gray-900 mb-1">{editingLog.description || editingLog.source_title}</h4>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs">
                    {editingLog.project_name}
                  </span>
                  <span>{editingLog.work_date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between gap-3 min-h-[44px]">
                {isDeleteConfirming ? (
                   <div className="flex-1 flex items-center justify-between bg-red-50 px-3 py-1 rounded-lg animate-fade-in">
                      <span className="text-sm text-red-600 font-medium">确定要删除吗？</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsDeleteConfirming(false)}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded"
                        >
                          取消
                        </button>
                        <button 
                          onClick={executeDeleteLog}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 shadow-sm"
                        >
                          确认删除
                        </button>
                      </div>
                   </div>
                ) : (
                  <>
                    <button 
                      onClick={handleDeleteClick}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      删除记录
                    </button>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
                      >
                        保存修改
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interrupt / New Task Modal */}
      {showInterruptModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 transform transition-all scale-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {isIdle && suspendedTasks.length === 0 ? '开始新任务' : '插入突发任务'}
              </h3>
              <button onClick={() => setShowInterruptModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Alert for interruption */}
              {(!isIdle || suspendedTasks.length > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                  <Pause className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">当前任务将被挂起</p>
                    <p className="text-xs text-yellow-600 mt-0.5">"{activeTask.description || activeTask.title}" 将暂停计时，您可以在完成后随时恢复。</p>
                  </div>
                </div>
              )}

              {/* 1. Project Selection (Moved to Top) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属项目</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={modalForm.projectId}
                  onChange={(e) => setModalForm(prev => ({ ...prev, projectId: e.target.value, sourceId: '' }))}
                >
                  <option value="">选择项目...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Story Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">任务来源类型</label>
                <div className="flex gap-4 mb-4">
                  <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer transition-all ${storyCategory === 'program' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      className="hidden" 
                      checked={storyCategory === 'program'} 
                      onChange={() => handleCategoryChange('program')}
                      disabled={!modalForm.projectId}
                    />
                    <span className="text-sm font-medium">项目集故事</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer transition-all ${storyCategory === 'subproject' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      className="hidden" 
                      checked={storyCategory === 'subproject'} 
                      onChange={() => handleCategoryChange('subproject')}
                      disabled={!modalForm.projectId}
                    />
                    <span className="text-sm font-medium">子项目</span>
                  </label>
                </div>

                {/* Subproject Dropdown (Only if category is subproject) */}
                {storyCategory === 'subproject' && (
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">选择子项目</label>
                    <div className="relative">
                      <select 
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white transition-shadow truncate"
                        value={selectedSubprojectId}
                        onChange={(e) => handleSubprojectChange(e.target.value)}
                      >
                        <option value="">请选择子项目...</option>
                        {subprojectsList.filter(sp => taskSources.some(ts => ts.source_type === 'project_story' && ts.subproject_id === sp.id)).map(sp => (
                          <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                )}

                <label className="block text-xs text-gray-500 mb-1">选择具体故事 (必选)</label>
                <div className="relative">
                  <select 
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white transition-shadow truncate"
                    value={selectedStoryKey}
                    onChange={(e) => handleStoryChange(e.target.value)}
                    disabled={!storyCategory || (storyCategory === 'subproject' && !selectedSubprojectId)}
                  >
                    <option value="">
                      {!storyCategory 
                        ? '请先选择来源类型' 
                        : (storyCategory === 'subproject' && !selectedSubprojectId ? '请先选择子项目' : '选择故事...')
                      }
                    </option>
                    {visibleStories.map(s => (
                      <option key={`${s.source_type}-${s.source_id}`} value={`${s.source_type}:${s.source_id}`}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* 3. Follow-up Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">跟进事项 (可选)</label>
                <div className="relative">
                  <select 
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white transition-shadow truncate"
                    value={modalForm.sourceId === (selectedStoryKey ? selectedStoryKey.split(':')[1] : '') ? '' : modalForm.sourceId}
                    onChange={(e) => handleFollowUpChange(e.target.value)}
                    disabled={!selectedStoryKey}
                  >
                    <option value="">
                      {!selectedStoryKey 
                        ? '请先选择故事' 
                        : (relevantFollowUps.length > 0 ? '选择跟进事项...' : '无跟进事项')
                      }
                    </option>
                    {relevantFollowUps.map(s => (
                      <option key={s.source_id} value={s.source_id}>{s.title}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">选择特定跟进事项或仅基于故事开始任务</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowInterruptModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">取消</button>
              <button 
                onClick={confirmStartTask}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
              >
                立即开始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Toast */}
      {showGoalToast && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-500 z-50 flex items-center gap-4 animate-bounce">
          <div className="text-3xl">🎉</div>
          <div>
            <h4 className="font-bold text-white">目标达成！</h4>
            <p className="text-sm text-gray-300">恭喜！今日工时已达标。</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Efficiency
