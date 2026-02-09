const { db } = require('./api/lib/database.cjs');

async function checkStakeholdersTable() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    console.log('检查stakeholders表是否存在...');
    
    // 检查表是否存在
    const [tables] = await db.query("SHOW TABLES LIKE 'stakeholders'");
    
    if (tables.length === 0) {
      console.log('❌ stakeholders表不存在!');
      
      // 检查所有表
      const [allTables] = await db.query('SHOW TABLES');
      console.log('当前数据库中的所有表:');
      allTables.forEach(table => {
        console.log('  -', Object.values(table)[0]);
      });
      
    } else {
      console.log('✅ stakeholders表存在');
      
      // 查看表结构
      const [structure] = await db.query('DESCRIBE stakeholders');
      console.log('stakeholders表结构:');
      structure.forEach(field => {
        console.log(`  ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(可空)' : '(非空)'} ${field.Key ? `[${field.Key}]` : ''}`);
      });
      
      // 查看数据数量
      const [count] = await db.query('SELECT COUNT(*) as total FROM stakeholders');
      console.log(`stakeholders表中有 ${count[0].total} 条记录`);
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    process.exit();
  }
}

checkStakeholdersTable();