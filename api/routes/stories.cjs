const express = require('express')
const router = express.Router()
const { db } = require('../lib/database.cjs')

// 创建项目故事
router.post('/', async (req, res) => {
  try {
    const { subproject_id, story_name, time, stakeholders, content } = req.body

    if (!subproject_id || !content) {
      return res.status(400).json({ error: '子项目ID和故事内容不能为空' })
    }

    if (!story_name || story_name.trim() === '') {
      return res.status(400).json({ error: '故事名不能为空' })
    }

    // 处理时间格式 - 将ISO 8601格式转换为MySQL DATETIME格式
    let formattedTime = time
    if (time && typeof time === 'string') {
      try {
        const date = new Date(time)
        if (!isNaN(date.getTime())) {
          // 转换为MySQL DATETIME格式 (YYYY-MM-DD HH:MM:SS)
          formattedTime = date.toISOString().slice(0, 19).replace('T', ' ')
        }
      } catch (err) {
        console.warn('时间格式转换失败，使用原始值:', time)
      }
    }

    const sql = `
      INSERT INTO project_stories (subproject_id, story_name, time, stakeholders, content, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `

    const [result] = await db.query(sql, [subproject_id, story_name, formattedTime, stakeholders, content])

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        subproject_id,
        story_name,
        time,
        stakeholders,
        content,
        created_at: new Date().toISOString()
      }
    })
  } catch (err) {
    console.error('创建项目故事失败:', err)
    res.status(500).json({ 
      success: false,
      error: '创建项目故事失败',
      message: err.message 
    })
  }
})

// 获取子项目的所有故事
router.get('/subproject/:subprojectId', async (req, res) => {
  try {
    const { subprojectId } = req.params

    const sql = `
      SELECT * FROM project_stories 
      WHERE subproject_id = ? 
      ORDER BY time DESC, created_at DESC
    `

    const [rows] = await db.query(sql, [subprojectId])

    res.json({
      success: true,
      data: rows
    })
  } catch (err) {
    console.error('获取项目故事失败:', err)
    res.status(500).json({ 
      success: false,
      error: '获取项目故事失败',
      message: err.message 
    })
  }
})

// 获取单个故事详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const sql = 'SELECT * FROM project_stories WHERE id = ?'

    const [rows] = await db.query(sql, [id])

    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: '故事不存在' 
      })
    }

    res.json({
      success: true,
      data: rows[0]
    })
  } catch (err) {
    console.error('获取故事详情失败:', err)
    res.status(500).json({ 
      success: false,
      error: '获取故事详情失败',
      message: err.message 
    })
  }
})

// 更新项目故事
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { story_name, time, stakeholders, content, next_reminder_date } = req.body

    if (!content) {
      return res.status(400).json({ error: '故事内容不能为空' })
    }

    if (!story_name || story_name.trim() === '') {
      return res.status(400).json({ error: '故事名不能为空' })
    }

    // 处理时间格式 - 将ISO 8601格式转换为MySQL DATETIME格式
    let formattedTime = time
    if (time && typeof time === 'string') {
      try {
        const date = new Date(time)
        if (!isNaN(date.getTime())) {
          // 转换为MySQL DATETIME格式 (YYYY-MM-DD HH:MM:SS)
          formattedTime = date.toISOString().slice(0, 19).replace('T', ' ')
        }
      } catch (err) {
        console.warn('时间格式转换失败，使用原始值:', time)
      }
    }

    // 构建更新语句，只更新提供的字段
    let sql = 'UPDATE project_stories SET '
    const params = []
    const updates = []

    if (story_name !== undefined) {
      updates.push('story_name = ?')
      params.push(story_name)
    }
    if (time !== undefined) {
      updates.push('time = ?')
      params.push(formattedTime)
    }
    if (stakeholders !== undefined) {
      updates.push('stakeholders = ?')
      params.push(stakeholders)
    }
    if (content !== undefined) {
      updates.push('content = ?')
      params.push(content)
    }
    if (next_reminder_date !== undefined) {
      updates.push('next_reminder_date = ?')
      params.push(next_reminder_date)
    }

    // 添加更新时间
    updates.push('updated_at = NOW()')

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: '没有提供要更新的字段' 
      })
    }

    sql += updates.join(', ') + ' WHERE id = ?'
    params.push(id)

    const [result] = await db.query(sql, params)

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: '故事不存在' 
      })
    }

    res.json({ 
      success: true,
      message: '故事更新成功' 
    })
  } catch (err) {
    console.error('更新项目故事失败:', err)
    res.status(500).json({ 
      success: false,
      error: '更新项目故事失败',
      message: err.message 
    })
  }
})

// 删除项目故事
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const sql = 'DELETE FROM project_stories WHERE id = ?'

    const [result] = await db.query(sql, [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: '故事不存在' 
      })
    }

    res.json({ 
      success: true,
      message: '故事删除成功' 
    })
  } catch (err) {
    console.error('删除项目故事失败:', err)
    res.status(500).json({ 
      success: false,
      error: '删除项目故事失败',
      message: err.message 
    })
  }
})

module.exports = router
