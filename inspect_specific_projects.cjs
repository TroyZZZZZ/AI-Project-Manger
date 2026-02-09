require('dotenv').config();
const mysql = require('mysql2/promise');

const targetIds = [29, 30, 32, 34, 35, 36, 38, 39];

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // 1. 项目详细信息
    const [projects] = await conn.query(`
      SELECT id, name, description, parent_id,
             DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, 
             DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, 
             DATE_FORMAT(created_at, '%Y-%m-%d') as created_at
      FROM projects 
      WHERE id IN (${targetIds.join(',')})
    `);

    // 2. 关联的故事线
    const [storylines] = await conn.query(`
      SELECT id, project_id, title, content, 
             DATE_FORMAT(event_time, '%Y-%m-%d') as event_date
      FROM storylines 
      WHERE project_id IN (${targetIds.join(',')})
    `);

    // 3. 关联的任务
    const [tasks] = await conn.query(`
      SELECT id, project_id, title, description, 
             DATE_FORMAT(due_date, '%Y-%m-%d') as due_date
      FROM tasks 
      WHERE project_id IN (${targetIds.join(',')})
    `);

    console.log(JSON.stringify({ projects, storylines, tasks }, null, 2));
    
    await conn.end();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
