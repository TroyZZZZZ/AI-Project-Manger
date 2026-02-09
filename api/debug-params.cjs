const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function debugParams() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('调试SQL参数绑定问题...');
    
    const userId = 1;
    const limit = 10;
    const offset = 0;
    
    // 模拟原始查询参数
    let whereConditions = [];
    let params = [];
    
    // 基础查询：用户参与的项目
    whereConditions.push(`(
      p.owner_id = ? OR 
      EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = ?
      )
    )`);
    params.push(userId, userId);
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    console.log('WHERE条件:', whereClause);
    console.log('WHERE参数:', params);
    
    // 测试计数查询
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM projects p
      ${whereClause}
    `;
    
    console.log('\n测试计数查询:');
    console.log('SQL:', countQuery);
    console.log('参数:', params);
    
    const [countResult] = await connection.execute(countQuery, params);
    console.log('计数查询成功，总数:', countResult[0].total);
    
    // 测试项目查询 - 简化版本
    const simpleQuery = `
      SELECT 
        p.*,
        u.username as creator_name,
        u.email as creator_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const simpleParams = [...params, limit, offset];
    console.log('\n测试简化项目查询:');
    console.log('SQL:', simpleQuery);
    console.log('参数:', simpleParams);
    console.log('参数数量:', simpleParams.length);
    
    const [simpleResult] = await connection.execute(simpleQuery, simpleParams);
    console.log('简化查询成功，返回', simpleResult.length, '个项目');
    
  } catch (error) {
    console.error('查询失败:', error.message);
    console.error('错误代码:', error.code);
    console.error('SQL状态:', error.sqlState);
  } finally {
    await connection.end();
  }
}

debugParams();