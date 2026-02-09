#!/usr/bin/env node
require('dotenv').config()
const { db } = require('../api/lib/database.cjs')

const RECORD_ID = Number(process.env.RECORD_ID || 9)

async function main() {
  console.log(`读取数据库记录 id=${RECORD_ID}`)
  const [rows] = await db.query('SELECT id, story_id, content, event_date, action_date, completed_at, updated_at, created_at FROM follow_up_records WHERE id = ?', [RECORD_ID])
  console.log('查询结果:', rows && rows[0])
  process.exit(0)
}

main().catch(err => { console.error(err.stack||err.message); process.exit(1) })

