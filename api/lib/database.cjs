const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

// MySQL数据库配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  acquireTimeout: process.env.DB_TIMEOUT || 60000,
  charset: 'utf8mb4',
  timezone: '+08:00'
};

// 数据库连接类
class Database {
  constructor() {
    this.pool = null;
    // 当前事务连接（如果存在）
    this._txConnection = null;
  }

  // 连接数据库
  async connect() {
    try {
      this.pool = mysql.createPool(dbConfig);
      
      // 测试连接
      const connection = await this.pool.getConnection();
      console.log('✅ MySQL数据库连接成功');
      connection.release();
    } catch (err) {
      console.error('MySQL连接失败:', err.message);
      throw err;
    }
  }

  // 执行查询
  async query(sql, params = []) {
    try {
      if (!this.pool) {
        await this.connect();
      }

      // 如果存在事务连接，则在事务连接上执行
      const executor = this._txConnection || this.pool;
      const [rows, fields] = await executor.execute(sql, params);
      return [rows, fields];
    } catch (error) {
      console.error('数据库查询错误:', error);
      console.error('SQL:', sql);
      console.error('参数:', params);
      
      // 记录详细的错误信息到日志文件
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, 'database-errors.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] 数据库错误: ${error.message}\nSQL: ${sql}\n参数: ${JSON.stringify(params)}\n堆栈: ${error.stack}\n\n`;
      
      fs.appendFileSync(logFile, logEntry);
      
      throw error;
    }
  }

  // 执行预处理查询
  async execute(sql, params = []) {
    try {
      if (!this.pool) {
        await this.connect();
      }

      // 如果存在事务连接，则在事务连接上执行
      const executor = this._txConnection || this.pool;
      const [rows, fields] = await executor.execute(sql, params);
      return [rows, fields];
    } catch (error) {
      console.error('数据库执行错误:', error);
      console.error('SQL:', sql);
      console.error('参数:', params);
      
      // 记录详细的错误信息到日志文件
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, 'database-errors.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] 数据库执行错误: ${error.message}\nSQL: ${sql}\n参数: ${JSON.stringify(params)}\n堆栈: ${error.stack}\n\n`;
      
      fs.appendFileSync(logFile, logEntry);
      
      throw error;
    }
  }

  // 开始事务
  async beginTransaction() {
    try {
      if (!this.pool) {
        await this.connect();
      }
      if (this._txConnection) {
        throw new Error('已有进行中的事务');
      }
      this._txConnection = await this.pool.getConnection();
      await this._txConnection.beginTransaction();
      console.log('✅ 事务已开始');
    } catch (error) {
      console.error('开始事务失败:', error);
      throw error;
    }
  }

  // 提交事务
  async commit() {
    try {
      if (!this._txConnection) {
        throw new Error('当前无进行中的事务可提交');
      }
      await this._txConnection.commit();
      this._txConnection.release();
      this._txConnection = null;
      console.log('✅ 事务已提交');
    } catch (error) {
      console.error('提交事务失败:', error);
      throw error;
    }
  }

  // 回滚事务
  async rollback() {
    try {
      if (!this._txConnection) {
        throw new Error('当前无进行中的事务可回滚');
      }
      await this._txConnection.rollback();
      this._txConnection.release();
      this._txConnection = null;
      console.log('↩️  事务已回滚');
    } catch (error) {
      console.error('回滚事务失败:', error);
      throw error;
    }
  }

  // 测试数据库连接
  async testConnection() {
    try {
      if (!this.pool) {
        await this.connect();
      }
      const [rows] = await this.query('SELECT 1 as test');
      console.log('✅ MySQL数据库连接成功');
      return true;
    } catch (error) {
      console.error('数据库连接失败:', error);
      return false;
    }
  }

  async ensureStakeholderGlobalUniqueName() {
    try {
      const [tables] = await this.query("SHOW TABLES LIKE 'stakeholders'");
      if (!tables || tables.length === 0) {
        return;
      }

      const [columns] = await this.query("SHOW COLUMNS FROM stakeholders LIKE 'name_normalized'");
      if (!columns || columns.length === 0) {
        await this.query("ALTER TABLE stakeholders ADD COLUMN name_normalized VARCHAR(100) GENERATED ALWAYS AS (REPLACE(REPLACE(REPLACE(name, ' ', ''), ' ', ''), '　', '')) STORED");
        console.log('stakeholders.name_normalized 已创建');
      }

      const [dupRows] = await this.query(`
        SELECT name_normalized, GROUP_CONCAT(id ORDER BY id ASC) AS ids, COUNT(*) AS cnt
        FROM stakeholders
        GROUP BY name_normalized
        HAVING cnt > 1
      `);

      const toDelete = [];
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        for (const row of dupRows) {
          const ids = String(row.ids || '').split(',').map(v => parseInt(v, 10)).filter(Boolean);
          if (ids.length > 1) {
            toDelete.push(...ids.slice(1));
          }
        }
      }

      if (toDelete.length > 0) {
        const placeholders = toDelete.map(() => '?').join(',');
        await this.query(`DELETE FROM stakeholders WHERE id IN (${placeholders})`, toDelete);
        console.log(`已删除重复干系人记录: ${toDelete.join(',')}`);
      }

      const [indexes] = await this.query("SHOW INDEX FROM stakeholders WHERE Key_name = 'uniq_stakeholders_name_normalized'");
      if (!indexes || indexes.length === 0) {
        await this.query('ALTER TABLE stakeholders ADD UNIQUE INDEX uniq_stakeholders_name_normalized (name_normalized)');
        console.log('stakeholders 全局姓名唯一约束已启用');
      }
    } catch (error) {
      console.error('初始化干系人唯一约束失败:', error.message);
      throw error;
    }
  }

  // 关闭数据库连接
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('数据库连接已关闭');
      }
    } catch (error) {
      console.error('关闭数据库连接错误:', error);
    }
  }

  // 兼容旧调用名：关闭连接池
  async closePool() {
    return this.close();
  }

  // 获取数据库状态
  getStatus() {
    return {
      connected: this.pool !== null,
      config: dbConfig
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

  // 健康检查
  async healthCheck() {
    try {
      const [rows] = await this.query('SELECT 1 as test');
      return { status: 'healthy', message: '数据库连接正常' };
    } catch (error) {
      console.error('数据库健康检查失败:', error);
      return { status: 'unhealthy', message: '数据库连接失败', error: error.message };
    }
  }

  // 检查数据库连接状态
  async checkConnection() {
    try {
      if (!this.pool) {
        return { connected: false, message: '数据库连接池未初始化' };
      }
      
      const healthCheck = await this.healthCheck();
      return { 
        connected: healthCheck.status === 'healthy', 
        message: healthCheck.message,
        poolStatus: {
          totalConnections: this.pool.pool.totalConnections,
          idleConnections: this.pool.pool.idleConnections,
          queuedRequests: this.pool.pool.queuedRequests
        }
      };
    } catch (error) {
      console.error('检查数据库连接状态失败:', error);
      return { connected: false, message: error.message };
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
