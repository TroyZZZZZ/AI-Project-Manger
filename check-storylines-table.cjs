const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStorylines() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('数据库连接成功');

    // 检查storylines表是否存在
    const [tables] = await connection.execute("SHOW TABLES LIKE 'storylines'");
    console.log('storylines表存在:', tables.length > 0);

    if (tables.length > 0) {
      // 检查表结构
      const [columns] = await connection.execute('DESCRIBE storylines');
      console.log('storylines表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // 检查数据
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM storylines');
      console.log('storylines表记录数:', rows[0].count);

      // 检查project_id=4的记录
      const [project4Rows] = await connection.execute('SELECT COUNT(*) as count FROM storylines WHERE project_id = ?', [4]);
      console.log('project_id=4的storylines记录数:', project4Rows[0].count);
    }

  } catch (error) {
    console.error('错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkStorylines();