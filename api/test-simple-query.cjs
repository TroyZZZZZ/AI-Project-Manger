const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testSimpleQuery() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('测试简单SQL查询...');
    
    const userId = 1;
    
    // 简化查询，逐步测试
    console.log('\n1. 测试基础项目查询:');
    const basicQuery = `
      SELECT p.*, u.username as creator_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 5
    `;
    
    const [basicResult] = await connection.execute(basicQuery, [userId]);
    console.log('基础查询成功，返回', basicResult.length, '个项目');
    
    console.log('\n2. 测试带子查询的查询:');
    const subQuery = `
      SELECT 
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 5
    `;
    
    const [subResult] = await connection.execute(subQuery, [userId]);
    console.log('子查询成功，返回', subResult.length, '个项目');
    
    console.log('\n3. 测试CASE WHEN查询:');
    const caseQuery = `
      SELECT 
        p.*,
        u.username as creator_name,
        CASE 
          WHEN p.owner_id = ? THEN 'owner'
          ELSE 'member'
        END as user_role
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 5
    `;
    
    const [caseResult] = await connection.execute(caseQuery, [userId, userId]);
    console.log('CASE WHEN查询成功，返回', caseResult.length, '个项目');
    caseResult.forEach(p => console.log('- 项目:', p.name, '角色:', p.user_role));
    
  } catch (error) {
    console.error('查询失败:', error.message);
    console.error('错误代码:', error.code);
    console.error('SQL状态:', error.sqlState);
  } finally {
    await connection.end();
  }
}

testSimpleQuery();