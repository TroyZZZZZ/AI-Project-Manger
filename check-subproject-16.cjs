const { db } = require('./api/lib/database.cjs');

async function checkSubproject16() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    // 查询子项目16的详细信息
    const [subproject] = await db.query(
      'SELECT id, name, parent_id, owner_id FROM projects WHERE id = ?',
      [16]
    );
    
    console.log('子项目16的信息:');
    console.table(subproject);
    
    // 查询父项目4的信息
    const [parentProject] = await db.query(
      'SELECT id, name, parent_id, owner_id FROM projects WHERE id = ?',
      [4]
    );
    
    console.log('父项目4的信息:');
    console.table(parentProject);
    
    // 检查查询条件
    console.log('检查删除条件:');
    console.log('子项目ID:', 16);
    console.log('父项目ID:', 4);
    console.log('用户ID:', 1);
    
    const [checkResult] = await db.query(
      'SELECT id, parent_id, owner_id FROM projects WHERE id = ? AND parent_id = ? AND owner_id = ?',
      [16, 4, 1]
    );
    
    console.log('删除条件查询结果:');
    console.table(checkResult);
    
    console.log('检查完成');
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit(0);
  }
}

checkSubproject16();
