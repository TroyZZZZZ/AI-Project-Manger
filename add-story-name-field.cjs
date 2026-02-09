const { db } = require('./api/lib/database.cjs');

async function addStoryNameField() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    // 检查project_stories表是否存在story_name字段
    const [columns] = await db.query("SHOW COLUMNS FROM project_stories LIKE 'story_name'");
    
    if (columns.length > 0) {
      console.log('✅ story_name字段已存在');
    } else {
      console.log('正在添加story_name字段...');
      
      // 添加story_name字段
      await db.query(`
        ALTER TABLE project_stories 
        ADD COLUMN story_name VARCHAR(200) NOT NULL DEFAULT '' 
        AFTER subproject_id
      `);
      
      console.log('✅ story_name字段添加成功');
    }
    
    // 显示更新后的表结构
    console.log('\n更新后的表结构:');
    const [desc] = await db.query('DESCRIBE project_stories');
    console.table(desc);
    
    await db.close();
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    process.exit(1);
  }
}

addStoryNameField();