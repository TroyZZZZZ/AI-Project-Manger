const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔄 正在连接到阿里云RDS MySQL数据库...');
    
    // 创建连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('✅ 数据库连接成功！');

    // 创建数据库（如果不存在）
    console.log('🔄 创建数据库...');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ 数据库创建成功！');

    // 选择数据库
    await connection.execute(`USE ${process.env.DB_NAME}`);

    // 读取并执行初始化SQL脚本
    console.log('🔄 执行数据库初始化脚本...');
    const sqlPath = path.join(__dirname, 'database', 'init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // 分割SQL语句并执行
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn(`⚠️  SQL执行警告: ${error.message}`);
          }
        }
      }
    }

    console.log('✅ 数据库初始化完成！');

    // 验证表是否创建成功
    console.log('🔄 验证数据库表...');
    const [tables] = await connection.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [process.env.DB_NAME]
    );

    console.log('📋 已创建的表:');
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    console.log('🎉 数据库初始化成功完成！');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    
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
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行初始化
initDatabase();