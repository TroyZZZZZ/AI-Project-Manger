const express = require('express');
const { StakeholderService } = require('../services/stakeholderService.cjs');

const router = express.Router();

// 获取所有项目的干系人列表（分页，可搜索/按类型过滤）
router.get('/stakeholders', async (req, res) => {
  try {
    const userId = 1; // 单用户系统，固定用户ID为1
    const { page = 1, limit = 50, type, search, excludeResigned } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      search,
      excludeResigned: excludeResigned === 'true'
    };

    const result = await StakeholderService.getAllStakeholders(userId, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取全部干系人失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取干系人失败'
    });
  }
});

// 批量更新身份类型：将所有 from 类型修改为 to 类型（全局）
router.post('/stakeholders/identity-types/batch-update', async (req, res) => {
  try {
    const { from, to } = req.body || {}
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from 与 to 不能为空' })
    }
    const { db } = require('../lib/database.cjs')
    const [result] = await db.query('UPDATE stakeholders SET identity_type = ? WHERE identity_type = ?', [to, from])
    res.json({ success: true, data: { affected: result.affectedRows, from, to } })
  } catch (error) {
    console.error('批量更新身份类型失败:', error)
    res.status(500).json({ success: false, message: error.message || '批量更新身份类型失败' })
  }
});

// 规范化身份类型：去除空格并统一为目标类型
router.post('/stakeholders/identity-types/normalize', async (req, res) => {
  try {
    const { target = '内部' } = req.body || {}
  const { db } = require('../lib/database.cjs')
  const [result] = await db.query('UPDATE stakeholders SET identity_type = ? WHERE REPLACE(REPLACE(identity_type, " ", ""), " ", "") = ? AND identity_type <> ?', [target, target, target])
    res.json({ success: true, data: { affected: result.affectedRows, target } })
  } catch (error) {
    console.error('规范化身份类型失败:', error)
    res.status(500).json({ success: false, message: error.message || '规范化身份类型失败' })
  }
})

// 根据姓名在同项目内删除重复干系人，仅保留每个项目中ID最小的一条
router.post('/stakeholders/deduplicate-by-name', async (req, res) => {
  try {
    const { name, projectId } = req.body || {}
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, message: 'name 不能为空' })
    }
    const { db } = require('../lib/database.cjs')

    // 查询目标姓名的记录（可选按项目过滤），按项目分组
    const normalizeName = String(name).trim()
    const params = []
    let where = 'WHERE REPLACE(REPLACE(s.name, " ", ""), "\u00A0", "") = REPLACE(REPLACE(?, " ", ""), "\u00A0", "")'
    params.push(normalizeName)
    if (projectId) {
      where += ' AND s.project_id = ?'
      params.push(parseInt(projectId))
    }

    const [rows] = await db.query(
      `SELECT s.id, s.project_id FROM stakeholders s ${where} ORDER BY s.project_id ASC, s.id ASC`,
      params
    )

    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: { affected: 0, message: '未找到匹配记录' } })
    }

    // 计算每个项目内需要删除的ID（保留每个项目的最小ID）
    const toDelete = []
    const groups = new Map()
    for (const r of rows) {
      const pid = r.project_id
      if (!groups.has(pid)) groups.set(pid, [])
      groups.get(pid).push(r.id)
    }

    for (const [pid, ids] of groups.entries()) {
      if (ids.length > 1) {
        ids.sort((a, b) => a - b)
        const keep = ids[0]
        const del = ids.slice(1)
        toDelete.push(...del)
      }
    }

    let affected = 0
    if (toDelete.length > 0) {
      const [result] = await db.query(
        `DELETE FROM stakeholders WHERE id IN (${toDelete.map(() => '?').join(',')})`,
        toDelete
      )
      affected = result.affectedRows || 0
    }

    res.json({ success: true, data: { affected, deleted_ids: toDelete } })
  } catch (error) {
    console.error('按姓名去重删除失败:', error)
    res.status(500).json({ success: false, message: error.message || '去重删除失败' })
  }
})

// 全局按姓名删除一个重复（若存在2条及以上），优先删除ID最大的记录；可选限定项目
router.post('/stakeholders/delete-one-duplicate-by-name', async (req, res) => {
  try {
    const { name, projectId } = req.body || {}
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, message: 'name 不能为空' })
    }
    const { db } = require('../lib/database.cjs')

    const normalizeName = String(name).trim()
    const params = []
    let where = 'WHERE REPLACE(REPLACE(s.name, " ", ""), "\u00A0", "") = REPLACE(REPLACE(?, " ", ""), "\u00A0", "")'
    params.push(normalizeName)
    if (projectId) {
      where += ' AND s.project_id = ?'
      params.push(parseInt(projectId))
    }

    const [rows] = await db.query(
      `SELECT s.id, s.project_id FROM stakeholders s ${where} ORDER BY s.id ASC`,
      params
    )

    if (!rows || rows.length < 2) {
      return res.json({ success: true, data: { affected: 0, message: '无可删除的重复记录' } })
    }

    // 删除ID最大的那条
    const targetId = rows[rows.length - 1].id
    const [result] = await db.query('DELETE FROM stakeholders WHERE id = ?', [targetId])
    return res.json({ success: true, data: { affected: result.affectedRows || 0, deleted_id: targetId } })
  } catch (error) {
    console.error('按姓名删除一个重复失败:', error)
    res.status(500).json({ success: false, message: error.message || '删除重复失败' })
  }
})

// 全量去重：按项目+规范化后的姓名，每组仅保留ID最小的一条
router.post('/stakeholders/deduplicate-all', async (req, res) => {
  try {
    const { db } = require('../lib/database.cjs')
    const [rows] = await db.query(
      `SELECT s.id, s.project_id, REPLACE(REPLACE(s.name, " ", ""), "\u00A0", "") AS norm_name
       FROM stakeholders s
       ORDER BY s.project_id ASC, norm_name ASC, s.id ASC`
    )
    if (!rows || rows.length === 0) return res.json({ success: true, data: { affected: 0, deleted_ids: [] } })
    const toDelete = []
    const groups = new Map()
    for (const r of rows) {
      const key = `${r.project_id}::${r.norm_name}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(r.id)
    }
    for (const ids of groups.values()) {
      if (ids.length > 1) {
        ids.sort((a,b)=>a-b)
        toDelete.push(...ids.slice(1))
      }
    }
    let affected = 0
    if (toDelete.length > 0) {
      const [result] = await db.query(`DELETE FROM stakeholders WHERE id IN (${toDelete.map(()=>'?').join(',')})`, toDelete)
      affected = result.affectedRows || 0
    }
    return res.json({ success: true, data: { affected, deleted_ids: toDelete } })
  } catch (error) {
    console.error('全量去重失败:', error)
    res.status(500).json({ success: false, message: error.message || '全量去重失败' })
  }
})

module.exports = router;
