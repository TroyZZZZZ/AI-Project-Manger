require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // 1. 获取所有项目
    const [projects] = await conn.query('SELECT id, name, status, start_date, end_date, created_at FROM projects');
    
    // 2. 获取2025年的故事线
    const [storylines] = await conn.query(`
      SELECT s.id, s.project_id, s.title, s.status, 
             DATE_FORMAT(s.event_time, '%Y-%m-%d') as event_date, 
             s.created_at 
      FROM storylines s 
      WHERE YEAR(s.event_time) = 2025 OR YEAR(s.created_at) = 2025
    `);

    // 3. 获取2025年的跟进记录
    const [followups] = await conn.query(`
      SELECT f.id, f.storyline_id, f.content, 
             DATE_FORMAT(f.created_at, '%Y-%m-%d') as created_date, 
             f.result 
      FROM storyline_follow_up_records f 
      WHERE YEAR(f.created_at) = 2025
    `);

    // 4. 获取2025年的任务
    const [tasks] = await conn.query(`
      SELECT id, project_id, title, status, 
             DATE_FORMAT(created_at, '%Y-%m-%d') as created_date, 
             DATE_FORMAT(due_date, '%Y-%m-%d') as due_date 
      FROM tasks 
      WHERE YEAR(created_at) = 2025
    `);

    // 5. 获取所有子项目
    const [subprojects] = await conn.query('SELECT id, parent_id, name, status, created_at FROM subprojects');

    console.log(JSON.stringify({ projects, storylines, followups, tasks, subprojects }, null, 2));
    
    await conn.end();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
