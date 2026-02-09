const { db } = require('./api/lib/database.cjs');

async function checkSubproject() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('检查子项目16的详细信息...');
    
    // 检查子项目16是否存在
    const [subproject] = await db.query(
      'SELECT * FROM projects WHERE id = ?',
      [16]
    );
    
    if (subproject.length === 0) {
      console.log('❌ 子项目16不存在!');
    } else {
      console.log('✅ 子项目16存在:');
      console.log('  ID:', subproject[0].id);
      console.log('  名称:', subproject[0].name);
      console.log('  父项目ID:', subproject[0].parent_id);
      console.log('  所有者ID:', subproject[0].owner_id);
      console.log('  状态:', subproject[0].status);
      console.log('  创建时间:', subproject[0].created_at);
    }
    
    // 检查项目4的所有子项目
    console.log('\n检查项目4的所有子项目:');
    const [subprojects] = await db.query(
      'SELECT id, name, parent_id, owner_id FROM projects WHERE parent_id = ?',
      [4]
    );
    
    if (subprojects.length === 0) {
      console.log('项目4没有子项目');
    } else {
      console.log(`项目4有 ${subprojects.length} 个子项目:`);
      subprojects.forEach(sub => {
        console.log(`  - ID: ${sub.id}, 名称: ${sub.name}, 所有者: ${sub.owner_id}`);
      });
    }
    
    // 检查用户1的权限
    console.log('\n检查用户1对子项目16的权限:');
    const [permission] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
      [16, 1]
    );
    
    if (permission.length === 0) {
      console.log('❌ 用户1对子项目16没有权限');
    } else {
      console.log('✅ 用户1对子项目16有权限');
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit();
  }
}

checkSubproject();