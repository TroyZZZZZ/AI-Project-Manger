const { db } = require('./api/lib/database.cjs');

async function checkProjectsTable() {
  await db.connect();

  try {
    console.log('=== 检查projects表结构 ===');
    
    // 查看表结构
    const [columns] = await db.query('DESCRIBE projects');
    
    console.log('projects表字段:');
    columns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} (${column.Null === 'YES' ? '可空' : '不可空'})`);
    });
    
    console.log('\n=== 查看所有项目 ===');
    const [allProjects] = await db.query('SELECT id, name, parent_id, owner_id FROM projects ORDER BY id');
    
    console.log(`总共找到 ${allProjects.length} 个项目:`);
    allProjects.forEach(project => {
      const type = project.parent_id ? '子项目' : '主项目';
      console.log(`ID: ${project.id}, 名称: ${project.name}, 类型: ${type}, 父项目ID: ${project.parent_id || '无'}, 所有者: ${project.owner_id}`);
    });
    
    console.log('\n=== 查看项目4的子项目 ===');
    const [subprojects] = await db.query('SELECT id, name, parent_id, owner_id FROM projects WHERE parent_id = 4');
    
    console.log(`项目4有 ${subprojects.length} 个子项目:`);
    subprojects.forEach(subproject => {
      console.log(`ID: ${subproject.id}, 名称: ${subproject.name}, 所有者: ${subproject.owner_id}`);
    });
    
    console.log('\n=== 检查子项目11 ===');
    const [project11] = await db.query('SELECT * FROM projects WHERE id = 11');
    
    if (project11.length > 0) {
      console.log('找到项目11:', project11[0]);
    } else {
      console.log('项目11不存在');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await db.close();
  }
}

checkProjectsTable();