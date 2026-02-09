const { db } = require('./api/lib/database.cjs');

async function checkProjectStoriesTable() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    // 检查project_stories表是否存在
    const [tables] = await db.query("SHOW TABLES LIKE 'project_stories'");
    console.log('project_stories表存在:', tables.length > 0);
    
    if (tables.length > 0) {
      console.log('\n表结构:');
      const [desc] = await db.query('DESCRIBE project_stories');
      console.table(desc);
    } else {
      console.log('\n❌ project_stories表不存在，需要创建');
      
      // 创建project_stories表
      const createTableSQL = `
        CREATE TABLE project_stories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subproject_id INT NOT NULL,
          time VARCHAR(255),
          stakeholders TEXT,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_subproject_id (subproject_id),
          FOREIGN KEY (subproject_id) REFERENCES subprojects(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      
      await db.query(createTableSQL);
      console.log('✅ project_stories表创建成功');
    }
    
    await db.close();
  } catch (error) {
    console.error('检查失败:', error.message);
    process.exit(1);
  }
}

checkProjectStoriesTable();