const { db } = require('./api/lib/database.cjs');

async function listAllSubprojects() {
  await db.connect();

  try {
    console.log('=== 查看所有子项目 ===');
    
    // 查看所有子项目
    const [subprojects] = await db.query(
      'SELECT s.*, p.name as project_name FROM subprojects s LEFT JOIN projects p ON s.project_id = p.id ORDER BY s.project_id, s.id'
    );
    
    console.log(`总共找到 ${subprojects.length} 个子项目:`);
    
    subprojects.forEach(subproject => {
      console.log(`ID: ${subproject.id}, 名称: ${subproject.name}, 父项目: ${subproject.project_name} (ID: ${subproject.project_id}), 所有者: ${subproject.owner_id}`);
    });
    
    console.log('\n=== 查看项目4的子项目 ===');
    const [project4Subprojects] = await db.query(
      'SELECT * FROM subprojects WHERE project_id = 4 ORDER BY id'
    );
    
    console.log(`项目4有 ${project4Subprojects.length} 个子项目:`);
    project4Subprojects.forEach(subproject => {
      console.log(`ID: ${subproject.id}, 名称: ${subproject.name}, 所有者: ${subproject.owner_id}`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await db.close();
  }
}

listAllSubprojects();