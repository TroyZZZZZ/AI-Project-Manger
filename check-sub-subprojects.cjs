const { db } = require('./api/lib/database.cjs');

async function checkSubSubprojects() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    // 检查子项目16是否有子子项目
    const [subSubprojects] = await db.query(
      'SELECT id, name, parent_id FROM projects WHERE parent_id = ?',
      [16]
    );
    
    console.log('子项目16的子子项目:');
    console.table(subSubprojects);
    console.log('子子项目数量:', subSubprojects.length);
    
    console.log('检查完成');
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit(0);
  }
}

checkSubSubprojects();
