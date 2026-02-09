const { StakeholderService } = require('./api/services/stakeholderService.cjs');
const { db } = require('./api/lib/database.cjs');

async function testStakeholderSearch() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    const projectId = 4;
    const userId = 1;
    
    console.log('测试1: 获取项目4的所有干系人...');
    try {
      const result = await StakeholderService.getStakeholders(projectId, userId);
      console.log('✅ 获取成功:');
      console.log('  总数:', result.total);
      console.log('  数据:', result.data);
      
      if (result.data && result.data.length > 0) {
        console.log('\n干系人列表:');
        result.data.forEach((stakeholder, index) => {
          console.log(`  ${index + 1}. ID: ${stakeholder.id}, 姓名: ${stakeholder.name}, 角色: ${stakeholder.role}`);
        });
      }
    } catch (error) {
      console.error('❌ 获取失败:', error.message);
    }
    
    console.log('\n测试2: 搜索"杨鹏"...');
    try {
      const searchResult = await StakeholderService.getStakeholders(projectId, userId, {
        search: '杨鹏'
      });
      console.log('✅ 搜索成功:');
      console.log('  搜索结果数量:', searchResult.total);
      console.log('  搜索结果:', searchResult.data);
    } catch (error) {
      console.error('❌ 搜索失败:', error.message);
    }
    
    console.log('\n测试3: 搜索"杨"...');
    try {
      const searchResult = await StakeholderService.getStakeholders(projectId, userId, {
        search: '杨'
      });
      console.log('✅ 搜索成功:');
      console.log('  搜索结果数量:', searchResult.total);
      console.log('  搜索结果:', searchResult.data);
    } catch (error) {
      console.error('❌ 搜索失败:', error.message);
    }
    
    console.log('\n测试4: 直接查询数据库中的干系人...');
    const [allStakeholders] = await db.query(
      'SELECT * FROM stakeholders WHERE project_id = ?',
      [projectId]
    );
    console.log(`项目${projectId}的干系人数量:`, allStakeholders.length);
    allStakeholders.forEach((stakeholder, index) => {
      console.log(`  ${index + 1}. ID: ${stakeholder.id}, 姓名: ${stakeholder.name}, 角色: ${stakeholder.role}`);
    });
    
    console.log('\n测试5: 测试模糊搜索SQL...');
    const [searchResults] = await db.query(
      'SELECT * FROM stakeholders WHERE project_id = ? AND (name LIKE ? OR role LIKE ?)',
      [projectId, '%杨鹏%', '%杨鹏%']
    );
    console.log('模糊搜索"杨鹏"结果:', searchResults.length);
    searchResults.forEach((stakeholder, index) => {
      console.log(`  ${index + 1}. ID: ${stakeholder.id}, 姓名: ${stakeholder.name}, 角色: ${stakeholder.role}`);
    });
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await db.close();
    process.exit();
  }
}

testStakeholderSearch();