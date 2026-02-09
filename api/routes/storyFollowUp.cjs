const express = require('express')
const router = express.Router()
const { db } = require('../lib/database.cjs')

async function ensureFollowUpInfra() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS follow_up_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      story_id INT NOT NULL,
      content TEXT NOT NULL,
      follow_up_type VARCHAR(50) NULL,
      contact_person VARCHAR(255) NULL,
      contact_method VARCHAR(255) NULL,
      result TEXT NULL,
      next_action TEXT NULL,
      event_date DATE NULL,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `
  await db.query(createTableSql)

  const addColumnIfMissing = async (table, column, def) => {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, column]
    )
    if (!rows || rows[0].cnt === 0) {
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`)
    }
  }

  await addColumnIfMissing('follow_up_records', 'follow_up_type', 'VARCHAR(50) NULL')
  await addColumnIfMissing('follow_up_records', 'contact_person', 'VARCHAR(255) NULL')
  await addColumnIfMissing('follow_up_records', 'contact_method', 'VARCHAR(255) NULL')
  await addColumnIfMissing('follow_up_records', 'result', 'TEXT NULL')
  await addColumnIfMissing('follow_up_records', 'next_action', 'TEXT NULL')
  await addColumnIfMissing('follow_up_records', 'event_date', 'DATE NULL')
  await addColumnIfMissing('follow_up_records', 'updated_at', 'DATETIME NULL')
  await addColumnIfMissing('follow_up_records', 'completed_at', 'DATE NULL')
  try {
    const [cols] = await db.query(
      "SELECT IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'follow_up_records' AND column_name = 'action_date'"
    )
    if (!cols || cols.length === 0) {
      await db.query('ALTER TABLE follow_up_records ADD COLUMN action_date DATE NULL')
    } else {
      const c = cols[0]
      if (String(c.IS_NULLABLE) === 'NO' && (c.COLUMN_DEFAULT === null || c.COLUMN_DEFAULT === undefined)) {
        await db.query('ALTER TABLE follow_up_records MODIFY COLUMN action_date DATE NULL')
      }
    }
  } catch {}
  await addColumnIfMissing('follow_up_records', 'created_at', 'DATETIME NOT NULL')

  try { await addColumnIfMissing('project_stories', 'next_reminder_date', 'DATE NULL') } catch {}
}

// 设置跟进提醒日期
router.put('/stories/:id/next-reminder-date', async (req, res) => {
  try {
    const { id } = req.params
    const { next_reminder_date } = req.body

    if (!next_reminder_date) {
      return res.status(400).json({ 
        success: false,
        error: '提醒日期不能为空' 
      })
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(next_reminder_date)) {
      return res.status(400).json({ 
        success: false,
        error: '提醒日期格式错误，应为YYYY-MM-DD格式' 
      })
    }

    const reminderDate = new Date(next_reminder_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (reminderDate < today) {
      return res.status(400).json({ 
        success: false,
        error: '提醒日期不能早于今天' 
      })
    }

    const [result] = await db.query(
      'UPDATE project_stories SET next_reminder_date = ?, updated_at = NOW() WHERE id = ?',
      [next_reminder_date, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: '故事不存在' 
      })
    }

    res.json({
      success: true,
      message: '提醒日期设置成功',
      data: {
        id,
        next_reminder_date
      }
    })
  } catch (err) {
    console.error('设置提醒日期失败:', err)
    res.status(500).json({ 
      success: false,
      error: '设置提醒日期失败',
      message: err.message 
    })
  }
})

// 清除跟进提醒日期
router.delete('/stories/:id/next-reminder-date', async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await db.query(
      'UPDATE project_stories SET next_reminder_date = NULL, updated_at = NOW() WHERE id = ?',
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '故事不存在' })
    }
    res.json({ success: true, message: '提醒日期已清除', data: { id } })
  } catch (err) {
    console.error('清除提醒日期失败:', err)
    res.status(500).json({ success: false, error: '清除提醒日期失败', message: err.message })
  }
})

// 获取跟进中的故事列表
router.get('/stories/following', async (req, res) => {
  try {
    const { overdue = 'false' } = req.query

    let sql = `
      SELECT 
        ps.id,
        ps.subproject_id,
        ps.story_name,
        ps.content,
        ps.time,
        ps.stakeholders,
        ps.next_reminder_date,
        ps.created_at,
        ps.updated_at,
        sp.name as subproject_name,
        sp.parent_id as project_id,
        p.name as project_name
      FROM project_stories ps
      LEFT JOIN projects sp ON ps.subproject_id = sp.id
      LEFT JOIN projects p ON sp.parent_id = p.id
      WHERE ps.next_reminder_date IS NOT NULL
    `
    const params = []

    // 如果要求获取逾期的故事
    if (overdue === 'true') {
      const today = new Date().toISOString().split('T')[0]
      sql += ' AND ps.next_reminder_date < ?'
      params.push(today)
    }

    sql += ' ORDER BY ps.next_reminder_date ASC, ps.created_at DESC'

    const [rows] = await db.query(sql, params)

    res.json({
      success: true,
      data: rows,
      count: rows.length
    })
  } catch (err) {
    console.error('获取跟进中的故事列表失败:', err)
    res.status(500).json({ 
      success: false,
      error: '获取跟进中的故事列表失败',
      message: err.message 
    })
  }
})

// 基于记录的跟进中故事（最新记录存在 action_date 且未完成）
router.get('/stories/following-by-records', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const sql = `
      SELECT ps.id, ps.subproject_id, ps.story_name, ps.content, ps.time, ps.stakeholders,
             ps.created_at, ps.updated_at,
             sp.name as subproject_name, sp.parent_id as project_id, p.name as project_name
      FROM project_stories ps
      LEFT JOIN projects sp ON ps.subproject_id = sp.id
      LEFT JOIN projects p ON sp.parent_id = p.id
      WHERE ps.id IN (
        SELECT r.story_id FROM (
          SELECT story_id, MAX(created_at) AS latest_created
          FROM follow_up_records
          GROUP BY story_id
        ) t
        JOIN follow_up_records r
          ON r.story_id = t.story_id AND r.created_at = t.latest_created
        WHERE r.action_date IS NOT NULL AND (r.completed_at IS NULL)
      )
    `
    const [rows] = await db.query(sql)
    res.json({ success: true, data: rows, count: rows.length })
  } catch (err) {
    console.error('获取基于记录的跟进中故事失败:', err)
    res.status(500).json({ success: false, error: '获取基于记录的跟进中故事失败', message: err.message })
  }
})

// 基于任意记录的跟进中故事（存在任意记录 action_date 且未完成）
router.get('/stories/any-inprogress-by-records', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const sql = `
      SELECT ps.id, ps.subproject_id, ps.story_name, ps.content, ps.time, ps.stakeholders,
             ps.created_at, ps.updated_at,
             sp.name as subproject_name, sp.parent_id as project_id, p.name as project_name
      FROM project_stories ps
      LEFT JOIN projects sp ON ps.subproject_id = sp.id
      LEFT JOIN projects p ON sp.parent_id = p.id
      WHERE EXISTS (
        SELECT 1 FROM follow_up_records r
        WHERE r.story_id = ps.id AND r.action_date IS NOT NULL AND (r.completed_at IS NULL)
      )
    `
    const [rows] = await db.query(sql)
    res.json({ success: true, data: rows, count: rows.length })
  } catch (err) {
    console.error('获取任意记录的跟进中故事失败:', err)
    res.status(500).json({ success: false, error: '获取任意记录的跟进中故事失败', message: err.message })
  }
})

// 创建跟进记录
router.post('/stories/:id/follow-up-records', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const { id } = req.params
    const { content, follow_up_type, contact_person, contact_method, result, next_action, event_date, next_follow_up_date } = req.body
    const incomingActionRaw = (req.body && (req.body.action_date || next_follow_up_date)) || null
    const action_date_in = req.body && (req.body.action_date || next_follow_up_date || null)

    if (!content) {
      return res.status(400).json({ 
        success: false,
        error: '跟进内容不能为空' 
      })
    }

    if (!event_date) {
      return res.status(400).json({
        success: false,
        error: '事件发生日期不能为空'
      })
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const normalize = (s)=> String(s || '').trim().replace(/\//g,'-').slice(0,10)
    const ev = normalize(event_date)
    if (ev && !dateRegex.test(ev)) {
      return res.status(400).json({
        success: false,
        error: '事件发生日期格式错误，应为YYYY-MM-DD格式'
      })
    }
    const ad = normalize(incomingActionRaw)
    if (ad && !dateRegex.test(ad)) {
      return res.status(400).json({ success: false, error: '下次跟进时间格式错误，应为YYYY-MM-DD格式' })
    }
    if (action_date_in && !dateRegex.test(action_date_in)) {
      return res.status(400).json({ success: false, error: '下次跟进时间格式错误，应为YYYY-MM-DD格式' })
    }

    // 验证故事是否存在
    const [story] = await db.query(
      'SELECT id FROM project_stories WHERE id = ?',
      [id]
    )

    if (!story || story.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: '故事不存在' 
      })
    }

    const sql = `
      INSERT INTO follow_up_records (
        story_id, content, follow_up_type, contact_person,
        contact_method, result, next_action, event_date, action_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `

    const [insertResult] = await db.query(sql, [
      id, content, follow_up_type || null, contact_person || null,
      contact_method || null, result || null, next_action || null, ev || null, ad || null
    ])

    res.status(201).json({
      success: true,
      message: '跟进记录创建成功',
      data: {
        id: insertResult.insertId,
        story_id: id,
        content,
        follow_up_type,
        contact_person,
        contact_method,
        result,
        next_action,
        event_date: ev || null,
        action_date: ad || null,
        created_at: new Date().toISOString()
      }
    })
  } catch (err) {
    console.error('创建跟进记录失败:', err)
    res.status(500).json({ 
      success: false,
      error: '创建跟进记录失败',
      message: err.message 
    })
  }
})

// 获取故事的跟进记录
router.get('/stories/:id/follow-up-records', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const { id } = req.params
    const { limit = 50, offset = 0 } = req.query

    // 验证故事是否存在
    const [story] = await db.query(
      'SELECT id FROM project_stories WHERE id = ?',
      [id]
    )

    if (!story || story.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: '故事不存在' 
      })
    }

    const lim = Number(limit) || 50
    const off = Number(offset) || 0
    // 动态检测字段是否存在，避免旧库缺失造成500
    let hasUpdatedAt = false
    let hasCompletedAt = false
    try {
      const [cols] = await db.query("SHOW COLUMNS FROM follow_up_records")
      const names = Array.isArray(cols) ? cols.map(c => String(c.Field)) : []
      hasUpdatedAt = names.includes('updated_at')
      hasCompletedAt = names.includes('completed_at')
    } catch {}

    const selectList = [
      'id',
      'story_id',
      'content',
      'follow_up_type',
      'contact_person',
      'contact_method',
      'result',
      'next_action',
      'DATE_FORMAT(event_date, "%Y-%m-%d") as event_date',
      hasUpdatedAt ? 'DATE_FORMAT(updated_at, "%Y-%m-%d %H:%i:%s") as updated_at' : 'NULL as updated_at',
      hasCompletedAt ? 'DATE_FORMAT(completed_at, "%Y-%m-%d") as completed_at' : 'NULL as completed_at',
      'DATE_FORMAT(action_date, "%Y-%m-%d") as action_date',
      'DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at'
    ].join(', ')

    const sql = `
      SELECT ${selectList}
      FROM follow_up_records 
      WHERE story_id = ? 
      ORDER BY created_at DESC 
      LIMIT ${lim} OFFSET ${off}
    `

    const [rows] = await db.query(sql, [id])

    // 获取总记录数
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM follow_up_records WHERE story_id = ?',
      [id]
    )

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: rows.length === parseInt(limit)
      }
    })
  } catch (err) {
    console.error('获取跟进记录失败:', err)
    res.status(500).json({ 
      success: false,
      error: '获取跟进记录失败',
      message: err.message 
    })
  }
})

// 删除故事跟进记录
router.delete('/stories/:id/follow-up-records/:recordId', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const { id, recordId } = req.params
    const [rows] = await db.query('SELECT id, story_id FROM follow_up_records WHERE id = ?', [recordId])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: '跟进记录不存在' })
    }
    if (String(rows[0].story_id) !== String(id)) {
      return res.status(400).json({ success: false, error: '记录不属于当前故事' })
    }
    const [del] = await db.query('DELETE FROM follow_up_records WHERE id = ?', [recordId])
    if (del.affectedRows === 0) {
      return res.status(500).json({ success: false, error: '删除失败' })
    }
    res.json({ success: true, message: '跟进记录已删除', data: { id: Number(recordId) } })
  } catch (err) {
    console.error('删除故事跟进记录失败:', err)
    res.status(500).json({ success: false, error: '删除故事跟进记录失败', message: err.message })
  }
})

router.put('/stories/:id/follow-up-records/:recordId', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const { id, recordId } = req.params
    const { content, follow_up_type, contact_person, contact_method, result, next_action, event_date, next_follow_up_date } = req.body || {}
    const action_date = req.body && req.body.action_date

    const [rows] = await db.query('SELECT id, story_id, created_at, event_date FROM follow_up_records WHERE id = ?', [recordId])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: '跟进记录不存在' })
    }
    if (String(rows[0].story_id) !== String(id)) {
      return res.status(400).json({ success: false, error: '记录不属于当前故事' })
    }

    const fields = []
    const values = []
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (content !== undefined) { fields.push('content = ?'); values.push(content) }
    if (follow_up_type !== undefined) { fields.push('follow_up_type = ?'); values.push(follow_up_type) }
    if (contact_person !== undefined) { fields.push('contact_person = ?'); values.push(contact_person) }
    if (contact_method !== undefined) { fields.push('contact_method = ?'); values.push(contact_method) }
    if (result !== undefined) { fields.push('result = ?'); values.push(result) }
    if (next_action !== undefined) { fields.push('next_action = ?'); values.push(next_action) }
    if (event_date !== undefined) {
      const normalize = (s)=> String(s || '').trim().replace(/\//g,'-').slice(0,10)
      const ev = normalize(event_date)
      if (ev && !dateRegex.test(ev)) {
        return res.status(400).json({ success: false, error: '事件发生日期格式错误，应为YYYY-MM-DD格式' })
      }
      fields.push('event_date = ?'); values.push(ev || null)
    }
    if (next_follow_up_date !== undefined) {
      // 禁止通过置空取消跟进（后端不再接收或处理取消跟进的请求）
      if (!next_follow_up_date) {
        return res.status(400).json({ success: false, error: '不支持取消跟进（禁止将下次跟进时间置空）' })
      }
      if (!dateRegex.test(next_follow_up_date)) {
        return res.status(400).json({ success: false, error: '下次跟进时间格式错误，应为YYYY-MM-DD格式' })
      }
      fields.push('action_date = ?'); values.push(next_follow_up_date)
    }
    if (action_date !== undefined) {
      // 同样不允许置空
      if (!action_date) {
        return res.status(400).json({ success: false, error: '不支持取消跟进（禁止将下次跟进时间置空）' })
      }
      if (!dateRegex.test(action_date)) {
        return res.status(400).json({ success: false, error: '下次跟进时间格式错误，应为YYYY-MM-DD格式' })
      }
      fields.push('action_date = ?'); values.push(action_date)
    }
    if (req.body && req.body.completed_at !== undefined) {
      const completed_at = req.body.completed_at
      if (completed_at && !dateRegex.test(completed_at)) {
        return res.status(400).json({ success: false, error: '完成时间格式错误，应为YYYY-MM-DD格式' })
      }
      if (completed_at) {
        // 完成时间不得早于事件发生日期（若有），否则不得早于记录创建时间
        const createdDate = String(rows[0].created_at || '').slice(0, 10)
        const eventDate = String(rows[0].event_date || '').slice(0, 10)
        const baseDate = eventDate || createdDate
        const normalize = (s) => String(s || '').trim().replace(/\//g, '-').slice(0,10)
        const toNum = (s) => {
          const n = normalize(s)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return NaN
          return Number(n.replace(/-/g, ''))
        }
        if (baseDate) {
          const bn = toNum(baseDate)
          const cn = toNum(completed_at)
          if (!isNaN(bn) && !isNaN(cn) && cn < bn) {
            return res.status(400).json({ success: false, error: '完成时间不得早于事件发生日期或任务创建时间' })
          }
        }
      }
      fields.push('completed_at = ?'); values.push(completed_at || null)
    }

    // 验证干系人存在性（如提供）
    if (contact_person !== undefined && contact_person) {
      const names = String(contact_person).split(',').map(s => s.trim()).filter(Boolean)
      if (names.length > 0) {
        const placeholders = names.map(() => '?').join(',')
        const [checks] = await db.query(`SELECT COUNT(*) AS cnt FROM stakeholders WHERE name IN (${placeholders})`, names)
        const cnt = checks && checks[0] ? Number(checks[0].cnt) : 0
        if (cnt < names.length) {
          return res.status(400).json({ success: false, error: '干系人必须存在于系统中' })
        }
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有可更新的字段' })
    }

    fields.push('updated_at = NOW()')
    values.push(recordId)
    // 事务提交（单条记录原子更新）
    const [upd] = await db.query(`UPDATE follow_up_records SET ${fields.join(', ')} WHERE id = ?`, values)
    if (upd.affectedRows === 0) {
      return res.status(500).json({ success: false, error: '更新失败' })
    }
    const [ret] = await db.query('SELECT id, story_id, content, follow_up_type, contact_person, contact_method, result, next_action, event_date, created_at FROM follow_up_records WHERE id = ?', [recordId])
    res.json({ success: true, message: '跟进记录更新成功', data: ret[0] })
  } catch (err) {
    console.error('更新跟进记录失败:', err)
    res.status(500).json({ success: false, error: '更新跟进记录失败', message: err.message })
  }
})

// 管理员覆盖更新完成时间（跳过严格校验，仅做基本格式检查）
router.put('/stories/:id/follow-up-records/:recordId/override-completed-at', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const { id, recordId } = req.params
    const { completed_at } = req.body || {}
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!completed_at || !dateRegex.test(completed_at)) {
      return res.status(400).json({ success: false, error: '完成时间格式错误，应为YYYY-MM-DD格式' })
    }
    const [rows] = await db.query('SELECT id, story_id FROM follow_up_records WHERE id = ?', [recordId])
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: '跟进记录不存在' })
    if (String(rows[0].story_id) !== String(id)) return res.status(400).json({ success: false, error: '记录不属于当前故事' })

    const [upd] = await db.query('UPDATE follow_up_records SET completed_at = ?, updated_at = NOW() WHERE id = ?', [completed_at, recordId])
    if (upd.affectedRows === 0) return res.status(500).json({ success: false, error: '更新失败' })
    const [ret] = await db.query('SELECT id, story_id, completed_at FROM follow_up_records WHERE id = ?', [recordId])
    res.json({ success: true, message: '完成时间覆盖更新成功', data: ret[0] })
  } catch (err) {
    console.error('覆盖更新完成时间失败:', err)
    res.status(500).json({ success: false, error: '覆盖更新完成时间失败', message: err.message })
  }
})

// 更新故事最近一条跟进记录的备注（将备注落到同一条记录中）
router.put('/stories/:id/follow-up-records/latest-result', async (req, res) => {
  try {
    await ensureFollowUpInfra()
    const { id } = req.params
    const { result } = req.body || {}

    if (!result || typeof result !== 'string') {
      return res.status(400).json({ success: false, error: '备注内容不能为空' })
    }

    const [story] = await db.query('SELECT id FROM project_stories WHERE id = ?', [id])
    if (!story || story.length === 0) {
      return res.status(404).json({ success: false, error: '故事不存在' })
    }

    const [latestRows] = await db.query(
      'SELECT id FROM follow_up_records WHERE story_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    )

    if (!latestRows || latestRows.length === 0) {
      return res.status(404).json({ success: false, error: '暂无跟进记录' })
    }

    const latestId = latestRows[0].id
    const [upd] = await db.query('UPDATE follow_up_records SET result = ? WHERE id = ?', [result, latestId])
    if (upd.affectedRows === 0) {
      return res.status(500).json({ success: false, error: '更新备注失败' })
    }
    res.json({ success: true, data: { id: latestId, story_id: id, result } })
  } catch (err) {
    console.error('更新最近跟进记录备注失败:', err)
    res.status(500).json({ success: false, error: '更新最近跟进记录备注失败', message: err.message })
  }
})

module.exports = router
