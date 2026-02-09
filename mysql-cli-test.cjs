const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMySQLConnection() {
  console.log('🔍 MySQL连接诊断工具\n');
  
  const configs = [
    {
      name: '基础连接测试 (超长超时)',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 60000,
        acquireTimeout: 60000,
        timeout: 60000,
        ssl: false
      }
    },
    {
      name: '启用SSL连接测试',
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
      name: '使用mysql用户测试',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: 'mysql',
        password: process.env.DB_PASSWORD,
        connectTimeout: 60000,
        ssl: false
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n🔄 ${name}...`);
    console.log(`   配置: ${config.user}@${config.host}:${config.port}`);
    
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
          @@hostname as hostname,
          @@port as port,
          @@character_set_server as charset,
          @@collation_server as collation
      `);
      
      console.log(`   服务器版本: ${info[0].version}`);
      console.log(`   当前用户: ${info[0].current_user}`);
      console.log(`   连接ID: ${info[0].connection_id}`);
      console.log(`   主机名: ${info[0].hostname}`);
      console.log(`   端口: ${info[0].port}`);
      console.log(`   字符集: ${info[0].charset}`);
      console.log(`   排序规则: ${info[0].collation}`);
      
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
        
        // 检查目标数据库是否存在
        const targetDb = process.env.DB_NAME;
        const dbExists = databases.some(db => db.Database === targetDb);
        
        if (dbExists) {
          console.log(`   ✅ 目标数据库 '${targetDb}' 已存在`);
          
          // 尝试使用数据库
          await connection.execute(`USE \`${targetDb}\``);
          const [tables] = await connection.execute('SHOW TABLES');
          console.log(`   📋 数据库 '${targetDb}' 中有 ${tables.length} 个表`);
          
        } else {
          console.log(`   ⚠️  目标数据库 '${targetDb}' 不存在`);
          
          // 尝试创建数据库
          try {
            await connection.execute(`CREATE DATABASE \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`   ✅ 成功创建数据库 '${targetDb}'`);
            
            // 验证创建结果
            const [newDatabases] = await connection.execute('SHOW DATABASES');
            const newDbExists = newDatabases.some(db => db.Database === targetDb);
            
            if (newDbExists) {
              console.log(`   ✅ 数据库创建验证成功`);
              
              // 测试使用新数据库
              await connection.execute(`USE \`${targetDb}\``);
              console.log(`   ✅ 成功切换到新数据库`);
              
              // 测试创建表
              await connection.execute(`
                CREATE TABLE test_table (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  name VARCHAR(100) NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
              `);
              console.log(`   ✅ 成功创建测试表`);
              
              // 测试插入数据
              await connection.execute('INSERT INTO test_table (name) VALUES (?)', ['测试数据']);
              console.log(`   ✅ 成功插入测试数据`);
              
              // 测试查询数据
              const [testData] = await connection.execute('SELECT * FROM test_table');
              console.log(`   ✅ 成功查询数据: ${testData.length} 条记录`);
              
              // 清理测试表
              await connection.execute('DROP TABLE test_table');
              console.log(`   ✅ 成功清理测试表`);
              
            } else {
              console.log(`   ❌ 数据库创建验证失败`);
            }
            
          } catch (createError) {
            console.log(`   ❌ 创建数据库失败: ${createError.message}`);
          }
        }
        
      } catch (dbError) {
        console.log(`   ❌ 数据库操作失败: ${dbError.message}`);
      }
      
      await connection.end();
      console.log(`   ✅ 连接正常关闭`);
      
      // 如果这个配置成功了，就返回成功
      return { success: true, config: name };
      
    } catch (error) {
      console.log(`   ❌ 连接失败: ${error.message}`);
      console.log(`   错误代码: ${error.code}`);
      
      if (connection) {
        try {
          await connection.end();
        } catch (e) {
          // 忽略关闭错误
        }
      }
    }
  }
  
  return { success: false };
}

// 运行测试
testMySQLConnection().then(result => {
  if (result.success) {
    console.log('\n🎉 MySQL连接测试成功！');
    console.log(`✅ 成功的配置: ${result.config}`);
    console.log('\n📝 下一步可以:');
    console.log('1. 运行 npm run test:db 验证应用连接');
    console.log('2. 执行数据库初始化脚本');
    process.exit(0);
  } else {
    console.log('\n❌ 所有连接配置都失败了！');
    console.log('\n🔧 建议的解决方案:');
    console.log('1. 联系阿里云技术支持检查RDS实例配置');
    console.log('2. 确认Root用户的具体权限设置');
    console.log('3. 检查RDS实例的网络和安全配置');
    console.log('4. 考虑重新创建RDS实例或用户');
    process.exit(1);
  }
});