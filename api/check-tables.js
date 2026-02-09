const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('连接到阿里云MySQL数据库成功');
    
    // 检查projects表结构
    const [projectsColumns] = await connection.execute('DESCRIBE projects');
    console.log('\nprojects表结构:');
    projectsColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    });
    
    // 检查project_members表结构
    const [membersColumns] = await connection.execute('DESCRIBE project_members');
    console.log('\nproject_members表结构:');
    membersColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    });
    
    // 检查tasks表结构
    const [tasksColumns] = await connection.execute('DESCRIBE tasks');
    console.log('\ntasks表结构:');
    tasksColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    });
    
    // 检查现有项目数据
    const [projects] = await connection.execute('SELECT id, name, owner_id, status, created_at FROM projects LIMIT 5');
    console.log('\n现有项目数据:');
    projects.forEach(project => {
      console.log(`- ID: ${project.id}, Name: ${project.name}, Owner: ${project.owner_id}, Status: ${project.status}`);
    });
    
  } catch (error) {
    console.error('检查表结构失败:', error);
  } finally {
    await connection.end();
  }
}

checkTables();