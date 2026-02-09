const { db } = require('./lib/database.cjs');

async function createStoriesTable() {
  try {
    console.log('正在创建项目故事表...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_stories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subproject_id INT NOT NULL,
        time DATETIME,
        stakeholders TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (subproject_id) REFERENCES subprojects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await db.query(createTableSQL);
    console.log('✅ 项目故事表创建成功');
    
    // 检查表是否存在
    const [tables] = await db.query("SHOW TABLES LIKE 'project_stories'");
    if (tables.length > 0) {
      console.log('✅ 项目故事表已存在');
      
      // 显示表结构
      const [columns] = await db.query("DESCRIBE project_stories");
      console.log('表结构:');
      console.table(columns);
    }
    
  } catch (error) {
    console.error('❌ 创建项目故事表失败:', error);
  } finally {
    process.exit(0);
  }
}

// 连接数据库并创建表
db.connect().then(() => {
  createStoriesTable();
}).catch(error => {
  console.error('数据库连接失败:', error);
  process.exit(1);
});