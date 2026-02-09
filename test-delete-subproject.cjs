const { db } = require('./api/lib/database.cjs');
const { SubprojectService } = require('./api/services/subprojectService.cjs');

async function testDeleteSubproject() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    // 测试删除子项目ID 15
    const subprojectId = 15;
    const projectId = 4;
    const userId = 1;
    
    console.log('尝试删除子项目:', { subprojectId, projectId, userId });
    
    const result = await SubprojectService.deleteSubproject(subprojectId, projectId, userId);
    console.log('删除成功:', result);
    
  } catch (error) {
    console.error('删除失败:', error.message);
  } finally {
    process.exit(0);
  }
}

testDeleteSubproject();
