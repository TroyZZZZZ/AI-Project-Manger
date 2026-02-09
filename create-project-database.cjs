const mysql = require('mysql2/promise');
require('dotenv').config();

async function createProjectDatabase() {
  console.log('🚀 开始创建 project_management 数据库...\n');
  
  // 显示配置信息
  console.log('📋 数据库配置:');
  console.log(`  主机: ${process.env.DB_HOST}`);
  console.log(`  端口: ${process.env.DB_PORT}`);
  console.log(`  用户: ${process.env.DB_USER} (高权限账号)`);
  console.log(`  目标数据库: ${process.env.DB_NAME}\n`);
  
  let connection;
  
  try {
    // 连接到MySQL服务器（不指定数据库）
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
    
    // 检查现有数据库
    console.log('\n🔍 检查现有数据库...');
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log(`   可访问数据库数量: ${databases.length}`);
    
    // 列出部分数据库
    const dbNames = databases.map(db => db.Database);
    console.log(`   现有数据库: ${dbNames.slice(0, 5).join(', ')}${dbNames.length > 5 ? '...' : ''}`);
    
    const targetDb = process.env.DB_NAME;
    const dbExists = databases.some(db => db.Database === targetDb);
    
    if (dbExists) {
      console.log(`\n✅ 数据库 '${targetDb}' 已存在！`);
      
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
      console.log(`\n🔧 数据库 '${targetDb}' 不存在，正在创建...`);
      
      // 创建数据库
      const createDbSql = `CREATE DATABASE \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
      await connection.execute(createDbSql);
      console.log(`   ✅ 数据库 '${targetDb}' 创建成功！`);
      
      // 切换到新创建的数据库
      await connection.execute(`USE \`${targetDb}\``);
      console.log(`   📋 已切换到数据库 '${targetDb}'`);
      
      // 验证数据库创建
      const [newDbCheck] = await connection.execute('SELECT DATABASE() as current_db');
      console.log(`   ✅ 当前数据库: ${newDbCheck[0].current_db}`);
    }
    
    // 测试基本操作权限
    console.log('\n🔄 测试数据库操作权限...');
    
    // 测试创建表权限
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS test_permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          test_field VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('   ✅ CREATE TABLE 权限正常');
      
      // 测试插入权限
      await connection.execute('INSERT INTO test_permissions (test_field) VALUES (?)', ['权限测试']);
      console.log('   ✅ INSERT 权限正常');
      
      // 测试查询权限
      const [testResult] = await connection.execute('SELECT * FROM test_permissions LIMIT 1');
      console.log('   ✅ SELECT 权限正常');
      
      // 清理测试表
      await connection.execute('DROP TABLE test_permissions');
      console.log('   ✅ DROP TABLE 权限正常');
      
    } catch (permError) {
      console.error(`   ❌ 权限测试失败: ${permError.message}`);
    }
    
    await connection.end();
    console.log('\n🎉 数据库准备完成！');
    
    return { success: true, dbExists, targetDb };
    
  } catch (error) {
    console.error('\n❌ 数据库操作失败:');
    console.error(`   错误: ${error.message}`);
    console.error(`   代码: ${error.code}`);
    
    // 详细分析错误
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\n💡 连接丢失分析:');
      console.error('   可能的原因:');
      console.error('   1. RDS实例可能有连接限制或超时设置');
      console.error('   2. 网络不稳定导致连接中断');
      console.error('   3. MySQL服务器配置问题');
      console.error('\n🔧 建议解决方案:');
      console.error('   1. 检查RDS实例的参数配置');
      console.error('   2. 尝试增加连接超时时间');
      console.error('   3. 联系阿里云技术支持');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 访问被拒绝:');
      console.error('   - 检查用户名和密码');
      console.error('   - 确认Root用户有外网访问权限');
    } else if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('\n💡 数据库访问被拒绝:');
      console.error('   - Root用户可能没有创建数据库的权限');
      console.error('   - 检查RDS控制台中的用户权限设置');
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

// 运行脚本
createProjectDatabase().then(result => {
  if (result.success) {
    console.log('\n🎉 数据库创建和配置成功！');
    console.log('\n📝 下一步操作:');
    console.log('1. 运行 npm run test:db 测试连接');
    console.log('2. 如果连接成功，运行数据库初始化脚本');
    console.log('3. 创建必要的表结构');
    process.exit(0);
  } else {
    console.log('\n❌ 数据库创建失败！');
    console.log('\n🔧 请尝试以下解决方案:');
    console.log('1. 确认RDS实例状态为"运行中"');
    console.log('2. 检查Root用户是否有足够的权限');
    console.log('3. 验证网络连接和安全组设置');
    console.log('4. 考虑联系阿里云技术支持');
    process.exit(1);
  }
});