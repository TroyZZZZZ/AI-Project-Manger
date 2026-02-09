const { db } = require('../api/lib/database.cjs');

(async () => {
  try {
    await db.connect();
    console.log('[Test] Connected to DB');

    const projectId = parseInt(process.env.TEST_PROJECT_ID || '18', 10);
    const userId = parseInt(process.env.TEST_USER_ID || '1', 10);
    const title = '测试脚本插入';
    const content = '来自脚本的内容';

    const sql = `INSERT INTO storylines (
      project_id, title, content, event_time, stakeholder_ids,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, NOW(), ?, ?, NOW(), NOW())`;
    const params = [projectId, title, content, null, userId];

    console.log('[Test] Executing SQL:', sql);
    console.log('[Test] Params:', params);
    const [result] = await db.query(sql, params);
    console.log('[Test] Insert OK, insertId:', result.insertId);
    process.exit(0);
  } catch (error) {
    console.error('[Test] Insert failed:', error.message);
    if (error && error.sql) {
      console.error('[Test] Error SQL:', error.sql);
    }
    process.exit(1);
  }
})();