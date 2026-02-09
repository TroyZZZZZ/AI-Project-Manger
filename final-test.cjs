const mysql = require('mysql2/promise');
require('dotenv').config();

// 颜色输出函数
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试统计
let testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  failedTests: []
};

// 数据库连接
let connection;

// 测试函数包装器
async function runTest(testName, testFn) {
  testStats.total++;
  try {
    log(`\n=== ${testName} ===`, 'blue');
    await testFn();
    log(`✅ ${testName} 通过`, 'green');
    testStats.passed++;
  } catch (error) {
    log(`❌ ${testName} 失败: ${error.message}`, 'red');
    testStats.failed++;
    testStats.failedTests.push(testName);
  }
}

// 1. 数据库连接测试
async function testConnection() {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 60000,
    ssl: false
  });
  
  const [result] = await connection.query('SELECT 1 as test, NOW() as `current_time`');
  if (result[0].test !== 1) {
    throw new Error('数据库连接测试失败');
  }
  log('数据库连接正常', 'green');
}

// 2. 表结构验证
async function testTableStructure() {
  const [tables] = await connection.query('SHOW TABLES');
  
  if (tables.length === 0) {
    throw new Error('数据库中没有表');
  }
  
  log(`找到 ${tables.length} 个表`, 'cyan');
  
  const expectedTables = ['users', 'projects', 'tasks', 'project_members'];
  const existingTableNames = tables.map(t => t[`Tables_in_${process.env.DB_NAME}`]);
  
  for (const expectedTable of expectedTables) {
    if (!existingTableNames.includes(expectedTable)) {
      throw new Error(`缺少关键表: ${expectedTable}`);
    }
  }
  
  log('关键表结构验证通过', 'green');
}

// 3. 用户表CRUD测试
async function testUserCRUD() {
  // 创建测试用户
  const testUser = {
    username: 'test_user_' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'test_password_hash'
  };
  
  const [insertResult] = await connection.query(
    'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [testUser.username, testUser.email, testUser.password]
  );
  
  if (!insertResult.insertId) {
    throw new Error('用户创建失败');
  }
  
  const userId = insertResult.insertId;
  log(`用户创建成功，ID: ${userId}`, 'cyan');
  
  // 查询用户
  const [selectResult] = await connection.query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  
  if (selectResult.length === 0) {
    throw new Error('用户查询失败');
  }
  
  log(`用户查询成功: ${selectResult[0].username}`, 'cyan');
  
  // 更新用户
  const newEmail = `updated${Date.now()}@example.com`;
  await connection.query(
    'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
    [newEmail, userId]
  );
  
  const [updatedResult] = await connection.query(
    'SELECT email FROM users WHERE id = ?',
    [userId]
  );
  
  if (updatedResult[0].email !== newEmail) {
    throw new Error('用户更新失败');
  }
  
  log('用户更新成功', 'cyan');
  
  // 删除测试用户
  await connection.query('DELETE FROM users WHERE id = ?', [userId]);
  
  const [deletedResult] = await connection.query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  
  if (deletedResult.length > 0) {
    throw new Error('用户删除失败');
  }
  
  log('用户删除成功', 'cyan');
}

// 4. 项目表CRUD测试
async function testProjectCRUD() {
  // 先创建一个用户作为项目创建者
  const [userResult] = await connection.query(
    'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    ['project_owner', `owner${Date.now()}@example.com`, 'password_hash']
  );
  
  const userId = userResult.insertId;
  
  // 创建项目
  const testProject = {
    name: '测试项目_' + Date.now(),
    description: '这是一个测试项目',
    owner_id: userId
  };
  
  const [projectResult] = await connection.query(
    'INSERT INTO projects (name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [testProject.name, testProject.description, testProject.owner_id]
  );
  
  if (!projectResult.insertId) {
    throw new Error('项目创建失败');
  }
  
  const projectId = projectResult.insertId;
  log(`项目创建成功，ID: ${projectId}`, 'cyan');
  
  // 查询项目
  const [selectResult] = await connection.query(
    'SELECT * FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (selectResult.length === 0) {
    throw new Error('项目查询失败');
  }
  
  log(`项目查询成功: ${selectResult[0].name}`, 'cyan');
  
  // 清理测试数据
  await connection.query('DELETE FROM projects WHERE id = ?', [projectId]);
  await connection.query('DELETE FROM users WHERE id = ?', [userId]);
  
  log('项目CRUD测试完成', 'cyan');
}

// 5. 任务表CRUD测试
async function testTaskCRUD() {
  // 创建用户和项目
  const [userResult] = await connection.query(
    'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [`task_user_${Date.now()}`, `task${Date.now()}@example.com`, 'password_hash']
  );
  
  const userId = userResult.insertId;
  
  const [projectResult] = await connection.query(
    'INSERT INTO projects (name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    ['任务测试项目', '用于测试任务功能的项目', userId]
  );
  
  const projectId = projectResult.insertId;
  
  // 创建任务
  const testTask = {
    title: '测试任务_' + Date.now(),
    description: '这是一个测试任务',
    project_id: projectId,
    assigned_to: userId,
    created_by: userId
  };
  
  const [taskResult] = await connection.query(
    'INSERT INTO tasks (title, description, project_id, assignee_id, reporter_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [testTask.title, testTask.description, testTask.project_id, testTask.assigned_to, testTask.created_by]
  );
  
  if (!taskResult.insertId) {
    throw new Error('任务创建失败');
  }
  
  const taskId = taskResult.insertId;
  log(`任务创建成功，ID: ${taskId}`, 'cyan');
  
  // 查询任务
  const [selectResult] = await connection.query(
    'SELECT * FROM tasks WHERE id = ?',
    [taskId]
  );
  
  if (selectResult.length === 0) {
    throw new Error('任务查询失败');
  }
  
  log(`任务查询成功: ${selectResult[0].title}`, 'cyan');
  
  // 清理测试数据
  await connection.query('DELETE FROM tasks WHERE id = ?', [taskId]);
  await connection.query('DELETE FROM projects WHERE id = ?', [projectId]);
  await connection.query('DELETE FROM users WHERE id = ?', [userId]);
  
  log('任务CRUD测试完成', 'cyan');
}

// 6. 关联查询测试
async function testJoinQueries() {
  // 创建测试数据
  const [userResult] = await connection.query(
    'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [`join_user_${Date.now()}`, `join${Date.now()}@example.com`, 'password_hash']
  );
  
  const userId = userResult.insertId;
  
  const [projectResult] = await connection.query(
    'INSERT INTO projects (name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    ['关联查询测试项目', '用于测试关联查询的项目', userId]
  );
  
  const projectId = projectResult.insertId;
  
  const [taskResult] = await connection.query(
    'INSERT INTO tasks (title, description, project_id, assignee_id, reporter_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    ['关联查询测试任务', '用于测试关联查询的任务', projectId, userId, userId]
  );
  
  const taskId = taskResult.insertId;
  
  // 执行关联查询
  const [joinResult] = await connection.query(`
    SELECT 
      p.name as project_name,
      t.title as task_title,
      u.username as assigned_user
    FROM projects p
    LEFT JOIN tasks t ON p.id = t.project_id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE p.id = ?
  `, [projectId]);
  
  if (joinResult.length === 0) {
    throw new Error('关联查询失败');
  }
  
  log(`关联查询成功: 项目 ${joinResult[0].project_name}, 任务 ${joinResult[0].task_title}, 分配给 ${joinResult[0].assigned_user}`, 'cyan');
  
  // 清理测试数据
  await connection.query('DELETE FROM tasks WHERE id = ?', [taskId]);
  await connection.query('DELETE FROM projects WHERE id = ?', [projectId]);
  await connection.query('DELETE FROM users WHERE id = ?', [userId]);
  
  log('关联查询测试完成', 'cyan');
}

// 7. 事务测试
async function testTransaction() {
  await connection.beginTransaction();
  
  try {
    // 在事务中创建用户
    const [userResult] = await connection.query(
      'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [`transaction_user_${Date.now()}`, `trans${Date.now()}@example.com`, 'password_hash']
    );
    
    const userId = userResult.insertId;
    
    // 在事务中创建项目
    const [projectResult] = await connection.query(
      'INSERT INTO projects (name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      ['事务测试项目', '用于测试事务的项目', userId]
    );
    
    const projectId = projectResult.insertId;
    
    // 回滚事务
    await connection.rollback();
    
    // 检查数据是否被回滚
    const [userCheck] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
    const [projectCheck] = await connection.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    if (userCheck.length > 0 || projectCheck.length > 0) {
      throw new Error('事务回滚失败');
    }
    
    log('事务回滚测试成功', 'cyan');
    
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

// 主测试函数
async function runAllTests() {
  log('🚀 开始项目管理系统数据库功能测试\n', 'yellow');
  
  try {
    await runTest('数据库连接测试', testConnection);
    await runTest('表结构验证', testTableStructure);
    await runTest('用户表CRUD测试', testUserCRUD);
    await runTest('项目表CRUD测试', testProjectCRUD);
    await runTest('任务表CRUD测试', testTaskCRUD);
    await runTest('关联查询测试', testJoinQueries);
    await runTest('事务功能测试', testTransaction);
    
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
      log('\n🎉 所有测试通过！数据库功能正常！', 'green');
      log('✅ 项目管理系统数据库已准备就绪，可以开始使用！', 'green');
    } else {
      log('\n⚠️  部分测试失败，请检查上述错误信息', 'yellow');
    }
    
    // 关闭数据库连接
    if (connection) {
      await connection.end();
      log('\n🔌 数据库连接已关闭', 'cyan');
    }
  }
}

// 运行测试
runAllTests().catch(error => {
  log(`测试运行失败: ${error.message}`, 'red');
  process.exit(1);
});