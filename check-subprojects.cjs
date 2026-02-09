const { db } = require('./api/lib/database.cjs');

async function checkSubprojects() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    // 查询所有项目
    const [projects] = await db.query('SELECT id, name, parent_id, owner_id FROM projects ORDER BY id');
    console.log('所有项目:');
    console.table(projects);
    
    // 查询子项目
    const [subprojects] = await db.query('SELECT id, name, parent_id, owner_id FROM projects WHERE parent_id IS NOT NULL ORDER BY id');
    console.log('子项目:');
    console.table(subprojects);
    
    console.log('检查完成');
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit(0);
  }
}

checkSubprojects();
