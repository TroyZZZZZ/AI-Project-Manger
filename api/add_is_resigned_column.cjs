const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'rm-uf6f5x1pfe1cihz70fo.mysql.rds.aliyuncs.com',
      port: 3306,
      user: 'Root',
      password: 'Zcmy2608',
      database: 'project-management-db'
    });

    console.log('Connected to database.');

    // Check if column exists first to avoid error
    const [rows] = await connection.execute("SHOW COLUMNS FROM stakeholders LIKE 'is_resigned'");
    
    if (rows.length === 0) {
      console.log('Adding is_resigned column...');
      await connection.execute(`
        ALTER TABLE stakeholders 
        ADD COLUMN is_resigned BOOLEAN DEFAULT FALSE 
        COMMENT '是否离职'
      `);
      console.log('is_resigned字段添加成功');
    } else {
      console.log('is_resigned字段已存在');
    }
    
    await connection.end();
  } catch (error) {
    console.error('添加is_resigned字段失败:', error.message);
  }
})();
