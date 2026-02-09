const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugConnection() {
  console.log('🔍 开始详细诊断阿里云RDS连接问题...\n');
  
  // 显示环境变量
  console.log('📋 当前数据库配置:');
  console.log(`  主机: ${process.env.DB_HOST}`);
  console.log(`  端口: ${process.env.DB_PORT}`);
  console.log(`  用户: ${process.env.DB_USER}`);
  console.log(`  密码: ${process.env.DB_PASSWORD ? '***已设置***' : '未设置'}`);
  console.log(`  数据库: ${process.env.DB_NAME}\n`);
  
  // 测试不同的连接配置
  const testConfigs = [
    {
      name: '基础连接（不指定数据库）',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 10000,
        ssl: false
      }
    },
    {
      name: '指定数据库连接',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 10000,
        ssl: false
      }
    },
    {
      name: '启用SSL连接',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 10000,
        ssl: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: '使用mysql用户连接',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: 'mysql',
        password: process.env.DB_PASSWORD,
        connectTimeout: 10000,
        ssl: false
      }
    }
  ];

  for (const { name, config } of testConfigs) {
    let connection;
    
    try {
      console.log(`🔄 测试: ${name}`);
      console.log(`   配置: ${JSON.stringify({...config, password: '***'}, null, 4)}`);
      
      const startTime = Date.now();
      connection = await mysql.createConnection(config);
      const connectTime = Date.now() - startTime;
      
      console.log(`✅ 连接成功！耗时: ${connectTime}ms`);
      
      // 获取服务器信息
      const [serverInfo] = await connection.execute('SELECT VERSION() as version, NOW() as current_time, USER() as current_user, CONNECTION_ID() as connection_id');
      console.log(`   服务器版本: ${serverInfo[0].version}`);
      console.log(`   当前用户: ${serverInfo[0].current_user}`);
      console.log(`   连接ID: ${serverInfo[0].connection_id}`);
      console.log(`   服务器时间: ${serverInfo[0].current_time}`);
      
      // 检查权限
      const [privileges] = await connection.execute('SHOW GRANTS');
      console.log(`   用户权限:`);
      privileges.forEach((grant, index) => {
        const grantKey = Object.keys(grant)[0];
        console.log(`     ${index + 1}. ${grant[grantKey]}`);
      });
      
      // 检查数据库列表
      const [databases] = await connection.execute('SHOW DATABASES');
      console.log(`   可访问的数据库 (${databases.length}个):`);
      databases.forEach(db => {
        console.log(`     - ${db.Database}`);
      });
      
      await connection.end();
      console.log(`🎉 ${name} 测试完成！\n`);
      
      return { success: true, config, name };
      
    } catch (error) {
      console.error(`❌ ${name} 失败:`);
      console.error(`   错误类型: ${error.constructor.name}`);
      console.error(`   错误消息: ${error.message}`);
      console.error(`   错误代码: ${error.code}`);
      console.error(`   错误号: ${error.errno}`);
      console.error(`   SQL状态: ${error.sqlState}`);
      console.error(`   是否致命: ${error.fatal}`);
      
      if (error.stack) {
        console.error(`   错误堆栈: ${error.stack.split('\n')[0]}`);
      }
      
      if (connection) {
        try {
          await connection.end();
        } catch (e) {
          // 忽略关闭连接的错误
        }
      }
      console.log('');
    }
  }
  
  return { success: false };
}

// 运行诊断
debugConnection().then(result => {
  if (result.success) {
    console.log(`🎉 找到可用的连接配置: ${result.name}`);
    console.log('现在可以继续进行数据库初始化操作。');
    process.exit(0);
  } else {
    console.log('❌ 所有连接配置都失败了！');
    console.log('\n💡 可能的解决方案:');
    console.log('1. 检查阿里云RDS控制台中的账户管理');
    console.log('2. 确认Root用户是否有外网访问权限');
    console.log('3. 检查RDS实例的参数设置');
    console.log('4. 尝试创建新的数据库用户');
    console.log('5. 检查RDS实例是否有连接数限制');
    process.exit(1);
  }
});