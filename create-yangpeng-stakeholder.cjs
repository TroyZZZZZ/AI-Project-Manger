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

async function createYangpengStakeholder() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ MySQL数据库连接成功');

    // 检查项目4是否存在
    const [projects] = await connection.execute(
      'SELECT id, name FROM projects WHERE id = ?',
      [4]
    );

    if (projects.length === 0) {
      console.log('❌ 项目4不存在');
      return;
    }

    console.log(`✅ 项目存在: ${projects[0].name}`);

    // 检查是否已经存在杨鹏
    const [existingStakeholders] = await connection.execute(
      'SELECT * FROM stakeholders WHERE project_id = ? AND name = ?',
      [4, '杨鹏']
    );

    if (existingStakeholders.length > 0) {
      console.log('✅ 杨鹏已存在:', existingStakeholders[0]);
      return;
    }

    // 创建杨鹏干系人
    const stakeholderData = {
      project_id: 4,
      name: '杨鹏',
      role: 'developer',
      company: '技术公司',
      identity_type: 'internal',
      contact_info: 'yangpeng@example.com',
      influence_level: 'high',
      interest_level: 'high',
      communication_preference: 'email',
      notes: '项目核心开发人员'
    };

    const [result] = await connection.execute(
      `INSERT INTO stakeholders (
        project_id, name, role, company, identity_type, 
        contact_info, influence_level, interest_level, 
        communication_preference, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        stakeholderData.project_id,
        stakeholderData.name,
        stakeholderData.role,
        stakeholderData.company,
        stakeholderData.identity_type,
        stakeholderData.contact_info,
        stakeholderData.influence_level,
        stakeholderData.interest_level,
        stakeholderData.communication_preference,
        stakeholderData.notes
      ]
    );

    console.log('✅ 成功创建杨鹏干系人，ID:', result.insertId);

    // 验证创建结果
    const [newStakeholder] = await connection.execute(
      'SELECT * FROM stakeholders WHERE id = ?',
      [result.insertId]
    );

    console.log('✅ 创建的干系人信息:', newStakeholder[0]);

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createYangpengStakeholder();