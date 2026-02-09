const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCredentials() {
  console.log('🔍 测试不同的用户名和密码组合...\n');
  
  // 显示当前配置
  console.log('📋 当前配置:');
  console.log(`  主机: ${process.env.DB_HOST}`);
  console.log(`  端口: ${process.env.DB_PORT}`);
  console.log(`  用户: ${process.env.DB_USER}`);
  console.log(`  密码: ${process.env.DB_PASSWORD ? '***已设置***' : '未设置'}`);
  console.log(`  数据库: ${process.env.DB_NAME}\n`);
  
  // 测试不同的用户名组合
  const testConfigs = [
    {
      name: '当前配置 (Root)',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 30000,
        ssl: false
      }
    },
    {
      name: '小写用户名 (root)',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: 'root',
        password: process.env.DB_PASSWORD,
        connectTimeout: 30000,
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
        connectTimeout: 30000,
        ssl: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: '小写用户名 + SSL',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: 'root',
        password: process.env.DB_PASSWORD,
        connectTimeout: 30000,
        ssl: {
          rejectUnauthorized: false
        }
      }
    }
  ];

  for (const { name, config } of testConfigs) {
    console.log(`🔄 测试: ${name}`);
    console.log(`   用户: ${config.user}`);
    console.log(`   SSL: ${config.ssl ? '启用' : '禁用'}`);
    
    let connection;
    
    try {
      const startTime = Date.now();
      connection = await mysql.createConnection(config);
      const connectTime = Date.now() - startTime;
      
      console.log(`✅ 连接成功！耗时: ${connectTime}ms`);
      
      // 获取基本信息
      const [info] = await connection.execute(`
        SELECT 
          VERSION() as version,
          USER() as current_user,
          CONNECTION_ID() as connection_id,
          @@hostname as hostname
      `);
      
      console.log(`   服务器版本: ${info[0].version}`);
      console.log(`   当前用户: ${info[0].current_user}`);
      console.log(`   连接ID: ${info[0].connection_id}`);
      console.log(`   主机名: ${info[0].hostname}`);
      
      // 检查用户权限
      try {
        const [grants] = await connection.execute('SHOW GRANTS');
        console.log(`   用户权限 (${grants.length}条):`);
        grants.slice(0, 3).forEach((grant, index) => {
          const grantText = Object.values(grant)[0];
          console.log(`     ${index + 1}. ${grantText}`);
        });
        if (grants.length > 3) {
          console.log(`     ... 还有 ${grants.length - 3} 条权限`);
        }
      } catch (grantError) {
        console.log(`   ⚠️  无法获取权限信息: ${grantError.message}`);
      }
      
      // 检查数据库列表
      try {
        const [databases] = await connection.execute('SHOW DATABASES');
        console.log(`   可访问数据库: ${databases.length} 个`);
        
        const targetDb = process.env.DB_NAME;
        const dbExists = databases.some(db => db.Database === targetDb);
        
        if (dbExists) {
          console.log(`   ✅ 目标数据库 '${targetDb}' 已存在`);
        } else {
          console.log(`   ⚠️  目标数据库 '${targetDb}' 不存在，需要创建`);
          
          // 尝试创建数据库
          try {
            await connection.execute(`CREATE DATABASE \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`   ✅ 成功创建数据库 '${targetDb}'`);
          } catch (createError) {
            console.log(`   ❌ 创建数据库失败: ${createError.message}`);
          }
        }
        
      } catch (dbError) {
        console.log(`   ❌ 数据库操作失败: ${dbError.message}`);
      }
      
      await connection.end();
      console.log(`   ✅ 连接正常关闭\n`);
      
      // 如果这个配置成功了，就返回成功
      return { success: true, config: name, user: config.user, ssl: !!config.ssl };
      
    } catch (error) {
      console.log(`   ❌ 连接失败: ${error.message}`);
      console.log(`   错误代码: ${error.code}`);
      
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log(`   💡 访问被拒绝原因可能是:`);
        console.log(`      1. 用户名或密码不正确`);
        console.log(`      2. 用户没有从您的IP (58.211.245.59) 访问的权限`);
        console.log(`      3. 用户账号被锁定或禁用`);
      }
      
      if (connection) {
        try {
          await connection.end();
        } catch (e) {
          // 忽略关闭错误
        }
      }
      console.log('');
    }
  }
  
  return { success: false };
}

// 运行测试
testCredentials().then(result => {
  if (result.success) {
    console.log('🎉 找到可用的连接配置！');
    console.log(`✅ 成功配置: ${result.config}`);
    console.log(`   用户名: ${result.user}`);
    console.log(`   SSL: ${result.ssl ? '启用' : '禁用'}`);
    console.log('\n📝 下一步可以:');
    console.log('1. 更新 .env 文件使用正确的用户名');
    console.log('2. 运行数据库初始化脚本');
    process.exit(0);
  } else {
    console.log('❌ 所有连接配置都失败了！');
    console.log('\n🔧 建议的解决方案:');
    console.log('1. 检查RDS控制台中的用户名是否正确（可能是 root 而不是 Root）');
    console.log('2. 确认密码是否正确');
    console.log('3. 检查白名单是否包含您的IP地址 (58.211.245.59)');
    console.log('4. 确认用户是否有外网访问权限');
    console.log('5. 检查用户账号状态是否正常');
    process.exit(1);
  }
});