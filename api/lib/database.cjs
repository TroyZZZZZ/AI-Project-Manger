const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_management',
  charset: 'utf8mb4',
  timezone: '+08:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 数据库连接类
class Database {
  constructor() {
    this.pool = pool;
  }

  // 执行查询
  async query(sql, params = []) {
    try {
      const connection = await this.pool.getConnection();
      try {
        const [rows, fields] = await connection.execute(sql, params);
        return [rows, fields];
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('数据库查询错误:', error);
      console.error('SQL:', sql);
      console.error('参数:', params);
      throw error;
    }
  }

  // 开始事务
  async beginTransaction() {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  // 提交事务
  async commit(connection) {
    try {
      await connection.commit();
    } finally {
      connection.release();
    }
  }

  // 回滚事务
  async rollback(connection) {
    try {
      await connection.rollback();
    } finally {
      connection.release();
    }
  }

  // 执行事务查询
  async transactionQuery(connection, sql, params = []) {
    try {
      const [rows, fields] = await connection.execute(sql, params);
      return [rows, fields];
    } catch (error) {
      console.error('事务查询错误:', error);
      console.error('SQL:', sql);
      console.error('参数:', params);
      throw error;
    }
  }

  // 测试数据库连接
  async testConnection() {
    try {
      const [rows] = await this.query('SELECT 1 as test');
      console.log('数据库连接成功');
      return true;
    } catch (error) {
      console.error('数据库连接失败:', error);
      return false;
    }
  }

  // 关闭连接池
  async close() {
    try {
      await this.pool.end();
      console.log('数据库连接池已关闭');
    } catch (error) {
      console.error('关闭数据库连接池错误:', error);
    }
  }

  // 获取连接池状态
  getPoolStatus() {
    return {
      totalConnections: this.pool.pool._allConnections.length,
      freeConnections: this.pool.pool._freeConnections.length,
      acquiringConnections: this.pool.pool._acquiringConnections.length,
      queuedRequests: this.pool.pool._connectionQueue.length
    };
  }

  // 执行批量插入
  async batchInsert(tableName, columns, values) {
    try {
      if (!values || values.length === 0) {
        return { success: true, affectedRows: 0 };
      }

      const placeholders = columns.map(() => '?').join(', ');
      const valuesPlaceholder = `(${placeholders})`;
      const allValuesPlaceholder = values.map(() => valuesPlaceholder).join(', ');
      
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${allValuesPlaceholder}`;
      const flatValues = values.flat();
      
      const [result] = await this.query(sql, flatValues);
      
      return {
        success: true,
        affectedRows: result.affectedRows,
        insertId: result.insertId
      };
    } catch (error) {
      console.error('批量插入错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 执行批量更新
  async batchUpdate(tableName, updates, whereCondition, whereParams = []) {
    try {
      if (!updates || Object.keys(updates).length === 0) {
        return { success: true, affectedRows: 0 };
      }

      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereCondition}`;
      const params = [...Object.values(updates), ...whereParams];
      
      const [result] = await this.query(sql, params);
      
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('批量更新错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 分页查询
  async paginate(sql, params = [], page = 1, limit = 10) {
    try {
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      // 构建分页SQL
      const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
      const paginatedParams = [...params, limit, offset];
      
      // 执行分页查询
      const [rows] = await this.query(paginatedSql, paginatedParams);
      
      // 获取总数（从原始SQL中提取）
      const countSql = sql.replace(/SELECT.*?FROM/i, 'SELECT COUNT(*) as total FROM')
                          .replace(/ORDER BY.*$/i, '')
                          .replace(/LIMIT.*$/i, '');
      
      const [countRows] = await this.query(countSql, params);
      const total = countRows[0].total;
      
      return {
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('分页查询错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 创建数据库实例
const db = new Database();

// 导出数据库实例
module.exports = { db, Database };

// 进程退出时关闭连接池
process.on('SIGINT', async () => {
  console.log('正在关闭数据库连接...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('正在关闭数据库连接...');
  await db.close();
  process.exit(0);
});