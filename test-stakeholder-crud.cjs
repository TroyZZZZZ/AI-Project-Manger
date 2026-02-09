const { StakeholderService } = require('./api/services/stakeholderService.cjs');
const { db } = require('./api/lib/database.cjs');

async function run() {
  const projectId = 4;
  const userId = 1;
  const now = Date.now();
  const name = `测试新增-${now}`;
  let created;
  try {
    console.log('连接数据库...');
    await db.connect();

    console.log('\n创建干系人...');
    created = await StakeholderService.createStakeholder(projectId, {
      name,
      role: 'member',
      company: '测试公司',
      identity_type: 'supplier'
    }, userId);
    console.log('✅ 创建成功:', created);

    console.log('\n更新干系人身份类型...');
    const updated = await StakeholderService.updateStakeholder(created.id, {
      identity_type: 'suzhou_tech_equity_service',
    }, userId);
    console.log('✅ 更新成功，当前身份类型:', updated.identity_type);

    console.log('\n按ID获取详情...');
    const detail = await StakeholderService.getStakeholderById(created.id);
    console.log('✅ 获取成功:', { id: detail.id, name: detail.name, identity_type: detail.identity_type });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error);
  } finally {
    if (created && created.id) {
      try {
        console.log('\n清理测试数据...');
        await StakeholderService.deleteStakeholder(created.id, projectId, userId);
        console.log('✅ 测试数据已删除');
      } catch (cleanupErr) {
        console.warn('⚠️ 清理测试数据失败:', cleanupErr.message);
      }
    }
    await db.close();
    process.exit(0);
  }
}

run();