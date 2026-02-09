require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function testMySQLVersion() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Connected to database');

  // 检查MySQL版本
  const [versionResult] = await connection.execute('SELECT VERSION() as version');
  console.log('MySQL版本:', versionResult[0].version);

  // 测试简单的参数化查询
  try {
    console.log('\n测试简单参数化查询...');
    const [result1] = await connection.execute('SELECT ? as test_param', [1]);
    console.log('简单参数查询成功:', result1[0]);

    console.log('\n测试LIMIT参数化查询...');
    const [result2] = await connection.execute('SELECT * FROM projects LIMIT ?', [1]);
    console.log('LIMIT参数查询成功，结果数量:', result2.length);

    console.log('\n测试LIMIT OFFSET参数化查询...');
    const [result3] = await connection.execute('SELECT * FROM projects LIMIT ? OFFSET ?', [1, 0]);
    console.log('LIMIT OFFSET参数查询成功，结果数量:', result3.length);

    console.log('\n测试WHERE + LIMIT + OFFSET参数化查询...');
    const [result4] = await connection.execute('SELECT * FROM projects WHERE owner_id = ? LIMIT ? OFFSET ?', [1, 1, 0]);
    console.log('完整参数查询成功，结果数量:', result4.length);

  } catch (error) {
    console.error('参数化查询失败:', error.message);
    console.error('错误代码:', error.code);
  }

  await connection.end();
}

testMySQLVersion().catch(console.error);