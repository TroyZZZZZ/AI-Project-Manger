const { db } = require('./api/lib/database.cjs');

async function debugStakeholderQuery() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('测试简单查询...');
    
    // 测试1: 简单查询不带LIMIT
    try {
      const [rows1] = await db.query('SELECT * FROM stakeholders WHERE project_id = ?', [4]);
      console.log('✅ 简单查询成功，结果数量:', rows1.length);
    } catch (error) {
      console.error('❌ 简单查询失败:', error.message);
    }
    
    // 测试2: 带LIMIT的查询，使用字符串
    try {
      const [rows2] = await db.query('SELECT * FROM stakeholders WHERE project_id = ? LIMIT 50 OFFSET 0', [4]);
      console.log('✅ 字符串LIMIT查询成功，结果数量:', rows2.length);
    } catch (error) {
      console.error('❌ 字符串LIMIT查询失败:', error.message);
    }
    
    // 测试3: 带LIMIT的查询，使用参数
    try {
      const [rows3] = await db.query('SELECT * FROM stakeholders WHERE project_id = ? LIMIT ? OFFSET ?', [4, 50, 0]);
      console.log('✅ 参数LIMIT查询成功，结果数量:', rows3.length);
    } catch (error) {
      console.error('❌ 参数LIMIT查询失败:', error.message);
    }
    
    // 测试4: 检查stakeholders表结构
    console.log('\n检查stakeholders表结构:');
    const [structure] = await db.query('DESCRIBE stakeholders');
    structure.forEach(field => {
      console.log(`  ${field.Field}: ${field.Type}`);
    });
    
    // 测试5: 检查现有数据
    console.log('\n检查现有干系人数据:');
    const [allStakeholders] = await db.query('SELECT id, project_id, name FROM stakeholders');
    console.log('总干系人数量:', allStakeholders.length);
    allStakeholders.forEach(s => {
      console.log(`  ID: ${s.id}, 项目: ${s.project_id}, 姓名: ${s.name}`);
    });
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    process.exit();
  }
}

debugStakeholderQuery();