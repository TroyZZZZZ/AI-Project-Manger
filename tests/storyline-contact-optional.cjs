#!/usr/bin/env node
const assert = require('assert')

const API = process.env.API_BASE_URL || 'http://localhost:3001/api'
const PROJECT_ID = process.env.PROJECT_ID || '31'
const STORYLINE_ID = process.env.STORYLINE_ID || '20'

async function postJson(url, payload) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await res.text()
  let data
  try { data = JSON.parse(body) } catch { throw new Error(`非JSON响应: ${url}\n${body}`) }
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || `请求失败 ${res.status}`)
  return data
}

async function main() {
  console.log('验证故事线跟进登记：干系人可选')
  const today = new Date().toISOString().slice(0,10)
  const payload = { content: 'TEST optional contact', event_date: today, action_date: today }
  const resp = await postJson(`${API}/projects/${PROJECT_ID}/storylines/${STORYLINE_ID}/follow-up-records`, payload)
  assert(resp && resp.success !== false, '创建返回失败')
  const rec = resp.data
  assert(rec && rec.id, '无记录ID返回')
  console.log(`创建成功，记录ID=${rec.id}，contact_person=${rec.contact_person ?? 'NULL'}`)
}

main().catch(err => { console.error(err.stack||err.message); process.exit(1) })

