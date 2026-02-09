const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTasksTable() {
  let connection;
  
  try {
    console.log('🔍 检查tasks表结构...');
    
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

    // 检查tasks表结构
    const [columns] = await connection.query('DESCRIBE tasks');
    
    console.log('\n📋 tasks表结构:');
    console.log('列名\t\t类型\t\t\t键\t空值\t默认值');
    console.log('-'.repeat(80));
    
    columns.forEach(col => {
      const field = col.Field.padEnd(15);
      const type = col.Type.padEnd(20);
      const key = col.Key || '';
      const nullable = col.Null;
      const defaultValue = col.Default || '';
      console.log(`${field}\t${type}\t${key}\t${nullable}\t${defaultValue}`);
    });

    // 检查是否有assigned_to列
    const hasAssignedTo = columns.some(col => col.Field === 'assigned_to');
    const hasAssigneeId = columns.some(col => col.Field === 'assignee_id');
    
    console.log('\n🔍 列检查结果:');
    console.log(`assigned_to 列: ${hasAssignedTo ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`assignee_id 列: ${hasAssigneeId ? '✅ 存在' : '❌ 不存在'}`);

    // 如果没有assigned_to但有assignee_id，建议使用assignee_id
    if (!hasAssignedTo && hasAssigneeId) {
      console.log('\n💡 建议: 使用 assignee_id 列代替 assigned_to');
    }

    // 显示所有列名
    console.log('\n📝 所有列名:');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field}`);
    });

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

checkTasksTable().catch(console.error);