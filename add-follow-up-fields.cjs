const mysql = require('mysql2/promise');
require('dotenv').config();

async function addFollowUpFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false,
    multipleStatements: true
  });

  try {
    console.log('=== 添加跟进功能字段到project_stories表 ===');
    
    // 检查字段是否已存在
    const [columns] = await connection.execute('SHOW COLUMNS FROM project_stories');
    const columnNames = columns.map(col => col.Field);
    
    if (!columnNames.includes('next_reminder_date')) {
      await connection.execute(`
        ALTER TABLE project_stories 
        ADD COLUMN next_reminder_date DATE 
        NULL AFTER updated_at
      `);
      console.log('✅ next_reminder_date字段添加成功');
    } else {
      console.log('ℹ️ next_reminder_date字段已存在，跳过');
    }
    
    // 创建跟进记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS follow_up_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        story_id INT NOT NULL,
        content TEXT NOT NULL,
        action_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES project_stories(id) ON DELETE CASCADE,
        INDEX idx_story_id (story_id),
        INDEX idx_action_date (action_date)
      )
    `);
    console.log('✅ follow_up_records表创建成功');
    
    console.log('\n🎉 所有跟进功能相关字段和表创建完成！');
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
  } finally {
    await connection.end();
  }
}

addFollowUpFields();
