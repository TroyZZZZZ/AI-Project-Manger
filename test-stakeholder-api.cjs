const { StakeholderService } = require('./api/services/stakeholderService.cjs');
const { db } = require('./api/lib/database.cjs');

async function testStakeholderAPI() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('测试获取项目4的干系人列表...');
    
    const projectId = 4;
    const userId = 1;
    const options = {
      page: 1,
      limit: 50
    };
    
    try {
      const result = await StakeholderService.getStakeholders(projectId, userId, options);
      console.log('✅ 获取干系人列表成功:');
      console.log('  总数:', result.total);
      console.log('  当前页数据:', result.data.length);
      if (result.data.length > 0) {
        console.log('  第一个干系人:', result.data[0]);
      }
    } catch (error) {
      console.error('❌ 获取干系人列表失败:', error.message);
      console.error('错误详情:', error);
    }
    
    // 检查项目4是否存在
    console.log('\n检查项目4是否存在...');
    const [projects] = await db.query('SELECT * FROM projects WHERE id = ?', [4]);
    if (projects.length === 0) {
      console.log('❌ 项目4不存在');
    } else {
      console.log('✅ 项目4存在:', projects[0].name);
    }
    
    // 检查用户1对项目4的权限
    console.log('\n检查用户1对项目4的权限...');
    const [permissions] = await db.query(
      'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
      [4, 1]
    );
    if (permissions.length === 0) {
      console.log('❌ 用户1对项目4没有权限');
    } else {
      console.log('✅ 用户1对项目4有权限');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    process.exit();
  }
}

testStakeholderAPI();