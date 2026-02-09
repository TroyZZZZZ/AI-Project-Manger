const { db } = require('./api/lib/database.cjs');

async function checkYangPengStakeholder() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('查找干系人杨鹏的数据...');
    
    // 查找名为杨鹏的干系人
    const [stakeholders] = await db.query(
      'SELECT * FROM stakeholders WHERE name LIKE ?',
      ['%杨鹏%']
    );
    
    if (stakeholders.length === 0) {
      console.log('❌ 未找到名为杨鹏的干系人');
    } else {
      console.log(`✅ 找到 ${stakeholders.length} 个名为杨鹏的干系人:`);
      stakeholders.forEach((stakeholder, index) => {
        console.log(`\n干系人 ${index + 1}:`);
        console.log(`  ID: ${stakeholder.id}`);
        console.log(`  项目ID: ${stakeholder.project_id}`);
        console.log(`  姓名: ${stakeholder.name}`);
        console.log(`  角色: ${stakeholder.role}`);
        console.log(`  公司: ${stakeholder.company || '未填写'}`);
        console.log(`  身份类型: ${stakeholder.identity_type || '未设置'}`);
        console.log(`  创建时间: ${stakeholder.created_at}`);
        console.log(`  更新时间: ${stakeholder.updated_at}`);
      });
    }
    
    // 查看最近创建的干系人
    console.log('\n最近创建的5个干系人:');
    const [recentStakeholders] = await db.query(
      'SELECT * FROM stakeholders ORDER BY created_at DESC LIMIT 5'
    );
    
    recentStakeholders.forEach((stakeholder, index) => {
      console.log(`${index + 1}. ${stakeholder.name} (${stakeholder.role}) - 项目ID: ${stakeholder.project_id} - ${stakeholder.created_at}`);
    });
    
    // 统计总数
    const [count] = await db.query('SELECT COUNT(*) as total FROM stakeholders');
    console.log(`\n数据库中共有 ${count[0].total} 个干系人记录`);
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit();
  }
}

checkYangPengStakeholder();