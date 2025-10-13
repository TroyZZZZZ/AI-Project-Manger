#!/usr/bin/env node

/**
 * 数据库连接和功能测试脚本
 * 用于验证阿里云RDS MySQL连接和基本CRUD操作
 */

require('dotenv').config();
const { db, Database } = require('./api/lib/database.cjs');

// 测试颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}=== ${msg} ===${colors.reset}`)
};

// 测试用例
const tests = {
  // 1. 测试数据库连接
  async testConnection() {
    log.title('测试数据库连接');
    try {
      await db.testConnection();
      log.success('数据库连接成功');
      return true;
    } catch (error) {
      log.error(`数据库连接失败: ${error.message}`);
      return false;
    }
  },

  // 2. 测试基本查询
  async testBasicQuery() {
    log.title('测试基本查询');
    try {
      const [result] = await db.query('SELECT 1 + 1 as result, NOW() as current_time');
      log.success(`查询结果: ${result[0].result}, 当前时间: ${result[0].current_time}`);
      return true;
    } catch (error) {
      log.error(`基本查询失败: ${error.message}`);
      return false;
    }
  },

  // 3. 测试数据库和表是否存在
  async testDatabaseStructure() {
    log.title('测试数据库结构');
    try {
      // 检查数据库是否存在
      const [databases] = await db.query('SHOW DATABASES LIKE ?', [process.env.DB_NAME]);
      if (databases.length === 0) {
        log.warning(`数据库 '${process.env.DB_NAME}' 不存在，需要先创建数据库`);
        return false;
      }
      log.success(`数据库 '${process.env.DB_NAME}' 存在`);

      // 检查主要表是否存在
      const tables = ['users', 'projects', 'tasks', 'project_members', 'task_comments'];
      const [existingTables] = await db.query(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)',
        [process.env.DB_NAME, tables]
      );
      
      const existingTableNames = existingTables.map(t => t.TABLE_NAME);
      const missingTables = tables.filter(t => !existingTableNames.includes(t));
      
      if (missingTables.length > 0) {
        log.warning(`缺少以下表: ${missingTables.join(', ')}`);
        log.info('请运行数据库迁移脚本创建表结构');
        return false;
      }
      
      log.success(`所有主要表都存在: ${existingTableNames.join(', ')}`);
      return true;
    } catch (error) {
      log.error(`检查数据库结构失败: ${error.message}`);
      return false;
    }
  },

  // 4. 测试事务功能
  async testTransaction() {
    log.title('测试事务功能');
    try {
      await db.beginTransaction();
      
      // 创建测试表（如果不存在）
      await db.query(`
        CREATE TABLE IF NOT EXISTS test_transaction (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 插入测试数据
      await db.query('INSERT INTO test_transaction (name) VALUES (?)', ['test_data']);
      
      // 回滚事务
      await db.rollback();
      
      // 检查数据是否被回滚
      const [result] = await db.query('SELECT COUNT(*) as count FROM test_transaction WHERE name = ?', ['test_data']);
      
      if (result[0].count === 0) {
        log.success('事务回滚功能正常');
        
        // 清理测试表
        await db.query('DROP TABLE IF EXISTS test_transaction');
        return true;
      } else {
        log.error('事务回滚失败');
        return false;
      }
    } catch (error) {
      try {
        await db.rollback();
      } catch (rollbackError) {
        log.error(`回滚失败: ${rollbackError.message}`);
      }
      log.error(`事务测试失败: ${error.message}`);
      return false;
    }
  },

  // 5. 测试连接池
  async testConnectionPool() {
    log.title('测试连接池');
    try {
      const promises = [];
      const concurrentQueries = 5;
      
      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          db.query('SELECT ? as query_id, CONNECTION_ID() as connection_id, SLEEP(0.1)', [i])
        );
      }
      
      const results = await Promise.all(promises);
      const connectionIds = results.map(([rows]) => rows[0].connection_id);
      const uniqueConnections = new Set(connectionIds);
      
      log.success(`并发查询成功，使用了 ${uniqueConnections.size} 个不同的连接`);
      return true;
    } catch (error) {
      log.error(`连接池测试失败: ${error.message}`);
      return false;
    }
  },

  // 6. 测试用户表CRUD操作（如果表存在）
  async testUsersCRUD() {
    log.title('测试用户表CRUD操作');
    try {
      // 检查users表是否存在
      const [tables] = await db.query(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [process.env.DB_NAME, 'users']
      );
      
      if (tables.length === 0) {
        log.warning('users表不存在，跳过CRUD测试');
        return true;
      }
      
      const testEmail = `test_${Date.now()}@example.com`;
      
      // 创建测试用户
      const [insertResult] = await db.query(
        'INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, NOW())',
        ['test_user', testEmail, 'test_hash']
      );
      const userId = insertResult.insertId;
      log.success(`创建测试用户成功，ID: ${userId}`);
      
      // 读取用户
      const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (users.length > 0) {
        log.success(`读取用户成功: ${users[0].username}`);
      }
      
      // 更新用户
      await db.query('UPDATE users SET username = ? WHERE id = ?', ['updated_user', userId]);
      const [updatedUsers] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
      if (updatedUsers[0].username === 'updated_user') {
        log.success('更新用户成功');
      }
      
      // 删除测试用户
      await db.query('DELETE FROM users WHERE id = ?', [userId]);
      const [deletedUsers] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (deletedUsers.length === 0) {
        log.success('删除用户成功');
      }
      
      return true;
    } catch (error) {
      log.error(`用户表CRUD测试失败: ${error.message}`);
      return false;
    }
  },

  // 7. 测试分页查询
  async testPagination() {
    log.title('测试分页查询');
    try {
      const page = 1;
      const limit = 5;
      const offset = (page - 1) * limit;
      
      // 使用information_schema进行分页测试
      const [result] = await db.query(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? LIMIT ? OFFSET ?',
        [process.env.DB_NAME, limit, offset]
      );
      
      log.success(`分页查询成功，返回 ${result.length} 条记录`);
      return true;
    } catch (error) {
      log.error(`分页查询测试失败: ${error.message}`);
      return false;
    }
  }
};

// 运行所有测试
async function runAllTests() {
  console.log(`${colors.magenta}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    数据库连接测试工具                          ║');
  console.log('║                  阿里云RDS MySQL 连接测试                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  log.info(`数据库主机: ${process.env.DB_HOST}`);
  log.info(`数据库端口: ${process.env.DB_PORT}`);
  log.info(`数据库名称: ${process.env.DB_NAME}`);
  log.info(`数据库用户: ${process.env.DB_USER}`);
  
  const testResults = [];
  const testList = [
    { name: '数据库连接', fn: tests.testConnection },
    { name: '基本查询', fn: tests.testBasicQuery },
    { name: '数据库结构', fn: tests.testDatabaseStructure },
    { name: '事务功能', fn: tests.testTransaction },
    { name: '连接池', fn: tests.testConnectionPool },
    { name: '用户表CRUD', fn: tests.testUsersCRUD },
    { name: '分页查询', fn: tests.testPagination }
  ];
  
  for (const test of testList) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, success: result });
    } catch (error) {
      log.error(`测试 '${test.name}' 执行异常: ${error.message}`);
      testResults.push({ name: test.name, success: false });
    }
  }
  
  // 输出测试结果摘要
  log.title('测试结果摘要');
  const passedTests = testResults.filter(t => t.success);
  const failedTests = testResults.filter(t => !t.success);
  
  console.log(`\n${colors.bright}测试统计:${colors.reset}`);
  console.log(`  总计: ${testResults.length}`);
  console.log(`  ${colors.green}通过: ${passedTests.length}${colors.reset}`);
  console.log(`  ${colors.red}失败: ${failedTests.length}${colors.reset}`);
  
  if (failedTests.length > 0) {
    console.log(`\n${colors.red}失败的测试:${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`  - ${test.name}`);
    });
    
    console.log(`\n${colors.yellow}建议:${colors.reset}`);
    console.log('  1. 检查 .env 文件中的数据库配置');
    console.log('  2. 确认阿里云RDS实例正在运行');
    console.log('  3. 验证网络连接和安全组设置');
    console.log('  4. 运行数据库迁移脚本创建表结构');
  } else {
    log.success('所有测试都通过了！数据库配置正确。');
  }
  
  // 关闭数据库连接
  try {
    await db.closePool();
    log.info('数据库连接池已关闭');
  } catch (error) {
    log.error(`关闭连接池失败: ${error.message}`);
  }
  
  process.exit(failedTests.length > 0 ? 1 : 0);
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log.error(`未捕获的异常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = { tests, runAllTests };