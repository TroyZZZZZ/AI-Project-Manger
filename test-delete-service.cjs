const { db } = require('./api/lib/database.cjs');
const { SubprojectService } = require('./api/services/subprojectService.cjs');

async function testDeleteService() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('调用 SubprojectService.deleteSubproject(9, 4, 1)');
    
    const result = await SubprojectService.deleteSubproject(9, 4, 1);
    console.log('删除成功:', result);
    
  } catch (error) {
    console.error('删除失败:', error.message);
    console.error('完整错误:', error);
  } finally {
    process.exit(0);
  }
}

testDeleteService();
