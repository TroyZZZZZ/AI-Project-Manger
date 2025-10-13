require('dotenv').config();
const db = require('./api/database-sqlite.cjs');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试统计
let testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  failedTests: []
};

// 测试函数
async function runTest(testName, testFn) {
  testStats.total++;
  try {
    log(`\n=== ${testName} ===`, 'blue');
    await testFn();
    log(`✅ ${testName}通过`, 'green');
    testStats.passed++;
  } catch (error) {
    log(`❌ ${testName}失败: ${error.message}`, 'red');
    testStats.failed++;
    testStats.failedTests.push(testName);
  }
}

// 创建表结构的SQL（简化版）
const createTablesSQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  created_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  project_id INTEGER,
  assigned_to INTEGER,
  created_by INTEGER,
  due_date DATE,
  estimated_hours REAL,
  actual_hours REAL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
`;

// 测试用例
async function testDatabaseConnection() {
  await db.connect();
  const isConnected = await db.testConnection();
  if (!isConnected) {
    throw new Error('数据库连接失败');
  }
  log('数据库连接成功', 'green');
}

async function testCreateTables() {
  // 分别执行每个CREATE TABLE语句
  const statements = createTablesSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--') && stmt.toUpperCase().includes('CREATE'));
  
  for (const statement of statements) {
    try {
      await db.query(statement);
      log(`表创建成功: ${statement.substring(0, 50)}...`, 'green');
    } catch (error) {
      log(`表创建失败: ${error.message}`, 'red');
      throw error;
    }
  }
  log('数据表创建成功', 'green');
}

async function testBasicQuery() {
  const result = await db.query('SELECT 1 as test_value');
  if (result.length === 0 || result[0].test_value !== 1) {
    throw new Error('基本查询测试失败');
  }
  log('基本查询测试通过', 'green');
}

async function testUserCRUD() {
  // 插入测试用户
  const insertResult = await db.query(
    'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
    ['testuser', 'test@example.com', 'hashedpassword', '测试用户']
  );
  
  if (!insertResult.insertId) {
    throw new Error('用户插入失败');
  }
  
  const userId = insertResult.insertId;
  log(`用户插入成功，ID: ${userId}`, 'green');
  
  // 查询用户
  const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new Error('用户查询失败');
  }
  
  log(`用户查询成功: ${users[0].username}`, 'green');
  
  // 更新用户
  await db.query('UPDATE users SET full_name = ? WHERE id = ?', ['更新的用户名', userId]);
  
  // 验证更新
  const updatedUsers = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (updatedUsers[0].full_name !== '更新的用户名') {
    throw new Error('用户更新失败');
  }
  
  log('用户更新成功', 'green');
  
  // 删除用户
  await db.query('DELETE FROM users WHERE id = ?', [userId]);
  
  // 验证删除
  const deletedUsers = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (deletedUsers.length > 0) {
    throw new Error('用户删除失败');
  }
  
  log('用户删除成功', 'green');
}

async function testProjectCRUD() {
  // 先创建一个用户
  const userResult = await db.query(
    'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
    ['projectuser', 'project@example.com', 'hashedpassword', '项目用户']
  );
  
  const userId = userResult.insertId;
  
  // 创建项目
  const projectResult = await db.query(
    'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)',
    ['测试项目', '这是一个测试项目', userId]
  );
  
  if (!projectResult.insertId) {
    throw new Error('项目创建失败');
  }
  
  const projectId = projectResult.insertId;
  log(`项目创建成功，ID: ${projectId}`, 'green');
  
  // 查询项目
  const projects = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (projects.length === 0) {
    throw new Error('项目查询失败');
  }
  
  log(`项目查询成功: ${projects[0].name}`, 'green');
  
  // 清理测试数据
  await db.query('DELETE FROM projects WHERE id = ?', [projectId]);
  await db.query('DELETE FROM users WHERE id = ?', [userId]);
  
  log('项目CRUD测试完成', 'green');
}

async function testTransaction() {
  await db.beginTransaction();
  
  try {
    // 在事务中插入数据
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      ['transactionuser', 'transaction@example.com', 'hashedpassword', '事务用户']
    );
    
    const userId = result.insertId;
    
    // 故意制造一个错误来测试回滚
    await db.rollback();
    
    // 验证数据已回滚
    const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length > 0) {
      throw new Error('事务回滚失败');
    }
    
    log('事务回滚测试通过', 'green');
    
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

// 主测试函数
async function runAllTests() {
  log('开始SQLite数据库测试...', 'yellow');
  
  try {
    await runTest('数据库连接', testDatabaseConnection);
    await runTest('创建数据表', testCreateTables);
    await runTest('基本查询', testBasicQuery);
    await runTest('用户CRUD操作', testUserCRUD);
    await runTest('项目CRUD操作', testProjectCRUD);
    await runTest('事务功能', testTransaction);
    
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`, 'red');
  } finally {
    // 输出测试结果摘要
    log('\n=== 测试结果摘要 ===', 'blue');
    log(`\n测试统计:`, 'yellow');
    log(`  总计: ${testStats.total}`);
    log(`  通过: ${testStats.passed}`, 'green');
    log(`  失败: ${testStats.failed}`, testStats.failed > 0 ? 'red' : 'green');
    
    if (testStats.failedTests.length > 0) {
      log('\n失败的测试:', 'red');
      testStats.failedTests.forEach(test => {
        log(`  - ${test}`, 'red');
      });
    }
    
    if (testStats.failed === 0) {
      log('\n🎉 所有测试通过！', 'green');
    } else {
      log('\n⚠️  部分测试失败，请检查上述错误信息', 'yellow');
    }
    
    // 关闭数据库连接
    await db.close();
  }
}

// 运行测试
runAllTests().catch(error => {
  log(`测试运行失败: ${error.message}`, 'red');
  process.exit(1);
});