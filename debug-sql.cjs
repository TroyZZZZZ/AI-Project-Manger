require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function debugSQL() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Connected to database');

  // 测试简单查询
  try {
    const simpleQuery = `
      SELECT 
        p.*,
        u.username as creator_name,
        u.email as creator_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ?
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const params = ['1', '10', '0'];
    console.log('执行简单查询...');
    console.log('SQL:', simpleQuery);
    console.log('参数:', params);
    console.log('参数类型:', params.map(p => typeof p));
    
    const [results] = await connection.execute(simpleQuery, params);
    console.log('简单查询成功，结果数量:', results.length);
    
    // 测试带子查询的查询
    const complexQuery = `
      SELECT 
        p.*,
        u.username as creator_name,
        u.email as creator_email,
        (
          SELECT COUNT(*) FROM tasks t 
          WHERE t.project_id = p.id
        ) as task_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ?
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log('\n执行带子查询的查询...');
    console.log('SQL:', complexQuery);
    console.log('参数:', params);
    
    const [complexResults] = await connection.execute(complexQuery, params);
    console.log('带子查询的查询成功，结果数量:', complexResults.length);
    
    // 测试完整查询
    const fullQuery = `
      SELECT 
        p.*,
        u.username as creator_name,
        u.email as creator_email,
        (
          SELECT COUNT(*) FROM tasks t 
          WHERE t.project_id = p.id
        ) as task_count,
        (
          SELECT COUNT(*) FROM tasks t 
          WHERE t.project_id = p.id AND t.status = 'done'
        ) as completed_task_count,
        (
          SELECT COUNT(*) FROM project_members pm 
          WHERE pm.project_id = p.id
        ) + 1 as member_count,
        'owner' as user_role
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ?
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log('\n执行完整查询...');
    console.log('SQL:', fullQuery);
    console.log('参数:', params);
    
    const [fullResults] = await connection.execute(fullQuery, params);
    console.log('完整查询成功，结果数量:', fullResults.length);
    console.log('第一个结果:', fullResults[0]);
    
  } catch (error) {
    console.error('查询失败:', error);
  }

  await connection.end();
}

debugSQL().catch(console.error);