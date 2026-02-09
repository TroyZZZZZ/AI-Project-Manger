const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  let connection;
  
  try {
    console.log('🚀 开始初始化MySQL数据库...');
    
    // 连接到MySQL服务器
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8mb4'
    });
    
    console.log('✅ 成功连接到MySQL服务器');
    
    // 创建数据库
    const dbName = process.env.DB_NAME;
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 '${dbName}' 创建成功`);
    
    // 切换到目标数据库
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ 已切换到数据库 '${dbName}'`);
    
    // 读取并执行SQL文件
    const sqlFile = path.join(__dirname, 'migrations', '001_create_initial_tables.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // 分割SQL语句（按分号分割，但忽略注释中的分号）
    // 首先移除注释行
    const cleanedContent = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('/*'))
      .join('\n');
    
    const statements = cleanedContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log('SQL文件内容长度:', sqlContent.length);
    console.log('清理后内容长度:', cleanedContent.length);
    console.log('分割后的语句数量:', statements.length);
    if (statements.length > 0) {
      console.log('第一条语句:', statements[0].substring(0, 100));
    }
    
    console.log(`📋 开始执行 ${statements.length} 条SQL语句...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await connection.query(statement);
          console.log(`   ✅ 执行语句 ${i + 1}/${statements.length}`);
        } catch (error) {
          console.error(`   ❌ 执行语句 ${i + 1} 失败:`, error.message);
          console.error(`   SQL: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('🎉 数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行初始化
initDatabase();