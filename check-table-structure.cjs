const { db } = require('./api/lib/database.cjs');

async function checkTableStructure() {
  await db.connect();

  try {
    console.log('=== 检查subprojects表结构 ===');
    
    // 查看表结构
    const [columns] = await db.query('DESCRIBE subprojects');
    
    console.log('subprojects表字段:');
    columns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} (${column.Null === 'YES' ? '可空' : '不可空'})`);
    });
    
    console.log('\n=== 查看所有子项目 ===');
    const [subprojects] = await db.query('SELECT * FROM subprojects LIMIT 10');
    
    console.log(`找到 ${subprojects.length} 个子项目:`);
    subprojects.forEach(subproject => {
      console.log(`ID: ${subproject.id}, 名称: ${subproject.name || '未命名'}`);
      console.log(`  所有字段:`, Object.keys(subproject));
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await db.close();
  }
}

checkTableStructure();