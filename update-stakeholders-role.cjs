const { db } = require('./api/lib/database.cjs');

async function updateStakeholdersRoleField() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('更新stakeholders表的role字段...');
    
    // 修改role字段从enum改为varchar
    await db.query(`
      ALTER TABLE stakeholders 
      MODIFY COLUMN role VARCHAR(100) NULL
    `);
    
    console.log('✅ stakeholders表的role字段已成功更新为VARCHAR(100)');
    
    // 验证更新结果
    const [structure] = await db.query('DESCRIBE stakeholders');
    const roleField = structure.find(field => field.Field === 'role');
    console.log(`role字段类型: ${roleField.Type}`);
    
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    process.exit();
  }
}

updateStakeholdersRoleField();