const express = require('express')
const { db } = require('../lib/database.cjs')

const router = express.Router()

const ensureWorkLogsSchema = async () => {
  // Ensure table exists first
  await db.query(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      task_id INT,
      user_id INT NOT NULL,
      description TEXT,
      hours_spent DECIMAL(5,2) DEFAULT 0,
      work_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  const ensureColumn = async (column, def) => {
    try {
      const [rows] = await db.query(
        'SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        ['work_logs', column]
      )
      if (!rows || rows[0].cnt === 0) {
        await db.query(`ALTER TABLE work_logs ADD COLUMN ${column} ${def}`)
      }
    } catch (error) {
      console.error(`Ensure column ${column} failed:`, error)
    }
  }
  
  // Drop tag column if exists
  try {
      const [rows] = await db.query(
        'SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        ['work_logs', 'tag']
      )
      if (rows && rows[0].cnt > 0) {
         await db.query('ALTER TABLE work_logs DROP COLUMN tag')
      }
  } catch(e) {
      console.error('Drop tag column failed:', e)
  }

  // Drop tag column from micro_goals if exists
  try {
      const [rows] = await db.query(
        'SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        ['micro_goals', 'tag']
      )
      if (rows && rows[0].cnt > 0) {
         await db.query('ALTER TABLE micro_goals DROP COLUMN tag')
      }
  } catch(e) {
      console.error('Drop micro_goals tag column failed:', e)
  }

  try {
      const [rows] = await db.query(
        'SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        ['micro_goals', 'status']
      )
      if (rows && rows[0].cnt > 0) {
         await db.query('ALTER TABLE micro_goals DROP COLUMN status')
      }
  } catch(e) {
      console.error('Drop micro_goals status column failed:', e)
  }

  await ensureColumn('source_type', "VARCHAR(30) NULL")
  await ensureColumn('source_id', 'INT NULL')
  await ensureColumn('source_title', 'VARCHAR(255) NULL')
  // Tag column removed
  await ensureColumn('started_at', 'DATETIME NULL')
  await ensureColumn('ended_at', 'DATETIME NULL')
}

const ensureGoalsSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS micro_goals (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(200) NOT NULL,
      period ENUM('daily','weekly','custom') NOT NULL,
      target_hours DECIMAL(8,2) NOT NULL,
      project_id INT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

const normalizeDateOnly = (value) => {
  if (!value) return null
  // If it matches YYYY-MM-DD format, return as is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  
  // Use local date components to avoid UTC shift
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getWeekRange = (baseDate = new Date()) => {
  const date = new Date(baseDate)
  const day = date.getDay()
  const diffToMonday = (day + 6) % 7
  const start = new Date(date)
  start.setDate(date.getDate() - diffToMonday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  }
}

const resolveSource = async (sourceType, sourceId) => {
  if (sourceType === 'project_story') {
    const [rows] = await db.query(
      `SELECT ps.story_name, ps.content, COALESCE(sp.parent_id, sp.id) AS project_id
       FROM project_stories ps
       JOIN projects sp ON ps.subproject_id = sp.id
       WHERE ps.id = ?`,
      [sourceId]
    )
    if (!rows || rows.length === 0) return null
    const row = rows[0]
    const title = row.story_name || row.content || '项目故事'
    return { project_id: row.project_id, title }
  }
  if (sourceType === 'storyline') {
    const [rows] = await db.query(
      `SELECT title, content, project_id FROM storylines WHERE id = ?`,
      [sourceId]
    )
    if (!rows || rows.length === 0) return null
    const row = rows[0]
    const title = row.title || row.content || '项目集故事'
    return { project_id: row.project_id, title }
  }
  if (sourceType === 'follow_up') {
    const [rows] = await db.query(
      `SELECT fur.content, ps.story_name, COALESCE(sp.parent_id, sp.id) AS project_id
       FROM follow_up_records fur
       JOIN project_stories ps ON fur.story_id = ps.id
       JOIN projects sp ON ps.subproject_id = sp.id
       WHERE fur.id = ?`,
      [sourceId]
    )
    if (!rows || rows.length === 0) return null
    const row = rows[0]
    const title = row.content || row.story_name || '跟进登记'
    return { project_id: row.project_id, title }
  }
  if (sourceType === 'storyline_follow_up') {
    const [rows] = await db.query(
      `SELECT fur.content, s.title, s.project_id
       FROM storyline_follow_up_records fur
       JOIN storylines s ON fur.storyline_id = s.id
       WHERE fur.id = ?`,
      [sourceId]
    )
    if (!rows || rows.length === 0) return null
    const row = rows[0]
    const title = row.content || row.title || '跟进登记'
    return { project_id: row.project_id, title }
  }
  return null
}

router.get('/task-sources', async (req, res) => {
  try {
    const { project_id } = req.query
    const params = []
    
    // 1. 获取项目故事 (Project Stories)
    let baseWhere = "WHERE 1=1"
    const baseParams = []
    
    if (project_id) {
      baseWhere += " AND (sp.parent_id = ? OR sp.id = ?)"
      baseParams.push(project_id, project_id)
    }

    const [projectStories] = await db.query(
      `SELECT ps.id, ps.story_name, ps.content, COALESCE(sp.parent_id, sp.id) AS project_id, sp.id AS subproject_id, sp.name AS subproject_name
       FROM project_stories ps
       JOIN projects sp ON ps.subproject_id = sp.id
       ${baseWhere} AND EXISTS (
         SELECT 1 FROM follow_up_records r
         WHERE r.story_id = ps.id AND r.action_date IS NOT NULL AND r.completed_at IS NULL
       )
       ORDER BY ps.created_at DESC`,
      baseParams
    )

    // 2. 获取项目集故事 (Storylines)
    // Independent query, filtered by project_id if provided
    let sWhere = "WHERE 1=1" 
    const sParams = []
    if (project_id) {
      sWhere += " AND project_id = ?"
      sParams.push(project_id)
    }

    const [storylines] = await db.query(
      `SELECT id, title, content, project_id FROM storylines
       ${sWhere}
       ORDER BY created_at DESC`,
      sParams
    )

    // 3. 获取跟进事项 (Follow-ups) - Linked to Project Stories
    // Fix: Should display follow-ups even if parent story is completed, as long as the follow-up itself is not completed
    const [followUps] = await db.query(
      `SELECT fur.id, fur.content, fur.story_id, ps.story_name, COALESCE(sp.parent_id, sp.id) AS project_id, sp.id AS subproject_id, sp.name AS subproject_name, fur.action_date
       FROM follow_up_records fur
       JOIN project_stories ps ON fur.story_id = ps.id
       JOIN projects sp ON ps.subproject_id = sp.id
       ${baseWhere} AND fur.completed_at IS NULL
       ORDER BY fur.created_at DESC`,
      baseParams
    )

    // 4. 获取故事线跟进事项 (Storyline Follow-ups)
    // Independent query, filtered by project_id if provided
    let sfWhere = "WHERE fur.completed_at IS NULL"
    const sfParams = []
    if (project_id) {
      sfWhere += " AND s.project_id = ?"
      sfParams.push(project_id)
    }

    const [storylineFollowUps] = await db.query(
      `SELECT fur.id, fur.content, fur.storyline_id, s.title, s.project_id, fur.action_date
       FROM storyline_follow_up_records fur
       JOIN storylines s ON fur.storyline_id = s.id
       ${sfWhere}
       ORDER BY fur.created_at DESC`,
      sfParams
    )

    const sources = [
      ...projectStories.map((row) => ({
        source_type: 'project_story',
        source_id: row.id,
        project_id: row.project_id,
        title: row.story_name || row.content || '项目故事',
        detail: row.content || '',
        story_id: row.id, // Self ID for matching
        subproject_id: row.subproject_id,
        subproject_name: row.subproject_name
      })),
      ...storylines.map((row) => ({
        source_type: 'storyline',
        source_id: row.id,
        project_id: row.project_id,
        title: row.title || row.content || '项目集故事',
        detail: row.content || ''
      })),
      ...followUps.map((row) => ({
        source_type: 'follow_up',
        source_id: row.id,
        project_id: row.project_id,
        title: row.content || row.story_name || '跟进登记',
        detail: row.story_name || '',
        story_id: row.story_id, // Parent Story ID
        subproject_id: row.subproject_id,
        subproject_name: row.subproject_name,
        next_follow_up_date: row.action_date
      })),
      ...storylineFollowUps.map((row) => ({
        source_type: 'storyline_follow_up',
        source_id: row.id,
        project_id: row.project_id,
        title: row.content || row.title || '跟进登记',
        detail: row.title || '',
        story_id: row.storyline_id, // Parent Storyline ID (mapped to story_id for consistency in frontend)
        next_follow_up_date: row.action_date
      }))
    ]

    res.json({ success: true, data: sources })
  } catch (error) {
    console.error('获取任务来源失败:', error)
    res.status(500).json({ success: false, message: '获取任务来源失败' })
  }
})

router.get('/work-logs', async (req, res) => {
  try {
    await ensureWorkLogsSchema()
    const {
      page = 1,
      limit = 20,
      project_id,
      source_type,
      source_id,
      start_date,
      end_date
    } = req.query

    const offset = (Number(page) - 1) * Number(limit)
    const where = []
    const params = []

    if (project_id) {
      where.push('wl.project_id = ?')
      params.push(project_id)
    }
    if (source_type) {
      where.push('wl.source_type = ?')
      params.push(source_type)
    }
    if (source_id) {
      where.push('wl.source_id = ?')
      params.push(source_id)
    }
    if (start_date) {
      where.push('wl.work_date >= ?')
      params.push(start_date)
    }
    if (end_date) {
      where.push('wl.work_date <= ?')
      params.push(end_date)
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM work_logs wl ${whereClause}`,
      params
    )
    const total = countRows[0]?.total || 0

    const [rows] = await db.query(
      `SELECT wl.*, p.name AS project_name,
        CASE
          WHEN wl.source_type = 'project_story' THEN (
            SELECT sp.name FROM project_stories ps 
            JOIN projects sp ON ps.subproject_id = sp.id 
            WHERE ps.id = wl.source_id
          )
          WHEN wl.source_type = 'follow_up' THEN (
            SELECT sp.name FROM follow_up_records fur
            JOIN project_stories ps ON fur.story_id = ps.id
            JOIN projects sp ON ps.subproject_id = sp.id
            WHERE fur.id = wl.source_id
          )
          ELSE NULL
        END AS sub_project_name
       FROM work_logs wl
       JOIN projects p ON wl.project_id = p.id
       ${whereClause}
       ORDER BY wl.work_date DESC, wl.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params
    )

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取工时记录失败:', error)
    res.status(500).json({ success: false, message: '获取工时记录失败' })
  }
})

router.post('/work-logs', async (req, res) => {
  try {
    await ensureWorkLogsSchema()
    const {
      project_id,
      source_type,
      source_id,
      description,
      hours_spent,
      work_date,
      started_at,
      ended_at
    } = req.body

    if (!project_id) {
      return res.status(400).json({ success: false, message: '项目不能为空' })
    }
    if (!source_type || !source_id) {
      return res.status(400).json({ success: false, message: '任务来源不能为空' })
    }
    const hoursNumber = Number(hours_spent)
    if (!hours_spent || Number.isNaN(hoursNumber) || hoursNumber <= 0) {
      return res.status(400).json({ success: false, message: '工时必须大于0' })
    }

    const resolved = await resolveSource(source_type, source_id)
    if (!resolved) {
      return res.status(400).json({ success: false, message: '任务来源不存在' })
    }
    if (String(resolved.project_id) !== String(project_id)) {
      return res.status(400).json({ success: false, message: '任务来源与项目不匹配' })
    }

    const finalWorkDate = normalizeDateOnly(work_date) || normalizeDateOnly(started_at) || normalizeDateOnly(new Date())
    const startedAtDate = started_at ? new Date(started_at) : null
    const endedAtDate = ended_at ? new Date(ended_at) : null
    
    const [result] = await db.query(
      `INSERT INTO work_logs (
        project_id, task_id, user_id, description, hours_spent, work_date,
        source_type, source_id, source_title, started_at, ended_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        project_id,
        null,
        1,
        description || null,
        hoursNumber,
        finalWorkDate,
        source_type,
        source_id,
        resolved.title,
        startedAtDate,
        endedAtDate
      ]
    )

    const [rows] = await db.query(
      `SELECT wl.*, p.name AS project_name
       FROM work_logs wl
       JOIN projects p ON wl.project_id = p.id
       WHERE wl.id = ?`,
      [result.insertId]
    )

    res.status(201).json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('创建工时记录失败:', error)
    res.status(500).json({ success: false, message: '创建工时记录失败', error: error.message, stack: error.stack })
  }
})

router.put('/work-logs/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      started_at,
      ended_at,
      hours_spent
    } = req.body

    const updates = []
    const params = []

    // Tag update removed

    // Logic for updating time and hours
    // If started_at or ended_at is provided, we should update them.
    // Also if hours_spent is provided directly (e.g. manual edit), update it.
    // Priority: If time range is provided, calculate hours. Else use provided hours.
    
    if (started_at !== undefined) {
      updates.push('started_at = ?')
      params.push(started_at ? new Date(started_at) : null)
    }
    
    if (ended_at !== undefined) {
      updates.push('ended_at = ?')
      params.push(ended_at ? new Date(ended_at) : null)
    }

    // If both start and end are updated/present, we might want to recalc hours on client side and send it,
    // or calc here. Client side sending hours_spent is safer if they manual edit duration without time.
    // But if they edit time, they expect duration to update. 
    // Let's assume client sends calculated hours_spent if they change time.
    
    if (hours_spent !== undefined) {
      const hoursNumber = Number(hours_spent)
      if (Number.isNaN(hoursNumber) || hoursNumber <= 0) {
        return res.status(400).json({ success: false, message: '工时必须大于0' })
      }
      updates.push('hours_spent = ?')
      params.push(hoursNumber)
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: '没有可更新字段' })
    }

    updates.push('updated_at = NOW()')
    params.push(id)

    const [result] = await db.query(`UPDATE work_logs SET ${updates.join(', ')} WHERE id = ?`, params)
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '工时记录不存在' })
    }

    const [rows] = await db.query(
      `SELECT wl.*, p.name AS project_name
       FROM work_logs wl
       JOIN projects p ON wl.project_id = p.id
       WHERE wl.id = ?`,
      [id]
    )
    
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('更新工时记录失败:', error)
    res.status(500).json({ success: false, message: '更新工时记录失败' })
  }
})

router.delete('/work-logs/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await db.query('DELETE FROM work_logs WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '工时记录不存在' })
    }
    res.json({ success: true, message: '工时记录已删除' })
  } catch (error) {
    console.error('删除工时记录失败:', error)
    res.status(500).json({ success: false, message: '删除工时记录失败' })
  }
})

router.get('/work-logs/summary', async (req, res) => {
  try {
    await ensureWorkLogsSchema()
    const { start_date, end_date } = req.query
    const today = normalizeDateOnly(new Date())
    const startDate = normalizeDateOnly(start_date) || today
    const endDate = normalizeDateOnly(end_date) || today

    const baseParams = [startDate, endDate]
    const [totalRows] = await db.query(
      `SELECT COALESCE(SUM(hours_spent), 0) AS total_hours
       FROM work_logs
       WHERE work_date BETWEEN ? AND ?`,
      baseParams
    )
    const [projectRows] = await db.query(
      `SELECT wl.project_id, p.name AS project_name, COALESCE(SUM(wl.hours_spent), 0) AS hours
       FROM work_logs wl
       JOIN projects p ON wl.project_id = p.id
       WHERE wl.work_date BETWEEN ? AND ?
       GROUP BY wl.project_id, p.name
       ORDER BY hours DESC`,
      baseParams
    )
    const [dayRows] = await db.query(
      `SELECT wl.work_date, COALESCE(SUM(wl.hours_spent), 0) AS hours
       FROM work_logs wl
       WHERE wl.work_date BETWEEN ? AND ?
       GROUP BY wl.work_date
       ORDER BY wl.work_date ASC`,
      baseParams
    )

    res.json({
      success: true,
      data: {
        start_date: startDate,
        end_date: endDate,
        total_hours: Number(totalRows[0]?.total_hours || 0),
        by_project: projectRows,
        by_day: dayRows
      }
    })
  } catch (error) {
    console.error('获取工时统计失败:', error)
    res.status(500).json({ success: false, message: '获取工时统计失败' })
  }
})

router.get('/goals', async (req, res) => {
  try {
    await ensureGoalsSchema()
    const [rows] = await db.query(`SELECT * FROM micro_goals ORDER BY created_at DESC`)

    const goals = await Promise.all(
      rows.map(async (goal) => {
        const [sumRows] = await db.query(
          `SELECT COALESCE(SUM(hours_spent), 0) AS hours
           FROM work_logs
           WHERE work_date BETWEEN ? AND ?
           ${goal.project_id ? 'AND project_id = ?' : ''}`,
          [
            goal.start_date,
            goal.end_date,
            ...(goal.project_id ? [goal.project_id] : [])
          ]
        )
        const progress = Number(sumRows[0]?.hours || 0)
        const completionRate = goal.target_hours > 0 ? Math.min(1, progress / Number(goal.target_hours)) : 0
        return {
          ...goal,
          progress_hours: progress,
          completion_rate: completionRate,
          is_completed: completionRate >= 1
        }
      })
    )

    res.json({ success: true, data: goals })
  } catch (error) {
    console.error('获取目标失败:', error)
    res.status(500).json({ success: false, message: '获取目标失败' })
  }
})

router.post('/goals', async (req, res) => {
  try {
    await ensureGoalsSchema()
    const {
      title,
      period,
      target_hours,
      project_id,
      start_date,
      end_date
    } = req.body

    if (!title || !period || !target_hours) {
      return res.status(400).json({ success: false, message: '目标标题和工时不能为空' })
    }

    const targetNumber = Number(target_hours)
    if (Number.isNaN(targetNumber) || targetNumber <= 0) {
      return res.status(400).json({ success: false, message: '目标工时必须大于0' })
    }

    const today = normalizeDateOnly(new Date())
    let finalStart = normalizeDateOnly(start_date)
    let finalEnd = normalizeDateOnly(end_date)
    if (period === 'daily') {
      finalStart = finalStart || today
      finalEnd = finalEnd || today
    }
    if (period === 'weekly') {
      const week = getWeekRange()
      finalStart = finalStart || week.start
      finalEnd = finalEnd || week.end
    }
    if (period === 'custom') {
      if (!finalStart || !finalEnd) {
        return res.status(400).json({ success: false, message: '自定义目标需要开始与结束日期' })
      }
    }
    if (!finalStart || !finalEnd) {
      return res.status(400).json({ success: false, message: '目标日期设置失败' })
    }

    const [result] = await db.query(
      `INSERT INTO micro_goals (
        title, period, target_hours, project_id, start_date, end_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title,
        period,
        targetNumber,
        project_id || null,
        finalStart,
        finalEnd
      ]
    )

    const [rows] = await db.query('SELECT * FROM micro_goals WHERE id = ?', [result.insertId])
    res.status(201).json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('创建目标失败:', error)
    res.status(500).json({ success: false, message: '创建目标失败' })
  }
})

router.put('/goals/:id', async (req, res) => {
  try {
    await ensureGoalsSchema()
    const { id } = req.params
    const {
      title,
      period,
      target_hours,
      project_id,
      tag,
      start_date,
      end_date
    } = req.body

    const updates = []
    const params = []

    if (title !== undefined) {
      if (!title || title.trim() === '') {
        return res.status(400).json({ success: false, message: '目标标题不能为空' })
      }
      updates.push('title = ?')
      params.push(title)
    }
    if (period !== undefined) {
      updates.push('period = ?')
      params.push(period)
    }
    if (target_hours !== undefined) {
      const targetNumber = Number(target_hours)
      if (Number.isNaN(targetNumber) || targetNumber <= 0) {
        return res.status(400).json({ success: false, message: '目标工时必须大于0' })
      }
      updates.push('target_hours = ?')
      params.push(targetNumber)
    }
    if (project_id !== undefined) {
      updates.push('project_id = ?')
      params.push(project_id || null)
    }
    if (tag !== undefined) {
      updates.push('tag = ?')
      params.push(tag || null)
    }
    if (start_date !== undefined) {
      const normalized = normalizeDateOnly(start_date)
      if (!normalized) return res.status(400).json({ success: false, message: '开始日期格式错误' })
      updates.push('start_date = ?')
      params.push(normalized)
    }
    if (end_date !== undefined) {
      const normalized = normalizeDateOnly(end_date)
      if (!normalized) return res.status(400).json({ success: false, message: '结束日期格式错误' })
      updates.push('end_date = ?')
      params.push(normalized)
    }
    if (!updates.length) {
      return res.status(400).json({ success: false, message: '没有可更新字段' })
    }

    updates.push('updated_at = NOW()')
    params.push(id)

    await db.query(`UPDATE micro_goals SET ${updates.join(', ')} WHERE id = ?`, params)
    const [rows] = await db.query('SELECT * FROM micro_goals WHERE id = ?', [id])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '目标不存在' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('更新目标失败:', error)
    res.status(500).json({ success: false, message: '更新目标失败' })
  }
})

router.delete('/goals/:id', async (req, res) => {
  try {
    await ensureGoalsSchema()
    const { id } = req.params
    const [result] = await db.query('DELETE FROM micro_goals WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '目标不存在' })
    }
    res.json({ success: true, message: '目标已删除' })
  } catch (error) {
    console.error('删除目标失败:', error)
    res.status(500).json({ success: false, message: '删除目标失败' })
  }
})

module.exports = router
