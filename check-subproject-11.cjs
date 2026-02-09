const { db } = require('./api/lib/database.cjs');

async function checkSubproject11() {
  await db.connect();

  try {
    console.log('=== 检查子项目11的详细信息 ===');
    
    // 检查子项目11是否存在
    const [subprojects] = await db.query(
      'SELECT * FROM subprojects WHERE id = ?',
      [11]
    );
    
    console.log('子项目11详情:', subprojects);
    
    if (subprojects.length > 0) {
      const subproject = subprojects[0];
      console.log(`子项目ID: ${subproject.id}`);
      console.log(`子项目名称: ${subproject.name}`);
      console.log(`父项目ID: ${subproject.project_id}`);
      console.log(`所有者ID: ${subproject.owner_id}`);
      
      // 检查父项目4是否存在
      const [projects] = await db.query(
        'SELECT * FROM projects WHERE id = ?',
        [4]
      );
      
      console.log('\n=== 检查父项目4的详细信息 ===');
      console.log('父项目4详情:', projects);
      
      if (projects.length > 0) {
        const project = projects[0];
        console.log(`项目ID: ${project.id}`);
        console.log(`项目名称: ${project.name}`);
        console.log(`项目所有者ID: ${project.owner_id}`);
        
        // 检查删除条件
        console.log('\n=== 检查删除条件 ===');
        console.log(`子项目是否属于项目4: ${subproject.project_id == 4}`);
        console.log(`用户1是否有权限删除: ${project.owner_id == 1}`);
        
        // 检查是否有子子项目
        const [subSubprojects] = await db.query(
          'SELECT COUNT(*) as count FROM subprojects WHERE project_id = ?',
          [11]
        );
        
        console.log(`子项目11是否有子子项目: ${subSubprojects[0].count > 0 ? '是' : '否'} (数量: ${subSubprojects[0].count})`);
      } else {
        console.log('父项目4不存在！');
      }
    } else {
      console.log('子项目11不存在！');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await db.close();
  }
}

checkSubproject11();