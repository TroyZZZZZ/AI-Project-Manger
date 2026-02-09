const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  let connection;
  
  try {
    console.log('🔄 正在测试阿里云RDS MySQL连接...');
    console.log(`主机: ${process.env.DB_HOST}`);
    console.log(`端口: ${process.env.DB_PORT}`);
    console.log(`用户: ${process.env.DB_USER}`);
    console.log(`数据库: ${process.env.DB_NAME}`);
    
    // 创建连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 30000,
      acquireTimeout: 30000,
      ssl: false
    });

    console.log('✅ 数据库连接成功！');

    // 测试基本查询
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('✅ 基本查询测试通过');

    // 检查数据库是否存在
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📋 可用数据库:');
    databases.forEach(db => {
      console.log(`  - ${db.Database}`);
    });

    // 检查表是否存在
    const [tables] = await connection.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [process.env.DB_NAME]
    );

    if (tables.length > 0) {
      console.log('📋 现有表:');
      tables.forEach(table => {
        console.log(`  - ${table.TABLE_NAME}`);
      });
    } else {
      console.log('⚠️  数据库为空，需要初始化表结构');
    }

    await connection.end();
    console.log('🎉 连接测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 连接测试失败:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 建议检查:');
      console.error('  1. 数据库主机地址是否正确');
      console.error('  2. 网络连接是否正常');
      console.error('  3. 阿里云RDS实例是否正在运行');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 建议检查:');
      console.error('  1. 数据库用户名和密码是否正确');
      console.error('  2. 用户是否有足够的权限');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 建议检查:');
      console.error('  1. 数据库端口是否正确');
      console.error('  2. 阿里云安全组设置');
      console.error('  3. RDS白名单配置');
    } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('💡 建议检查:');
      console.error('  1. 网络连接稳定性');
      console.error('  2. RDS实例负载情况');
      console.error('  3. 连接超时设置');
    }
    
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
testConnection().then(success => {
  if (success) {
    console.log('\n🎉 数据库连接测试成功！可以继续进行数据库初始化。');
    process.exit(0);
  } else {
    console.log('\n❌ 数据库连接测试失败！请检查配置和网络设置。');
    process.exit(1);
  }
});