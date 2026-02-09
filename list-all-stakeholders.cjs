require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_management',
  port: process.env.DB_PORT || 3306,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

async function listAllStakeholders() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ MySQL数据库连接成功');

    // 获取项目4的所有干系人
    const [stakeholders] = await connection.execute(
      'SELECT * FROM stakeholders WHERE project_id = ? ORDER BY created_at DESC',
      [4]
    );

    console.log(`\n项目4的干系人列表 (共${stakeholders.length}个):`);
    console.log('='.repeat(50));
    
    stakeholders.forEach((stakeholder, index) => {
      console.log(`${index + 1}. ${stakeholder.name}`);
      console.log(`   角色: ${stakeholder.role}`);
      console.log(`   公司: ${stakeholder.company}`);
      console.log(`   类型: ${stakeholder.identity_type}`);
      console.log(`   ID: ${stakeholder.id}`);
      console.log(`   创建时间: ${stakeholder.created_at}`);
      console.log('');
    });

    // 特别检查杨鹏
    const yangpeng = stakeholders.find(s => s.name === '杨鹏');
    if (yangpeng) {
      console.log('✅ 找到杨鹏:');
      console.log(JSON.stringify(yangpeng, null, 2));
    } else {
      console.log('❌ 未找到杨鹏');
    }

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

listAllStakeholders();