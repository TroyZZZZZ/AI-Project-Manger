#!/usr/bin/env node
const assert = require('assert')

function shouldShowNextFollowUp(rec) {
  return !rec.completed_at && !!rec.action_date
}

function shouldShowCompleted(rec) {
  return !!rec.completed_at
}

const cases = [
  { name: '未完成有下一步', rec: { action_date: '2025-12-10' }, expectNext: true, expectCompleted: false },
  { name: '已完成无下一步', rec: { completed_at: '2025-12-05' }, expectNext: false, expectCompleted: true },
  { name: '已完成且有下一步(异常数据)', rec: { action_date: '2025-12-10', completed_at: '2025-12-11' }, expectNext: false, expectCompleted: true },
  { name: '未设置任何日期', rec: {}, expectNext: false, expectCompleted: false },
]

for (const c of cases) {
  assert.strictEqual(shouldShowNextFollowUp(c.rec), c.expectNext, `${c.name}: shouldShowNextFollowUp 断言失败`)
  assert.strictEqual(shouldShowCompleted(c.rec), c.expectCompleted, `${c.name}: shouldShowCompleted 断言失败`)
}

console.log('前端跟进记录显示逻辑单元测试通过')

