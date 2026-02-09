const { db } = require('./api/lib/database.cjs');

async function checkProjectStoriesData() {
  try {
    console.log('连接数据库...');
    await db.connect();
    
    // 检查project_stories表中的数据
    const [stories] = await db.query('SELECT * FROM project_stories ORDER BY created_at DESC');
    console.log(`项目故事表中共有 ${stories.length} 条记录:`);
    
    if (stories.length > 0) {
      console.log('\n所有故事记录:');
      stories.forEach((story, index) => {
        console.log(`\n--- 故事 ${index + 1} ---`);
        console.log(`ID: ${story.id}`);
        console.log(`子项目ID: ${story.subproject_id}`);
        console.log(`时间: ${story.time}`);
        console.log(`干系人: ${story.stakeholders}`);
        console.log(`内容: ${story.content}`);
        console.log(`创建时间: ${story.created_at}`);
        console.log(`更新时间: ${story.updated_at}`);
      });
      
      // 按子项目分组统计
      console.log('\n=== 按子项目分组统计 ===');
      const [groupStats] = await db.query(`
        SELECT 
          subproject_id,
          COUNT(*) as story_count,
          MAX(created_at) as latest_story
        FROM project_stories 
        GROUP BY subproject_id 
        ORDER BY subproject_id
      `);
      
      console.table(groupStats);
      
      // 检查最近创建的故事
      console.log('\n=== 最近创建的5条故事 ===');
      const [recentStories] = await db.query(`
        SELECT id, subproject_id, content, created_at 
        FROM project_stories 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.table(recentStories);
    } else {
      console.log('\n❌ 项目故事表为空，没有任何记录');
    }
    
    await db.close();
  } catch (error) {
    console.error('检查失败:', error.message);
    process.exit(1);
  }
}

checkProjectStoriesData();