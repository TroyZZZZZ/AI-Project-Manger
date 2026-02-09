const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false
  });

  try {
    console.log('=== 检查project_stories表结构 ===');
    const [columns] = await connection.execute('SHOW COLUMNS FROM project_stories');
    console.log('stories表字段:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'NO' ? '不可空' : '可空'})`);
    });
    
    console.log('\n=== 检查新创建的表 ===');
    const [statusLogs] = await connection.execute("SHOW TABLES LIKE 'story_status_logs'");
    const [followUpRecords] = await connection.execute("SHOW TABLES LIKE 'follow_up_records'");
    
    console.log('story_status_logs表:', statusLogs.length > 0 ? '已创建' : '未创建');
    console.log('follow_up_records表:', followUpRecords.length > 0 ? '已创建' : '未创建');
    
    if (statusLogs.length > 0) {
      const [statusColumns] = await connection.execute('SHOW COLUMNS FROM story_status_logs');
      console.log('\nstory_status_logs表字段:');
      statusColumns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type}`);
      });
    }
    
    if (followUpRecords.length > 0) {
      const [followUpColumns] = await connection.execute('SHOW COLUMNS FROM follow_up_records');
      console.log('\nfollow_up_records表字段:');
      followUpColumns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type}`);
      });
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables();