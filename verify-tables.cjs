const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyTables() {
  let connection;
  
  try {
    console.log('🔍 验证数据库表结构...');
    console.log('=' .repeat(50));
    
    // 连接到数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 60000,
      ssl: false
    });

    console.log('✅ 数据库连接成功！');
    console.log(`📋 当前数据库: ${process.env.DB_NAME}\n`);

    // 获取所有表
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('❌ 数据库中没有找到任何表！');
      return false;
    }

    console.log(`📊 找到 ${tables.length} 个表:\n`);

    // 验证每个表的结构
    for (const tableRow of tables) {
      const tableName = tableRow[`Tables_in_${process.env.DB_NAME}`];
      console.log(`🔍 检查表: ${tableName}`);
      
      try {
        // 获取表结构
        const [columns] = await connection.query(`DESCRIBE ${tableName}`);
        console.log(`   列数: ${columns.length}`);
        
        // 显示主要列信息
        columns.forEach(col => {
          const key = col.Key ? ` [${col.Key}]` : '';
          const nullable = col.Null === 'YES' ? ' (可空)' : ' (非空)';
          console.log(`     - ${col.Field}: ${col.Type}${key}${nullable}`);
        });
        
        // 获取表的行数
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const rowCount = countResult[0].count;
        console.log(`   数据行数: ${rowCount}`);
        
        // 获取表的索引信息
        const [indexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
        const uniqueIndexes = [...new Set(indexes.map(idx => idx.Key_name))];
        if (uniqueIndexes.length > 0) {
          console.log(`   索引: ${uniqueIndexes.join(', ')}`);
        }
        
        console.log('   ✅ 表结构正常\n');
        
      } catch (error) {
        console.log(`   ❌ 表检查失败: ${error.message}\n`);
      }
    }

    // 验证关键表是否存在
    const expectedTables = [
      'users',
      'projects', 
      'tasks',
      'project_members',
      'task_comments',
      'file_attachments',
      'notifications',
      'activity_logs'
    ];

    console.log('🔍 验证关键表是否存在:');
    const existingTableNames = tables.map(t => t[`Tables_in_${process.env.DB_NAME}`]);
    
    let missingTables = [];
    expectedTables.forEach(expectedTable => {
      if (existingTableNames.includes(expectedTable)) {
        console.log(`   ✅ ${expectedTable}`);
      } else {
        console.log(`   ❌ ${expectedTable} (缺失)`);
        missingTables.push(expectedTable);
      }
    });

    // 测试基本的数据库操作
    console.log('\n🔍 测试基本数据库操作:');
    
    try {
      // 测试插入用户
      console.log('   🔄 测试用户表操作...');
      const testUser = {
        username: 'test_user_' + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: 'test_password_hash',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const [insertResult] = await connection.query(
        'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [testUser.username, testUser.email, testUser.password, testUser.created_at, testUser.updated_at]
      );
      
      console.log(`   ✅ 用户插入成功，ID: ${insertResult.insertId}`);
      
      // 测试查询用户
      const [selectResult] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [insertResult.insertId]
      );
      
      if (selectResult.length > 0) {
        console.log(`   ✅ 用户查询成功: ${selectResult[0].username}`);
      }
      
      // 清理测试数据
      await connection.query('DELETE FROM users WHERE id = ?', [insertResult.insertId]);
      console.log('   ✅ 测试数据清理完成');
      
    } catch (error) {
      console.log(`   ❌ 数据库操作测试失败: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50));
    
    if (missingTables.length === 0) {
      console.log('🎉 所有关键表都已正确创建！');
      console.log('✅ 数据库结构验证通过！');
      return true;
    } else {
      console.log(`❌ 缺失 ${missingTables.length} 个关键表: ${missingTables.join(', ')}`);
      console.log('⚠️  数据库结构不完整！');
      return false;
    }

  } catch (error) {
    console.error('❌ 表结构验证失败:', error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行验证
verifyTables().then(success => {
  if (success) {
    console.log('\n🚀 数据库已准备就绪，可以开始使用！');
    process.exit(0);
  } else {
    console.log('\n❌ 数据库验证失败，请检查初始化脚本！');
    process.exit(1);
  }
}).catch(error => {
  console.error('验证过程中发生错误:', error);
  process.exit(1);
});