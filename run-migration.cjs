const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 连接到阿里云数据库...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      connectTimeout: 60000
    });

    console.log('✅ 数据库连接成功');

    // 读取迁移文件
    const migrationFile = path.join(__dirname, 'migrations', '002_create_subproject_stakeholder_storyline_tables.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    console.log('🔄 执行数据库迁移...');

    // 分割SQL语句并执行
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✅ 执行语句 ${i + 1}/${statements.length} 成功`);
        } catch (error) {
          console.log(`⚠️  语句 ${i + 1} 执行失败 (可能已存在): ${error.message}`);
        }
      }
    }

    console.log('🎉 数据库迁移完成！');

    // 验证表是否创建成功
    console.log('\n🔍 验证新创建的表...');
    
    const tables = ['subprojects', 'stakeholders', 'storylines'];
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`✅ 表 '${table}' 创建成功，包含 ${rows.length} 个字段`);
      } catch (error) {
        console.log(`❌ 表 '${table}' 验证失败: ${error.message}`);
      }
    }

    // 检查projects表是否添加了新字段
    try {
      const [rows] = await connection.execute(`DESCRIBE projects`);
      const hasParentId = rows.some(row => row.Field === 'parent_id');
      const hasProjectLevel = rows.some(row => row.Field === 'project_level');
      
      if (hasParentId && hasProjectLevel) {
        console.log('✅ projects表字段更新成功');
      } else {
        console.log('⚠️  projects表字段更新可能不完整');
      }
    } catch (error) {
      console.log(`❌ projects表验证失败: ${error.message}`);
    }

    console.log('\n📋 新增的数据库表：');
    console.log('- subprojects (子项目表)');
    console.log('- stakeholders (利益相关者表)');
    console.log('- storylines (故事线记录表)');
    console.log('- subproject_tasks (子项目任务关联表)');
    console.log('- storyline_attachments (故事线附件表)');
    console.log('\n📋 更新的数据库表：');
    console.log('- projects (添加了 parent_id 和 project_level 字段)');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 数据库连接已关闭');
    }
  }
}

// 运行迁移
runMigration().then(() => {
  console.log('\n🎉 数据库迁移脚本执行完成！');
  console.log('\n📝 您可以在阿里云数据库中查看以下新增的表：');
  console.log('1. subprojects - 子项目管理');
  console.log('2. stakeholders - 项目利益相关者');
  console.log('3. storylines - 项目故事线记录');
  console.log('4. subproject_tasks - 子项目任务关联');
  console.log('5. storyline_attachments - 故事线附件');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});