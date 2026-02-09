const mysql = require('mysql2/promise');

async function checkUsersTable() {
  const connection = await mysql.createConnection({
    host: 'rm-uf6f5x1pfe1cihz70fo.mysql.rds.aliyuncs.com',
    port: 3306,
    user: 'Root',
    password: 'Zcmy2608',
    database: 'project-management-db'
  });

  try {
    const [columns] = await connection.query('DESCRIBE users');
    console.log('用户表结构:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? '(' + col.Key + ')' : ''}`);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsersTable();