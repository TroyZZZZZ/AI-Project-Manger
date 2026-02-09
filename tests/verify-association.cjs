#!/usr/bin/env node
const assert = require('assert')

const API = process.env.API_BASE_URL || 'http://localhost:3001/api'
const PROJECT_ID = process.env.PROJECT_ID || '31'

async function getJson(url) {
  const res = await fetch(url)
  const body = await res.text()
  try { return JSON.parse(body) } catch { throw new Error(`非JSON响应: ${url}\n${body}`) }
}

async function main() {
  console.log(`验证项目 ${PROJECT_ID} 的跟进记录关联一致性...`)
  const subRes = await getJson(`${API}/projects/${PROJECT_ID}/subprojects`)
  assert(subRes.success !== false, '获取子项目列表失败')
  const subprojects = Array.isArray(subRes.data) ? subRes.data : []
  const recordIdToStory = new Map()
  const suspiciousContents = ['准备相关介绍材料发给沈']
  const foundSuspicious = []

  for (const sp of subprojects) {
    const storiesRes = await getJson(`${API}/stories/subproject/${sp.id}`)
    const stories = Array.isArray(storiesRes.data) ? storiesRes.data : []
    for (const s of stories) {
      const fr = await getJson(`${API}/stories/${s.id}/follow-up-records?limit=200&offset=0`)
      const records = Array.isArray(fr.data) ? fr.data : (Array.isArray(fr.records) ? fr.records : [])
      for (const r of records) {
        if (recordIdToStory.has(r.id)) {
          const other = recordIdToStory.get(r.id)
          throw new Error(`跟进记录ID ${r.id} 同时出现在两个故事下: ${other} 与 ${s.id}`)
        }
        recordIdToStory.set(r.id, s.id)
        if (suspiciousContents.some(txt => String(r.content||'').includes(txt))) {
          foundSuspicious.push({ record_id: r.id, story_id: s.id, subproject_id: sp.id, content: r.content })
        }
      }
    }
  }

  console.log(`已扫描 ${recordIdToStory.size} 条跟进记录，未发现跨故事重复ID`)
  if (foundSuspicious.length > 0) {
    console.log('定位到目标记录:')
    for (const f of foundSuspicious) {
      console.log(`- 记录 ${f.record_id} 属于故事 ${f.story_id} (子项目 ${f.subproject_id}) 内容: ${f.content}`)
    }
    const uniqStories = new Set(foundSuspicious.map(f=>f.story_id))
    assert(uniqStories.size === 1, '目标记录出现在多个故事下，存在数据关联错误')
  } else {
    console.log('未在扫描中找到目标记录文本，跳过针对性校验')
  }

  console.log('数据库关联验证通过')
}

main().catch(err => { console.error(err.stack||err.message); process.exit(1) })
