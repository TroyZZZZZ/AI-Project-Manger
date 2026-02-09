require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkMySQLData() {
  let connection;
  
  try {
    console.log('🔍 连接到MySQL数据库...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ 成功连接到MySQL数据库');
    
    // 检查所有表
    console.log('\n📋 检查数据库表结构:');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('数据库中的表:', tables.map(t => Object.values(t)[0]));
    
    // 检查tasks表数据
    console.log('\n📊 检查tasks表数据:');
    const [taskCount] = await connection.query('SELECT COUNT(*) as count FROM tasks');
    console.log('tasks表记录数:', taskCount[0].count);
    
    if (taskCount[0].count > 0) {
      const [tasks] = await connection.query('SELECT id, title, project_id, status FROM tasks LIMIT 5');
      console.log('前5条任务记录:');
      tasks.forEach(task => {
        console.log(`  ID: ${task.id}, 标题: ${task.title}, 项目ID: ${task.project_id}, 状态: ${task.status}`);
      });
    }
    
    // 检查projects表数据
    console.log('\n📊 检查projects表数据:');
    const [projectCount] = await connection.query('SELECT COUNT(*) as count FROM projects');
    console.log('projects表记录数:', projectCount[0].count);
    
    if (projectCount[0].count > 0) {
      const [projects] = await connection.query('SELECT id, name, status FROM projects LIMIT 5');
      console.log('前5条项目记录:');
      projects.forEach(project => {
        console.log(`  ID: ${project.id}, 名称: ${project.name}, 状态: ${project.status}`);
      });
    }
    
    // 检查users表数据
    console.log('\n📊 检查users表数据:');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log('users表记录数:', userCount[0].count);
    
    if (userCount[0].count > 0) {
      const [users] = await connection.query('SELECT id, username, email FROM users LIMIT 5');
      console.log('前5条用户记录:');
      users.forEach(user => {
        console.log(`  ID: ${user.id}, 用户名: ${user.username}, 邮箱: ${user.email}`);
      });
    }
    
    console.log('\n🎉 数据库检查完成！');
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 数据库连接已关闭');
    }
  }
}

checkMySQLData();