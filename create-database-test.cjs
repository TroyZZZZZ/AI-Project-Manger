const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabaseTest() {
  console.log('🔍 检查并创建 project_management 数据库...\n');
  
  // 显示配置信息
  console.log('📋 数据库配置:');
  console.log(`  主机: ${process.env.DB_HOST}`);
  console.log(`  端口: ${process.env.DB_PORT}`);
  console.log(`  用户: ${process.env.DB_USER}`);
  console.log(`  目标数据库: ${process.env.DB_NAME}\n`);
  
  let connection;
  
  try {
    // 首先连接到MySQL服务器（不指定数据库）
    console.log('🔄 连接到MySQL服务器...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectTimeout: 30000,
      ssl: false
    });
    
    console.log('✅ 成功连接到MySQL服务器！');
    
    // 检查服务器信息
    const [serverInfo] = await connection.execute('SELECT VERSION() as version, USER() as current_user, NOW() as server_time');
    console.log(`   服务器版本: ${serverInfo[0].version}`);
    console.log(`   当前用户: ${serverInfo[0].current_user}`);
    console.log(`   服务器时间: ${serverInfo[0].server_time}`);
    
    // 检查所有数据库
    console.log('\n🔍 检查现有数据库...');
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log(`   可访问数据库数量: ${databases.length}`);
    
    const targetDb = process.env.DB_NAME;
    const dbExists = databases.some(db => db.Database === targetDb);
    
    if (dbExists) {
      console.log(`   ✅ 数据库 '${targetDb}' 已存在`);
      
      // 切换到目标数据库并检查表
      await connection.execute(`USE \`${targetDb}\``);
      console.log(`   📋 已切换到数据库 '${targetDb}'`);
      
      const [tables] = await connection.execute('SHOW TABLES');
      if (tables.length > 0) {
        console.log(`   📋 现有表 (${tables.length}个):`);
        tables.forEach(table => {
          const tableName = table[`Tables_in_${targetDb}`];
          console.log(`     - ${tableName}`);
        });
      } else {
        console.log(`   ⚠️  数据库 '${targetDb}' 为空，需要初始化表结构`);
      }
    } else {
      console.log(`   ⚠️  数据库 '${targetDb}' 不存在，正在创建...`);
      
      // 创建数据库
      await connection.execute(`CREATE DATABASE \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`   ✅ 数据库 '${targetDb}' 创建成功！`);
      
      // 切换到新创建的数据库
      await connection.execute(`USE \`${targetDb}\``);
      console.log(`   📋 已切换到数据库 '${targetDb}'`);
    }
    
    // 测试在目标数据库中执行简单查询
    console.log('\n🔄 测试数据库操作...');
    const [testResult] = await connection.execute('SELECT DATABASE() as current_db, 1 as test_value');
    console.log(`   当前数据库: ${testResult[0].current_db}`);
    console.log(`   测试查询: ${testResult[0].test_value}`);
    
    await connection.end();
    console.log('\n🎉 数据库检查和创建完成！');
    
    return { success: true, dbExists, targetDb };
    
  } catch (error) {
    console.error('\n❌ 数据库操作失败:');
    console.error(`   错误: ${error.message}`);
    console.error(`   代码: ${error.code}`);
    
    // 详细分析错误
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\n💡 连接丢失分析:');
      console.error('   1. 服务器主动关闭了连接');
      console.error('   2. 可能的原因:');
      console.error('      - Root用户没有正确的数据库权限');
      console.error('      - RDS实例配置限制');
      console.error('      - 网络或安全组问题');
      console.error('      - 连接超时设置');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 访问被拒绝:');
      console.error('   - 检查用户名和密码');
      console.error('   - 确认用户有外网访问权限');
    } else if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('\n💡 数据库访问被拒绝:');
      console.error('   - 用户没有访问指定数据库的权限');
      console.error('   - 检查RDS控制台中的用户授权设置');
    }
    
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // 忽略关闭连接的错误
      }
    }
    
    return { success: false, error: error.message, code: error.code };
  }
}

// 运行测试
createDatabaseTest().then(result => {
  if (result.success) {
    console.log('\n🎉 数据库准备就绪！');
    if (!result.dbExists) {
      console.log('📝 数据库已创建，现在可以运行初始化脚本创建表结构。');
    } else {
      console.log('📝 数据库已存在，可以继续进行表结构检查和数据操作。');
    }
    process.exit(0);
  } else {
    console.log('\n❌ 数据库操作失败！');
    console.log('\n🔧 建议的解决方案:');
    console.log('1. 检查RDS控制台中Root用户的"授权数据库"设置');
    console.log('2. 确认Root用户有创建数据库的权限');
    console.log('3. 验证RDS实例的参数配置');
    console.log('4. 考虑创建专用的应用用户而不是使用Root');
    console.log('5. 联系阿里云技术支持获取帮助');
    process.exit(1);
  }
});