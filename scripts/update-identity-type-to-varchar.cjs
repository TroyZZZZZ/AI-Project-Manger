const { db } = require('../api/lib/database.cjs');

async function updateIdentityTypeColumn() {
  try {
    console.log('连接数据库...');
    await db.connect();

    console.log('检查 stakeholders.identity_type 字段类型...');
    const [rows] = await db.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'stakeholders' 
        AND COLUMN_NAME = 'identity_type'
    `);

    if (!rows || rows.length === 0) {
      console.log('⚠️ 未发现 identity_type 字段，创建为 VARCHAR(64)');
      await db.query(`
        ALTER TABLE stakeholders 
        ADD COLUMN identity_type VARCHAR(64) NULL DEFAULT NULL
      `);
    } else {
      const columnType = rows[0].COLUMN_TYPE || '';
      console.log('当前 COLUMN_TYPE:', columnType);
      if (/^enum\(/i.test(columnType)) {
        console.log('检测到 ENUM 类型，开始转换为 VARCHAR(64)...');
        await db.query(`
          ALTER TABLE stakeholders 
          MODIFY COLUMN identity_type VARCHAR(64) NULL DEFAULT NULL
        `);
        console.log('✅ 已将 identity_type 从 ENUM 转换为 VARCHAR(64)');
      } else {
        console.log('✅ identity_type 已为非 ENUM 类型，无需修改');
      }
    }

    const [structure] = await db.query('DESCRIBE stakeholders');
    console.log('stakeholders 表结构:');
    structure.forEach(field => {
      console.log(`  ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(可空)' : '(非空)'} ${field.Key ? `[${field.Key}]` : ''} DEFAULT ${field.Default}`);
    });
  } catch (error) {
    console.error('❌ 更新 identity_type 字段失败:', error.message);
  } finally {
    process.exit();
  }
}

updateIdentityTypeColumn();