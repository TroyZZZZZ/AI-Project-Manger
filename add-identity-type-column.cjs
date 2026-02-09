const { db } = require('./api/lib/database.cjs');

async function addIdentityTypeColumn() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('检查identity_type字段是否存在...');
    
    // 检查字段是否已存在
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'stakeholders' 
      AND COLUMN_NAME = 'identity_type'
    `);
    
    if (columns.length > 0) {
      console.log('✅ identity_type字段已存在');
    } else {
      console.log('添加identity_type字段...');
      
      // 添加identity_type字段
      await db.query(`
        ALTER TABLE stakeholders 
        ADD COLUMN identity_type ENUM('supplier', 'suzhou_tech_equity_service') DEFAULT 'supplier'
      `);
      
      console.log('✅ identity_type字段已成功添加');
    }
    
    // 验证表结构
    const [structure] = await db.query('DESCRIBE stakeholders');
    console.log('stakeholders表结构:');
    structure.forEach(field => {
      console.log(`  ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(可空)' : '(非空)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });
    
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    process.exit();
  }
}

addIdentityTypeColumn();