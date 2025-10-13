#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 用于验证阿里云RDS MySQL连接是否正常
 */

const { db } = require('../api/config/database');
const path = require('path');
const fs = require('fs');

// 颜色输出函数
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

// 测试数据库连接
async function testConnection() {
  console.log(colors.blue('🔍 测试数据库连接...'));
  
  try {
    const result = await db.testConnection();
    if (result.success) {
      console.log(colors.green('✅ 数据库连接成功!'));
      console.log(colors.cyan(`   服务器版本: ${result.version}`));
      return true;
    } else {
      console.log(colors.red('❌ 数据库连接失败:'));
      console.log(colors.red(`   ${result.error}`));
      return false;
    }
  } catch (error) {
    console.log(colors.red('❌ 数据库连接测试异常:'));
    console.log(colors.red(`   ${error.message}`));
    return false;
  }
}

// 检查环境变量
function checkEnvironmentVariables() {
  console.log(colors.blue('🔍 检查环境变量配置...'));
  
  const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];
  
  const missing = [];
  const configured = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      configured.push(varName);
    } else {
      missing.push(varName);
    }
  });
  
  if (configured.length > 0) {
    console.log(colors.green('✅ 已配置的环境变量:'));
    configured.forEach(varName => {
      const value = varName.includes('PASSWORD') ? '***' : process.env[varName];
      console.log(colors.cyan(`   ${varName}: ${value}`));
    });
  }
  
  if (missing.length > 0) {
    console.log(colors.red('❌ 缺失的环境变量:'));
    missing.forEach(varName => {
      console.log(colors.red(`   ${varName}`));
    });
    return false;
  }
  
  return true;
}

// 测试基本查询
async function testBasicQueries() {
  console.log(colors.blue('🔍 测试基本数据库查询...'));
  
  try {
    // 测试查询当前时间
    const timeResult = await db.query('SELECT NOW() as current_time');
    console.log(colors.green('✅ 时间查询成功:'));
    console.log(colors.cyan(`   当前时间: ${timeResult[0].current_time}`));
    
    // 测试查询数据库版本
    const versionResult = await db.query('SELECT VERSION() as version');
    console.log(colors.green('✅ 版本查询成功:'));
    console.log(colors.cyan(`   MySQL版本: ${versionResult[0].version}`));
    
    // 测试查询数据库名
    const dbResult = await db.query('SELECT DATABASE() as db_name');
    console.log(colors.green('✅ 数据库查询成功:'));
    console.log(colors.cyan(`   当前数据库: ${dbResult[0].db_name}`));
    
    return true;
  } catch (error) {
    console.log(colors.red('❌ 基本查询测试失败:'));
    console.log(colors.red(`   ${error.message}`));
    return false;
  }
}

// 测试表结构
async function testTableStructure() {
  console.log(colors.blue('🔍 检查数据库表结构...'));
  
  try {
    const tables = await db.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log(colors.yellow('⚠️  数据库中没有表，需要运行初始化脚本'));
      return false;
    }
    
    console.log(colors.green(`✅ 找到 ${tables.length} 个表:`));
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(colors.cyan(`   - ${tableName}`));
    });
    
    // 检查关键表是否存在
    const requiredTables = ['users', 'projects', 'tasks', 'timeline_events'];
    const existingTables = tables.map(table => Object.values(table)[0]);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(colors.yellow('⚠️  缺失关键表:'));
      missingTables.forEach(table => {
        console.log(colors.yellow(`   - ${table}`));
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(colors.red('❌ 表结构检查失败:'));
    console.log(colors.red(`   ${error.message}`));
    return false;
  }
}

// 测试数据操作
async function testDataOperations() {
  console.log(colors.blue('🔍 测试数据库CRUD操作...'));
  
  try {
    // 测试插入
    const testUser = {
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'test_password',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const insertResult = await db.query(
      'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [testUser.username, testUser.email, testUser.password, testUser.created_at, testUser.updated_at]
    );
    
    const userId = insertResult.insertId;
    console.log(colors.green('✅ 数据插入成功'));
    console.log(colors.cyan(`   用户ID: ${userId}`));
    
    // 测试查询
    const selectResult = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (selectResult.length > 0) {
      console.log(colors.green('✅ 数据查询成功'));
      console.log(colors.cyan(`   用户名: ${selectResult[0].username}`));
    }
    
    // 测试更新
    const newUsername = `updated_${testUser.username}`;
    await db.query('UPDATE users SET username = ?, updated_at = ? WHERE id = ?', 
      [newUsername, new Date(), userId]);
    console.log(colors.green('✅ 数据更新成功'));
    
    // 测试删除
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    console.log(colors.green('✅ 数据删除成功'));
    
    return true;
  } catch (error) {
    console.log(colors.red('❌ 数据操作测试失败:'));
    console.log(colors.red(`   ${error.message}`));
    return false;
  }
}

// 运行初始化脚本
async function runInitScript() {
  console.log(colors.blue('🔍 运行数据库初始化脚本...'));
  
  try {
    const initScriptPath = path.join(__dirname, '../database/init.sql');
    
    if (!fs.existsSync(initScriptPath)) {
      console.log(colors.red('❌ 初始化脚本不存在:'));
      console.log(colors.red(`   ${initScriptPath}`));
      return false;
    }
    
    const sqlContent = fs.readFileSync(initScriptPath, 'utf8');
    
    // 分割SQL语句（简单处理）
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(colors.cyan(`   执行 ${statements.length} 条SQL语句...`));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
    
    console.log(colors.green('✅ 数据库初始化完成'));
    return true;
  } catch (error) {
    console.log(colors.red('❌ 初始化脚本执行失败:'));
    console.log(colors.red(`   ${error.message}`));
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log(colors.blue('🚀 开始数据库连接测试\n'));
  
  const tests = [
    { name: '环境变量检查', fn: checkEnvironmentVariables },
    { name: '数据库连接测试', fn: testConnection },
    { name: '基本查询测试', fn: testBasicQueries },
    { name: '表结构检查', fn: testTableStructure }
  ];
  
  let allPassed = true;
  let needsInit = false;
  
  for (const test of tests) {
    console.log(`\n${colors.blue('=')} ${test.name} ${colors.blue('='.repeat(50 - test.name.length))}`);
    const result = await test.fn();
    if (!result) {
      allPassed = false;
      if (test.name === '表结构检查') {
        needsInit = true;
      }
    }
  }
  
  // 如果需要初始化数据库
  if (needsInit) {
    console.log(`\n${colors.yellow('⚠️  检测到数据库需要初始化，正在运行初始化脚本...')}`);
    const initResult = await runInitScript();
    if (initResult) {
      console.log(`\n${colors.blue('=')} 重新检查表结构 ${colors.blue('='.repeat(35))}`);
      const recheckResult = await testTableStructure();
      if (recheckResult) {
        console.log(`\n${colors.blue('=')} 数据操作测试 ${colors.blue('='.repeat(40))}`);
        await testDataOperations();
      }
    }
  } else if (allPassed) {
    console.log(`\n${colors.blue('=')} 数据操作测试 ${colors.blue('='.repeat(40))}`);
    await testDataOperations();
  }
  
  // 输出最终结果
  console.log(`\n${colors.blue('=')} 测试结果 ${colors.blue('='.repeat(45))}`);
  if (allPassed) {
    console.log(colors.green('🎉 所有测试通过！数据库配置正确。'));
  } else {
    console.log(colors.red('❌ 部分测试失败，请检查配置。'));
  }
  
  // 关闭数据库连接
  await db.close();
  process.exit(allPassed ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.log(colors.red('❌ 未处理的错误:'));
  console.log(colors.red(error.message));
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  testConnection,
  checkEnvironmentVariables,
  testBasicQueries,
  testTableStructure,
  testDataOperations,
  runInitScript
};