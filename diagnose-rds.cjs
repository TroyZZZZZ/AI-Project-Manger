const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnoseRDS() {
  console.log('🔍 阿里云RDS连接诊断工具');
  console.log('=' .repeat(50));
  
  // 显示当前配置
  console.log('\n📋 当前配置信息:');
  console.log(`  主机: ${process.env.DB_HOST}`);
  console.log(`  端口: ${process.env.DB_PORT}`);
  console.log(`  用户: ${process.env.DB_USER}`);
  console.log(`  密码: ${process.env.DB_PASSWORD ? '***已设置***' : '未设置'}`);
  console.log(`  数据库: ${process.env.DB_NAME}`);
  
  // 测试不同的连接配置
  const testConfigs = [
    {
      name: '基础连接测试',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 30000,
        acquireTimeout: 30000,
        timeout: 30000
      }
    },
    {
      name: '不指定数据库连接',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 30000,
        acquireTimeout: 30000,
        timeout: 30000
        // 不指定database
      }
    },
    {
      name: '使用mysql系统数据库',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'mysql',
        connectTimeout: 30000,
        acquireTimeout: 30000,
        timeout: 30000
      }
    }
  ];

  let successfulConnection = null;

  for (const { name, config } of testConfigs) {
    console.log(`\n🔄 ${name}...`);
    console.log(`   用户: ${config.user}`);
    console.log(`   数据库: ${config.database || '未指定'}`);
    
    let connection;
    
    try {
      const startTime = Date.now();
      connection = await mysql.createConnection(config);
      const connectTime = Date.now() - startTime;
      
      console.log(`✅ 连接成功！耗时: ${connectTime}ms`);
      
      // 获取服务器信息
      try {
        const [serverInfo] = await connection.execute(`
          SELECT 
            VERSION() as version,
            USER() as current_user,
            CONNECTION_ID() as connection_id,
            @@hostname as hostname,
            @@port as port
        `);
        
        console.log(`   服务器版本: ${serverInfo[0].version}`);
        console.log(`   当前用户: ${serverInfo[0].current_user}`);
        console.log(`   连接ID: ${serverInfo[0].connection_id}`);
        console.log(`   主机名: ${serverInfo[0].hostname}`);
        console.log(`   端口: ${serverInfo[0].port}`);
        
      } catch (infoError) {
        console.log(`   ⚠️  无法获取服务器信息: ${infoError.message}`);
      }
      
      // 检查用户权限
      try {
        const [grants] = await connection.execute('SHOW GRANTS');
        console.log(`   用户权限 (${grants.length}条):`);
        grants.forEach((grant, index) => {
          const grantText = Object.values(grant)[0];
          console.log(`     ${index + 1}. ${grantText}`);
        });
      } catch (grantError) {
        console.log(`   ⚠️  无法获取权限信息: ${grantError.message}`);
      }
      
      // 检查数据库列表
      try {
        const [databases] = await connection.execute('SHOW DATABASES');
        console.log(`   可访问数据库 (${databases.length}个):`);
        databases.forEach(db => {
          console.log(`     - ${db.Database}`);
        });
        
        const targetDb = process.env.DB_NAME;
        const dbExists = databases.some(db => db.Database === targetDb);
        
        if (dbExists) {
          console.log(`   ✅ 目标数据库 '${targetDb}' 已存在`);
        } else {
          console.log(`   ⚠️  目标数据库 '${targetDb}' 不存在`);
        }
        
      } catch (dbError) {
        console.log(`   ❌ 无法列出数据库: ${dbError.message}`);
      }
      
      // 测试创建数据库权限
      if (!config.database || config.database === 'mysql') {
        try {
          const testDbName = 'test_create_permission';
          await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\``);
          await connection.execute(`DROP DATABASE IF EXISTS \`${testDbName}\``);
          console.log(`   ✅ 具有创建/删除数据库权限`);
        } catch (createError) {
          console.log(`   ❌ 无创建数据库权限: ${createError.message}`);
        }
      }
      
      await connection.end();
      console.log(`   ✅ 连接正常关闭`);
      
      // 记录成功的连接配置
      if (!successfulConnection) {
        successfulConnection = { name, config };
      }
      
    } catch (error) {
      console.log(`   ❌ 连接失败: ${error.message}`);
      console.log(`   错误代码: ${error.code}`);
      
      // 详细错误分析
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log(`   💡 访问被拒绝可能原因:`);
        console.log(`      1. 用户名或密码不正确`);
        console.log(`      2. 用户没有访问权限`);
        console.log(`      3. 数据库不存在且用户无创建权限`);
        console.log(`      4. 用户账号被锁定`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   💡 连接超时可能原因:`);
        console.log(`      1. 网络连接问题`);
        console.log(`      2. 防火墙阻止连接`);
        console.log(`      3. RDS实例未启动`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   💡 主机未找到可能原因:`);
        console.log(`      1. 主机地址错误`);
        console.log(`      2. DNS解析问题`);
      }
      
      if (connection) {
        try {
          await connection.end();
        } catch (e) {
          // 忽略关闭错误
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (successfulConnection) {
    console.log('🎉 找到可用的连接配置！');
    console.log(`✅ 成功配置: ${successfulConnection.name}`);
    
    // 尝试创建目标数据库
    if (successfulConnection.config.database !== process.env.DB_NAME) {
      console.log(`\n🔄 尝试创建目标数据库 '${process.env.DB_NAME}'...`);
      
      try {
        const connection = await mysql.createConnection(successfulConnection.config);
        
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` 
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        
        console.log(`✅ 数据库 '${process.env.DB_NAME}' 创建成功！`);
        
        // 验证数据库创建
        const [databases] = await connection.execute('SHOW DATABASES');
        const dbExists = databases.some(db => db.Database === process.env.DB_NAME);
        
        if (dbExists) {
          console.log(`✅ 确认数据库 '${process.env.DB_NAME}' 已存在`);
        }
        
        await connection.end();
        
        return { success: true, databaseCreated: true };
        
      } catch (createError) {
        console.log(`❌ 创建数据库失败: ${createError.message}`);
        return { success: true, databaseCreated: false, error: createError.message };
      }
    }
    
    return { success: true, databaseCreated: false };
    
  } else {
    console.log('❌ 所有连接配置都失败了！');
    console.log('\n🔧 建议的解决方案:');
    console.log('1. 检查RDS控制台中的账号配置');
    console.log('2. 确认用户名和密码是否正确');
    console.log('3. 检查用户是否有足够的权限');
    console.log('4. 确认RDS实例状态是否正常');
    console.log('5. 检查网络连接和防火墙设置');
    
    return { success: false };
  }
}

// 运行诊断
diagnoseRDS().then(result => {
  if (result.success) {
    console.log('\n🚀 下一步可以:');
    if (result.databaseCreated) {
      console.log('1. 运行数据库初始化脚本');
      console.log('2. 创建表结构');
      console.log('3. 运行功能测试');
    } else {
      console.log('1. 手动创建数据库或检查权限');
      console.log('2. 运行数据库初始化脚本');
    }
    process.exit(0);
  } else {
    console.log('\n❌ 需要解决连接问题后再继续');
    process.exit(1);
  }
}).catch(error => {
  console.error('诊断过程中发生错误:', error);
  process.exit(1);
});