const express = require('express')
const router = express.Router()
const { db } = require('../lib/database.cjs')
const { StorylineService } = require('../services/storylineService.cjs')

// 确保故事线跟进相关的表与字段存在（开发友好）
async function ensureFollowUpInfrastructure() {
  // 跟进记录表
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'storyline_follow_up_records'")
    if (!Array.isArray(tables) || tables.length === 0) {
      await db.query(`
        CREATE TABLE storyline_follow_up_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          storyline_id INT NOT NULL,
          content TEXT NOT NULL,
          event_date DATE NULL,
          follow_up_type VARCHAR(64) NULL,
          contact_person VARCHAR(128) NULL,
          contact_method VARCHAR(64) NULL,
          result TEXT NULL,
          next_action TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT NOW(),
          INDEX (storyline_id)
        )
      `)
    }
    // 兼容旧表，补充event_date字段
    const [eventDateCol] = await db.query("SHOW COLUMNS FROM storyline_follow_up_records LIKE 'event_date'")
    if (!Array.isArray(eventDateCol) || eventDateCol.length === 0) {
      await db.query("ALTER TABLE storyline_follow_up_records ADD COLUMN event_date DATE NULL AFTER content")
    }
    // 补充与项目故事一致的字段：action_date、updated_at、completed_at
    const addColIfMissing = async (column, def) => {
      const [rows] = await db.query(
        "SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'storyline_follow_up_records' AND column_name = ?",
        [column]
      )
      if (!rows || rows[0].cnt === 0) {
        await db.query(`ALTER TABLE storyline_follow_up_records ADD COLUMN ${column} ${def}`)
      }
    }
    await addColIfMissing('action_date', 'DATE NULL')
    await addColIfMissing('updated_at', 'DATETIME NULL')
    await addColIfMissing('completed_at', 'DATE NULL')
  } catch (e) {
    console.warn('[StorylineFollowUp] ensure storyline_follow_up_records failed:', e.message)
  }

}

function normalizeDateTime(dt) {
  if (!dt) return null
  const s = typeof dt === 'string' ? dt.trim() : dt
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s} 00:00:00`
  }
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(s)) {
    return s.length === 16 ? `${s}:00` : s
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const HH = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`
}

// 设置故事线下次跟进时间
router.put('/:projectId/storylines/:id/next-follow-up', async (req, res) => {
  try {
    const { id } = req.params
    const { next_follow_up } = req.body
    await ensureFollowUpInfrastructure()
    if (!next_follow_up) {
      return res.status(400).json({ success: false, error: '下次跟进时间不能为空' })
    }
    const normalized = normalizeDateTime(next_follow_up)
    if (!normalized) {
      return res.status(400).json({ success: false, error: '下次跟进时间格式不正确' })
    }
    const { nextFollowUpColumn } = await StorylineService.ensureColumnMap()
    const [result] = await db.query(
      `UPDATE storylines SET ${nextFollowUpColumn} = ?, updated_at = NOW() WHERE id = ?`,
      [normalized, id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '故事线不存在' })
    }
    res.json({ success: true, message: '下次跟进时间设置成功', data: { id, next_follow_up: normalized } })
  } catch (err) {
    console.error('设置故事线下次跟进时间失败:', err)
    res.status(500).json({ success: false, error: '设置故事线下次跟进时间失败', message: err.message })
  }
})

// 清除故事线下次跟进时间
router.delete('/:projectId/storylines/:id/next-follow-up', async (req, res) => {
  try {
    const { id } = req.params
    await ensureFollowUpInfrastructure()
    const colMap = await StorylineService.ensureColumnMap()
    const [result] = await db.query(
      `UPDATE storylines SET ${colMap.nextFollowUpColumn} = NULL, updated_at = NOW() WHERE id = ?`,
      [id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '故事线不存在' })
    }
    res.json({ success: true, message: '下次跟进时间已清除', data: { id } })
  } catch (err) {
    console.error('清除故事线下次跟进时间失败:', err)
    res.status(500).json({ success: false, error: '清除故事线下次跟进时间失败', message: err.message })
  }
})

// 创建故事线跟进记录
router.post('/:projectId/storylines/:id/follow-up-records', async (req, res) => {
  try {
    const { id } = req.params
    const { content, contact_person, event_date, next_follow_up_date, follow_up_type, contact_method, result, next_action, action_date } = req.body
    await ensureFollowUpInfrastructure()

    if (!content) {
      return res.status(400).json({ success: false, error: '跟进内容不能为空' })
    }
    // 干系人改为非必填：若提供则写入，否则置为NULL
    if (!event_date) {
      return res.status(400).json({ success: false, error: '事件发生时间不能为空' })
    }
    // 简单校验日期格式 YYYY-MM-DD
    if (typeof event_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
      return res.status(400).json({ success: false, error: '事件发生时间格式需为YYYY-MM-DD' })
    }

    // 验证故事线是否存在
    const [storyline] = await db.query('SELECT id FROM storylines WHERE id = ?', [id])
    if (!storyline || storyline.length === 0) {
      return res.status(404).json({ success: false, error: '故事线不存在' })
    }

    // 规范化日期
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const normalize = (s)=> String(s || '').trim().replace(/\//g,'-').slice(0,10)
    const ev = normalize(event_date)
    if (ev && !dateRegex.test(ev)) {
      return res.status(400).json({ success: false, error: '事件发生时间格式需为YYYY-MM-DD' })
    }
    const ad = normalize(action_date || next_follow_up_date)
    if (ad && !dateRegex.test(ad)) {
      return res.status(400).json({ success: false, error: '下次跟进时间格式需为YYYY-MM-DD' })
    }

    const sql = `
      INSERT INTO storyline_follow_up_records (
        storyline_id, content, event_date, follow_up_type, contact_person,
        contact_method, result, next_action, action_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `

    const [insertResult] = await db.query(sql, [
      id, content, ev || null, follow_up_type || null, contact_person || null,
      contact_method || null, result || null, next_action || null, ad || null
    ])

    res.status(201).json({
      success: true,
      message: '跟进记录创建成功',
      data: {
        id: insertResult.insertId,
        storyline_id: id,
        content,
        event_date: ev || null,
        follow_up_type,
        contact_person,
        contact_method,
        result,
        next_action,
        action_date: ad || null,
        created_at: new Date().toISOString()
      }
    })
  } catch (err) {
    console.error('创建故事线跟进记录失败:', err)
    res.status(500).json({ success: false, error: '创建故事线跟进记录失败', message: err.message })
  }
})

// 删除故事线跟进记录
router.delete('/:projectId/storylines/:id/follow-up-records/:recordId', async (req, res) => {
  try {
    const { id, recordId } = req.params
    await ensureFollowUpInfrastructure()

    const [rows] = await db.query('SELECT id, storyline_id FROM storyline_follow_up_records WHERE id = ?', [recordId])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: '跟进记录不存在' })
    }
    if (String(rows[0].storyline_id) !== String(id)) {
      return res.status(400).json({ success: false, error: '记录不属于当前故事线' })
    }
    const [del] = await db.query('DELETE FROM storyline_follow_up_records WHERE id = ?', [recordId])
    if (del.affectedRows === 0) {
      return res.status(500).json({ success: false, error: '删除失败' })
    }
    res.json({ success: true, message: '跟进记录已删除', data: { id: Number(recordId) } })
  } catch (err) {
    console.error('删除故事线跟进记录失败:', err)
    res.status(500).json({ success: false, error: '删除故事线跟进记录失败', message: err.message })
  }
})

// 更新故事线跟进记录内容
router.put('/:projectId/storylines/:id/follow-up-records/:recordId', async (req, res) => {
  try {
    const { id, recordId } = req.params
    const { content, event_date, contact_person, next_follow_up_date, action_date, completed_at } = req.body || {}
    await ensureFollowUpInfrastructure()

    const [rows] = await db.query('SELECT id, storyline_id FROM storyline_follow_up_records WHERE id = ?', [recordId])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: '跟进记录不存在' })
    }
    if (String(rows[0].storyline_id) !== String(id)) {
      return res.status(400).json({ success: false, error: '记录不属于当前故事线' })
    }

    const fields = []
    const params = []
    if (typeof content === 'string') { fields.push('content = ?'); params.push(content) }
    if (typeof contact_person === 'string') { fields.push('contact_person = ?'); params.push(contact_person) }
    if (typeof (req.body||{}).result === 'string') { fields.push('result = ?'); params.push(String((req.body||{}).result)) }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const normalize = (s)=> String(s || '').trim().replace(/\//g,'-').slice(0,10)
    if (typeof event_date !== 'undefined') {
      const ev = normalize(event_date)
      if (ev && !dateRegex.test(ev)) {
        return res.status(400).json({ success: false, error: '事件发生时间格式错误，应为YYYY-MM-DD格式' })
      }
      fields.push('event_date = ?'); params.push(ev || null)
    }
    if (typeof next_follow_up_date !== 'undefined') {
      if (!next_follow_up_date) {
        return res.status(400).json({ success: false, error: '不支持取消跟进（禁止将下次跟进时间置空）' })
      }
      if (!dateRegex.test(next_follow_up_date)) {
        return res.status(400).json({ success: false, error: '下次跟进时间格式错误，应为YYYY-MM-DD格式' })
      }
      fields.push('action_date = ?'); params.push(next_follow_up_date)
    }
    if (typeof action_date !== 'undefined') {
      if (!action_date) {
        return res.status(400).json({ success: false, error: '不支持取消跟进（禁止将下次跟进时间置空）' })
      }
      if (!dateRegex.test(action_date)) {
        return res.status(400).json({ success: false, error: '下次跟进时间格式错误，应为YYYY-MM-DD格式' })
      }
      fields.push('action_date = ?'); params.push(action_date)
    }
    if (typeof completed_at !== 'undefined') {
      const ca = normalize(completed_at)
      if (ca && !dateRegex.test(ca)) {
        return res.status(400).json({ success: false, error: '完成时间格式错误，应为YYYY-MM-DD格式' })
      }
      if (ca) {
        const [createdRows] = await db.query('SELECT created_at, event_date FROM storyline_follow_up_records WHERE id = ?', [recordId])
        const createdDate = String((createdRows && createdRows[0] && createdRows[0].created_at) || '').slice(0,10)
        const eventDate = String((createdRows && createdRows[0] && createdRows[0].event_date) || '').slice(0,10)
        const baseDate = eventDate || createdDate
        const toNum = (s)=> Number(String(s).replace(/-/g,''))
        if (baseDate && !isNaN(toNum(baseDate)) && !isNaN(toNum(ca)) && toNum(ca) < toNum(baseDate)) {
          return res.status(400).json({ success: false, error: '完成时间不得早于事件发生日期或任务创建时间' })
        }
      }
      fields.push('completed_at = ?'); params.push(ca || null)
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '未提供可更新的字段' })
    }

    // 更新时间戳
    fields.push('updated_at = NOW()')
    params.push(recordId)
    const [upd] = await db.query(`UPDATE storyline_follow_up_records SET ${fields.join(', ')} WHERE id = ?`, params)
    if (upd.affectedRows === 0) {
      return res.status(500).json({ success: false, error: '更新失败' })
    }

    res.json({ success: true, data: { id: Number(recordId) } })
  } catch (err) {
    console.error('更新故事线跟进记录失败:', err)
    res.status(500).json({ success: false, error: '更新故事线跟进记录失败', message: err.message })
  }
})

// 获取故事线跟进记录
router.get('/:projectId/storylines/:id/follow-up-records', async (req, res) => {
  try {
    const { id } = req.params
    const { limit = 50, offset = 0 } = req.query
    await ensureFollowUpInfrastructure()

    const [storyline] = await db.query('SELECT id FROM storylines WHERE id = ?', [id])
    if (!storyline || storyline.length === 0) {
      return res.status(404).json({ success: false, error: '故事线不存在' })
    }

    const lim = Number(limit) || 50
    const off = Number(offset) || 0
    const sql = `
      SELECT id, storyline_id, content,
             DATE_FORMAT(event_date, "%Y-%m-%d") as event_date,
             follow_up_type, contact_person, contact_method, result, next_action,
             DATE_FORMAT(action_date, "%Y-%m-%d") as action_date,
             DATE_FORMAT(completed_at, "%Y-%m-%d") as completed_at,
             DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at,
             DATE_FORMAT(updated_at, "%Y-%m-%d %H:%i:%s") as updated_at
      FROM storyline_follow_up_records
      WHERE storyline_id = ?
      ORDER BY created_at DESC
      LIMIT ${lim} OFFSET ${off}
    `
    const [rows] = await db.query(sql, [id])
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM storyline_follow_up_records WHERE storyline_id = ?', [id])

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
    console.error('获取故事线跟进记录失败:', err)
    res.status(500).json({ success: false, error: '获取故事线跟进记录失败', message: err.message })
  }
})

// 更新最近一条跟进记录的备注（将备注落到同一条记录中）
router.put('/:projectId/storylines/:id/follow-up-records/latest-result', async (req, res) => {
  try {
    const { id } = req.params
    const { result } = req.body || {}
    await ensureFollowUpInfrastructure()

    if (!result || typeof result !== 'string') {
      return res.status(400).json({ success: false, error: '备注内容不能为空' })
    }

    const [storyline] = await db.query('SELECT id FROM storylines WHERE id = ?', [id])
    if (!storyline || storyline.length === 0) {
      return res.status(404).json({ success: false, error: '故事线不存在' })
    }

    const [latestRows] = await db.query(
      'SELECT id FROM storyline_follow_up_records WHERE storyline_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    )

    if (!latestRows || latestRows.length === 0) {
      // 若无记录，自动创建一条记录再写入备注
      const [insertRes] = await db.query(
        'INSERT INTO storyline_follow_up_records (storyline_id, content, event_date, follow_up_type, contact_person, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [id, '完成', new Date().toISOString().slice(0,10), 'note', '系统']
      )
      await db.query('UPDATE storyline_follow_up_records SET result = ? WHERE id = ?', [result, insertRes.insertId])
      return res.json({ success: true, data: { id: insertRes.insertId, storyline_id: id, result } })
    }

    const latestId = latestRows[0].id
    const [upd] = await db.query('UPDATE storyline_follow_up_records SET result = ? WHERE id = ?', [result, latestId])
    if (upd.affectedRows === 0) {
      return res.status(500).json({ success: false, error: '更新备注失败' })
    }
    res.json({ success: true, data: { id: latestId, storyline_id: id, result } })
  } catch (err) {
    console.error('更新最近跟进记录备注失败:', err)
    res.status(500).json({ success: false, error: '更新最近跟进记录备注失败', message: err.message })
  }
})

// 合并两条跟进记录：将 source 的内容作为备注并合并到 target，然后删除 source
router.post('/:projectId/storylines/:id/follow-up-records/merge', async (req, res) => {
  try {
    const { id } = req.params
    const { source_id, target_id, label = '已完成备注' } = req.body || {}
    await ensureFollowUpInfrastructure()

    if (!source_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少 source_id 或 target_id' })
    }

    const [sourceRows] = await db.query('SELECT * FROM storyline_follow_up_records WHERE id = ?', [source_id])
    const [targetRows] = await db.query('SELECT * FROM storyline_follow_up_records WHERE id = ?', [target_id])
    if (!sourceRows || sourceRows.length === 0) {
      return res.status(404).json({ success: false, error: '源记录不存在' })
    }
    if (!targetRows || targetRows.length === 0) {
      return res.status(404).json({ success: false, error: '目标记录不存在' })
    }
    const source = sourceRows[0]
    const target = targetRows[0]
    if (String(source.storyline_id) !== String(target.storyline_id) || String(target.storyline_id) !== String(id)) {
      return res.status(400).json({ success: false, error: '两条记录不属于同一故事线' })
    }

    const appended = `[${label}] ${source.content}`
    const newResult = target.result ? `${target.result}\n${appended}` : appended
    await db.query('UPDATE storyline_follow_up_records SET result = ? WHERE id = ?', [newResult, target_id])
    await db.query('DELETE FROM storyline_follow_up_records WHERE id = ?', [source_id])

    res.json({ success: true, data: { merged_into: target_id, deleted: source_id, result: newResult } })
  } catch (err) {
    console.error('合并跟进记录失败:', err)
    res.status(500).json({ success: false, error: '合并跟进记录失败', message: err.message })
  }
})

// 获取跟进中的故事线列表（可选逾期过滤）
router.get('/:projectId/storylines/following', async (req, res) => {
  try {
    const { projectId } = req.params
    const { overdue = 'false' } = req.query
    await ensureFollowUpInfrastructure()
    const colMap = await StorylineService.ensureColumnMap()

    let sql = `
      SELECT 
        s.id,
        s.project_id,
        s.title,
        s.${colMap.contentColumn} as content,
        s.event_time,
        s.stakeholder_ids,
        s.${colMap.nextFollowUpColumn} as next_follow_up,
        s.created_at,
        s.updated_at,
        p.name as project_name
      FROM storylines s
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.project_id = ? AND s.${colMap.nextFollowUpColumn} IS NOT NULL
    `

    const params = [parseInt(projectId)]
    if (overdue === 'true') {
      sql += ' AND s.' + colMap.nextFollowUpColumn + ' < NOW()'
    }
    sql += ' ORDER BY s.' + colMap.nextFollowUpColumn + ' ASC, s.created_at DESC'

    const [rows] = await db.query(sql, params)
    res.json({ success: true, data: rows, count: rows.length })
  } catch (err) {
    console.error('获取跟进中的故事线列表失败:', err)
    res.status(500).json({ success: false, error: '获取跟进中的故事线列表失败', message: err.message })
  }
})

// 基于记录的跟进中故事线（最新记录存在 action_date 且未完成）
router.get('/storylines/following-by-records', async (req, res) => {
  try {
    await ensureFollowUpInfrastructure()
    const colMap = await StorylineService.ensureColumnMap()
    const sql = `
      SELECT s.id, s.project_id, s.title, s.${colMap.contentColumn} as content,
             s.event_time, s.stakeholder_ids, s.created_at, s.updated_at,
             p.name as project_name
      FROM storylines s
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.id IN (
        SELECT r.storyline_id FROM (
          SELECT storyline_id, MAX(created_at) AS latest_created
          FROM storyline_follow_up_records
          GROUP BY storyline_id
        ) t
        JOIN storyline_follow_up_records r
          ON r.storyline_id = t.storyline_id AND r.created_at = t.latest_created
        WHERE r.action_date IS NOT NULL AND (r.completed_at IS NULL)
      )
    `
    const [rows] = await db.query(sql)
    res.json({ success: true, data: rows, count: rows.length })
  } catch (err) {
    console.error('获取基于记录的跟进中故事线失败:', err)
    res.status(500).json({ success: false, error: '获取基于记录的跟进中故事线失败', message: err.message })
  }
})

router.get('/storylines/next-follow-ups', async (req, res) => {
  try {
    await ensureFollowUpInfrastructure()
    const colMap = await StorylineService.ensureColumnMap()
    const sql = `
      SELECT 
        s.id,
        s.project_id,
        s.title,
        s.${colMap.contentColumn} AS content,
        s.${colMap.nextFollowUpColumn} AS next_follow_up,
        p.name AS project_name,
        (
          SELECT r.content FROM storyline_follow_up_records r 
          WHERE r.storyline_id = s.id 
          ORDER BY r.created_at DESC LIMIT 1
        ) AS last_record_content,
        (
          SELECT r.event_date FROM storyline_follow_up_records r 
          WHERE r.storyline_id = s.id 
          ORDER BY r.created_at DESC LIMIT 1
        ) AS last_record_event_date,
        (
          SELECT r.created_at FROM storyline_follow_up_records r 
          WHERE r.storyline_id = s.id 
          ORDER BY r.created_at DESC LIMIT 1
        ) AS last_record_created_at
      FROM storylines s
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.${colMap.nextFollowUpColumn} IS NOT NULL
      ORDER BY s.${colMap.nextFollowUpColumn} ASC, s.created_at DESC
    `
    const [rows] = await db.query(sql)
    res.json({ success: true, data: rows, count: rows.length })
  } catch (err) {
    console.error('获取有跟进时间的故事线失败:', err)
    res.status(500).json({ success: false, error: '获取有跟进时间的故事线失败', message: err.message })
  }
})

module.exports = router
