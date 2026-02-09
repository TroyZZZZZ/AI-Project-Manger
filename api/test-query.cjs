const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testQuery() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('测试SQL查询...');
    
    const userId = 1;
    const limit = 10;
    const offset = 0;
    
    // 模拟原始查询
    const whereClause = 'WHERE (p.owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))';
    const params = [userId, userId];
    
    const projectsQuery = `
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
        CASE 
          WHEN p.owner_id = ? THEN 'owner'
          ELSE 'member'
        END as user_role
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const projectParams = [...params, userId, limit, offset];
    console.log('SQL参数:', projectParams);
    console.log('SQL查询:', projectsQuery);
    
    const [projects] = await connection.execute(projectsQuery, projectParams);
    console.log('查询成功，返回', projects.length, '个项目');
    projects.forEach(p => console.log('- 项目:', p.name, '所有者:', p.owner_id, '角色:', p.user_role));
    
  } catch (error) {
    console.error('查询失败:', error.message);
    console.error('错误代码:', error.code);
  } finally {
    await connection.end();
  }
}

testQuery();