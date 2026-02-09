const mysql = require('mysql2/promise');
require('dotenv').config();

async function simpleTest() {
  let connection;
  
  try {
    console.log('🔄 尝试简单连接测试...');
    console.log(`主机: ${process.env.DB_HOST}`);
    console.log(`端口: ${process.env.DB_PORT}`);
    console.log(`用户: ${process.env.DB_USER}`);
    
    // 最简单的连接配置，不指定数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectTimeout: 60000,
      ssl: false
    });

    console.log('✅ 连接成功！');

    // 测试基本查询
    const [result] = await connection.execute('SELECT 1 as test, NOW() as `current_time`');
    console.log('✅ 基本查询结果:', result[0]);

    // 查看所有数据库
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📋 可用数据库:');
    databases.forEach(db => {
      console.log(`  - ${db.Database}`);
    });

    // 检查目标数据库是否存在
    const targetDb = process.env.DB_NAME;
    const dbExists = databases.some(db => db.Database === targetDb);
    
    if (dbExists) {
      console.log(`✅ 数据库 '${targetDb}' 已存在`);
      
      // 切换到目标数据库并检查表
      await connection.execute(`USE ${targetDb}`);
      const [tables] = await connection.execute('SHOW TABLES');
      
      if (tables.length > 0) {
        console.log('📋 现有表:');
        tables.forEach(table => {
          const tableName = table[`Tables_in_${targetDb}`];
          console.log(`  - ${tableName}`);
        });
      } else {
        console.log('⚠️  数据库为空，需要初始化表结构');
      }
    } else {
      console.log(`⚠️  数据库 '${targetDb}' 不存在，需要创建`);
      
      // 尝试创建数据库
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${targetDb} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ 数据库 '${targetDb}' 创建成功`);
    }

    console.log('🎉 连接测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误代码:', error.code);
    console.error('错误详情:', error);
    
    return false;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // 忽略关闭连接的错误
      }
    }
  }
}

// 运行测试
simpleTest().then(success => {
  if (success) {
    console.log('\n🎉 数据库连接测试成功！');
    process.exit(0);
  } else {
    console.log('\n❌ 数据库连接测试失败！');
    process.exit(1);
  }
});