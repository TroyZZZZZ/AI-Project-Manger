const express = require('express')
const { db } = require('../lib/database.cjs')

const router = express.Router()

async function ensureIdentityTypesTable() {
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'stakeholder_identity_types'")
    if (!Array.isArray(tables) || tables.length === 0) {
      await db.query(`
        CREATE TABLE stakeholder_identity_types (
          id INT AUTO_INCREMENT PRIMARY KEY,
          value VARCHAR(128) NOT NULL UNIQUE,
          label VARCHAR(128) NOT NULL,
          color VARCHAR(64) NULL,
          created_at DATETIME NOT NULL DEFAULT NOW(),
          updated_at DATETIME NOT NULL DEFAULT NOW()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
    }
    // 颜色列兼容
    const [colorCol] = await db.query("SHOW COLUMNS FROM stakeholder_identity_types LIKE 'color'")
    if (!Array.isArray(colorCol) || colorCol.length === 0) {
      await db.query("ALTER TABLE stakeholder_identity_types ADD COLUMN color VARCHAR(64) NULL")
    }
  } catch (e) {
    console.warn('[IdentityTypes] ensure table failed:', e.message)
  }
}

// 获取身份类型列表
router.get('/identity-types', async (req, res) => {
  try {
    await ensureIdentityTypesTable()
    const [rows] = await db.query('SELECT value, label, color FROM stakeholder_identity_types ORDER BY id ASC')
    // 若为空则初始化默认
    if (!rows || rows.length === 0) {
      const defaults = [
        { value: '供应商', label: '供应商', color: 'bg-blue-100 text-blue-800' },
        { value: '苏州科技股权服务', label: '苏州科技股权服务', color: 'bg-green-100 text-green-800' },
        { value: '国交建设方', label: '国交建设方', color: 'bg-gray-100 text-gray-800' },
        { value: '大赛甲方', label: '大赛甲方', color: 'bg-gray-100 text-gray-800' },
        { value: '内部', label: '内部', color: 'bg-gray-100 text-gray-800' },
      ]
      for (const d of defaults) {
        await db.query('INSERT INTO stakeholder_identity_types (value, label, color) VALUES (?, ?, ?)', [d.value, d.label, d.color])
      }
      return res.json({ success: true, data: defaults })
    }
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('获取身份类型失败:', err)
    res.status(500).json({ success: false, error: '获取身份类型失败', message: err.message })
  }
})

// 批量保存身份类型（替换）
router.put('/identity-types', async (req, res) => {
  try {
    await ensureIdentityTypesTable()
    const list = Array.isArray(req.body?.list) ? req.body.list : []
    await db.query('DELETE FROM stakeholder_identity_types')
    for (const item of list) {
      const { value, label, color } = item
      if (!value || !label) continue
      await db.query('INSERT INTO stakeholder_identity_types (value, label, color) VALUES (?, ?, ?)', [value, label, color || null])
    }
    res.json({ success: true, data: list })
  } catch (err) {
    console.error('保存身份类型失败:', err)
    res.status(500).json({ success: false, error: '保存身份类型失败', message: err.message })
  }
})

// 新增单个身份类型
router.post('/identity-types', async (req, res) => {
  try {
    await ensureIdentityTypesTable()
    const { value, label, color } = req.body || {}
    if (!value || !label) {
      return res.status(400).json({ success: false, error: 'value 和 label 不能为空' })
    }
    await db.query('INSERT INTO stakeholder_identity_types (value, label, color) VALUES (?, ?, ?)', [value, label, color || null])
    res.status(201).json({ success: true, data: { value, label, color: color || null } })
  } catch (err) {
    console.error('新增身份类型失败:', err)
    res.status(500).json({ success: false, error: '新增身份类型失败', message: err.message })
  }
})

// 删除身份类型
router.delete('/identity-types/:value', async (req, res) => {
  try {
    await ensureIdentityTypesTable()
    const { value } = req.params
    const [del] = await db.query('DELETE FROM stakeholder_identity_types WHERE value = ?', [value])
    if (del.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '身份类型不存在' })
    }
    res.json({ success: true, data: { value } })
  } catch (err) {
    console.error('删除身份类型失败:', err)
    res.status(500).json({ success: false, error: '删除身份类型失败', message: err.message })
  }
})

module.exports = router
