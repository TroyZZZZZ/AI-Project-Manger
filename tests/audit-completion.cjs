#!/usr/bin/env node
const assert = require('assert')

const API = process.env.API_BASE_URL || 'http://localhost:3001/api'
const TARGET_TEXT = process.env.TARGET_TEXT || '向魏健跟进本周的会议时间。'
const REMARK = process.env.REMARK || '按需完成，已对齐会议安排'

async function getJson(url) {
  const res = await fetch(url)
  const body = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(body) } } catch { return { ok: res.ok, status: res.status, data: body } }
}

async function putJson(url, payload) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(body) } } catch { return { ok: res.ok, status: res.status, data: body } }
}

async function main() {
  console.log('开始审计“标记完成”操作...')
  const followingByRecords = await getJson(`${API}/stories/following-by-records`)
  assert(followingByRecords.ok, `获取跟进中故事(记录法)失败: ${followingByRecords.status}`)
  const stories = Array.isArray(followingByRecords.data?.data) ? followingByRecords.data.data : []

  let hit = null
  for (const s of stories) {
    const r = await getJson(`${API}/stories/${s.id}/follow-up-records?limit=50&offset=0`)
    assert(r.ok, `获取故事 ${s.id} 跟进记录失败: ${r.status}`)
    const records = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data?.records) ? r.data.records : [])
    for (const rec of records) {
      if (String(rec.content||'').includes(TARGET_TEXT)) { hit = { story_id: s.id, record_id: rec.id, before: rec }; break }
    }
    if (hit) break
  }

  if (!hit) {
    console.log('未在当前跟进中数据中找到目标记录文本，结束')
    process.exit(0)
  }

  console.log(`定位到目标记录: story_id=${hit.story_id} record_id=${hit.record_id}`)
  console.log('记录变更前:', hit.before)

  const today = new Date().toISOString().slice(0,10)
  const upd = await putJson(`${API}/stories/${hit.story_id}/follow-up-records/${hit.record_id}`, { result: REMARK, completed_at: today })
  console.log('更新请求响应:', upd)
  assert(upd.ok && upd.data?.success !== false, '更新记录失败')

  const after = await getJson(`${API}/stories/${hit.story_id}/follow-up-records?limit=1&offset=0`)
  const latest = Array.isArray(after.data?.data) ? after.data.data[0] : (Array.isArray(after.data?.records) ? after.data.records[0] : null)
  console.log('记录变更后（最新一条）:', latest)

  const checkList = await getJson(`${API}/stories/following-by-records`)
  const stillListed = Array.isArray(checkList.data?.data) && checkList.data.data.some(s => Number(s.id) === Number(hit.story_id))
  console.log(`是否仍在“跟进中(记录法)”列表: ${stillListed}`)
}

main().catch(err => { console.error(err.stack||err.message); process.exit(1) })
