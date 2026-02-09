const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSSLConnections() {
  const configs = [
    {
      name: '标准连接 (无SSL)',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 60000,
        ssl: false
      }
    },
    {
      name: 'SSL连接 (不验证证书)',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 60000,
        ssl: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'SSL连接 (验证证书)',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 60000,
        ssl: true
      }
    },
    {
      name: '长超时连接',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 120000,
        acquireTimeout: 120000,
        timeout: 120000,
        ssl: false
      }
    }
  ];

  for (const { name, config } of configs) {
    let connection;
    
    try {
      console.log(`\n🔄 尝试 ${name}...`);
      console.log(`配置: ${JSON.stringify(config, null, 2)}`);
      
      const startTime = Date.now();
      connection = await mysql.createConnection(config);
      const connectTime = Date.now() - startTime;
      
      console.log(`✅ ${name} 连接成功！耗时: ${connectTime}ms`);
      
      // 测试基本查询
      const queryStart = Date.now();
      const [result] = await connection.execute('SELECT 1 as test, NOW() as current_time, VERSION() as version');
      const queryTime = Date.now() - queryStart;
      
      console.log(`✅ 查询成功！耗时: ${queryTime}ms`);
      console.log(`服务器版本: ${result[0].version}`);
      console.log(`服务器时间: ${result[0].current_time}`);
      
      // 测试数据库列表
      const [databases] = await connection.execute('SHOW DATABASES');
      console.log(`📋 可用数据库数量: ${databases.length}`);
      
      await connection.end();
      console.log(`🎉 ${name} 测试完成！`);
      
      // 如果这个配置成功了，就使用它来继续
      return { success: true, config, name };
      
    } catch (error) {
      console.error(`❌ ${name} 失败:`);
      console.error(`  错误消息: ${error.message}`);
      console.error(`  错误代码: ${error.code}`);
      console.error(`  错误号: ${error.errno}`);
      console.error(`  SQL状态: ${error.sqlState}`);
      
      if (connection) {
        try {
          await connection.end();
        } catch (e) {
          // 忽略关闭连接的错误
        }
      }
    }
  }
  
  return { success: false };
}

// 运行测试
testSSLConnections().then(result => {
  if (result.success) {
    console.log(`\n🎉 找到可用的连接配置: ${result.name}`);
    console.log('建议在应用中使用此配置。');
    process.exit(0);
  } else {
    console.log('\n❌ 所有连接配置都失败了！');
    console.log('请检查:');
    console.log('1. 阿里云RDS实例是否正在运行');
    console.log('2. 网络连接是否正常');
    console.log('3. 安全组和白名单设置');
    console.log('4. 数据库用户权限');
    process.exit(1);
  }
});