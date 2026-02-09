const { db } = require('./api/lib/database.cjs');

async function debugDeleteLogic() {
  await db.connect();

  try {
    const id = 11;
    const projectId = 4;
    const userId = 1;
    
    console.log('=== 调试删除子项目逻辑 ===');
    console.log(`尝试删除: 子项目ID=${id}, 父项目ID=${projectId}, 用户ID=${userId}`);
    
    // 步骤1: 检查子项目是否存在且属于指定的父项目
    console.log('\n步骤1: 检查子项目是否存在且属于指定的父项目');
    const query1 = 'SELECT id, parent_id FROM projects WHERE id = ? AND parent_id = ? AND owner_id = ?';
    console.log('SQL查询:', query1);
    console.log('参数:', [id, projectId, userId]);
    
    const [projects] = await db.query(query1, [id, projectId, userId]);
    console.log('查询结果:', projects);
    
    if (projects.length === 0) {
      console.log('❌ 子项目不存在或无权限');
      
      // 分步检查原因
      console.log('\n=== 分步检查原因 ===');
      
      // 检查子项目是否存在
      const [existCheck] = await db.query('SELECT id, parent_id, owner_id FROM projects WHERE id = ?', [id]);
      console.log('子项目存在性检查:', existCheck);
      
      if (existCheck.length > 0) {
        const project = existCheck[0];
        console.log(`子项目存在: ID=${project.id}, parent_id=${project.parent_id}, owner_id=${project.owner_id}`);
        
        if (project.parent_id != projectId) {
          console.log(`❌ 父项目ID不匹配: 期望${projectId}, 实际${project.parent_id}`);
        }
        
        if (project.owner_id != userId) {
          console.log(`❌ 所有者ID不匹配: 期望${userId}, 实际${project.owner_id}`);
        }
      } else {
        console.log('❌ 子项目不存在');
      }
      
      return;
    }
    
    console.log('✅ 子项目存在且有权限');
    
    // 步骤2: 检查是否有子项目
    console.log('\n步骤2: 检查是否有子项目');
    const query2 = 'SELECT id FROM projects WHERE parent_id = ?';
    console.log('SQL查询:', query2);
    console.log('参数:', [id]);
    
    const [subprojects] = await db.query(query2, [id]);
    console.log('子项目查询结果:', subprojects);
    
    if (subprojects.length > 0) {
      console.log('❌ 请先删除所有子项目');
      return;
    }
    
    console.log('✅ 没有子项目，可以删除');
    
    // 步骤3: 执行删除（这里只是模拟，不实际删除）
    console.log('\n步骤3: 模拟删除操作');
    console.log('SQL: DELETE FROM projects WHERE id = ?');
    console.log('参数:', [id]);
    console.log('✅ 删除操作将会成功');
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    await db.close();
  }
}

debugDeleteLogic();