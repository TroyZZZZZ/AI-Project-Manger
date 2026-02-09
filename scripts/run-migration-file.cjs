const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runSqlFile(sqlFilePath) {
  let connection;
  try {
    const resolvedPath = path.isAbsolute(sqlFilePath)
      ? sqlFilePath
      : path.join(process.cwd(), sqlFilePath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ 找不到SQL文件: ${resolvedPath}`);
      process.exit(1);
    }

    console.log(`🔄 准备执行迁移文件: ${resolvedPath}`);

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      connectTimeout: 60000,
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功');

    const sqlContent = fs.readFileSync(resolvedPath, 'utf8');

    // 简单拆分语句；不处理自定义DELIMITER
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 共解析到 ${statements.length} 条语句，开始执行...`);

    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await connection.execute(stmt);
        successCount++;
        console.log(`✅ [${i + 1}/${statements.length}] 执行成功`);
      } catch (err) {
        console.warn(`⚠️  [${i + 1}/${statements.length}] 执行失败: ${err.message}`);
      }
    }

    console.log(`\n🎉 迁移执行完成：成功 ${successCount}/${statements.length}`);

    // 简单验证
    try {
      const [cols] = await connection.execute('SHOW COLUMNS FROM project_stories');
      const colNames = cols.map(c => c.Field);
      console.log('📋 project_stories列:', colNames.join(', '));
    } catch (e) {
      console.warn('⚠️  无法验证project_stories结构:', e.message);
    }

  } catch (error) {
    console.error('❌ 迁移执行异常:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 数据库连接已关闭');
    }
  }
}

// CLI 默认执行 003 跟进相关迁移
const target = process.argv[2] || path.join('migrations', '003_add_story_followup_fields.sql');
runSqlFile(target);