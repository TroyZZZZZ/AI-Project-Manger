const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite数据库配置
class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'data', 'project_management.db');
  }

  // 连接数据库
  async connect() {
    return new Promise((resolve, reject) => {
      // 确保data目录存在
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('SQLite连接失败:', err.message);
          reject(err);
        } else {
          console.log('✅ SQLite数据库连接成功');
          // 启用外键约束
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  // 执行查询
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未连接'));
        return;
      }

      // 转换MySQL语法到SQLite
      let sqliteSql = this.convertMySQLToSQLite(sql);
      
      // 根据SQL类型选择执行方法
      if (sqliteSql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sqliteSql, params, (err, rows) => {
          if (err) {
            console.error('查询错误:', err.message);
            console.error('SQL:', sqliteSql);
            console.error('参数:', params);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else if (sqliteSql.trim().toUpperCase().startsWith('INSERT')) {
        this.db.run(sqliteSql, params, function(err) {
          if (err) {
            console.error('插入错误:', err.message);
            console.error('SQL:', sqliteSql);
            console.error('参数:', params);
            reject(err);
          } else {
            resolve({ insertId: this.lastID, affectedRows: this.changes });
          }
        });
      } else {
        this.db.run(sqliteSql, params, function(err) {
          if (err) {
            console.error('执行错误:', err.message);
            console.error('SQL:', sqliteSql);
            console.error('参数:', params);
            reject(err);
          } else {
            resolve({ affectedRows: this.changes });
          }
        });
      }
    });
  }

  // 转换MySQL语法到SQLite
  convertMySQLToSQLite(sql) {
    let converted = sql;
    
    // 替换AUTO_INCREMENT
    converted = converted.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
    
    // 替换数据类型
    converted = converted.replace(/BIGINT\(\d+\)/gi, 'INTEGER');
    converted = converted.replace(/INT\(\d+\)/gi, 'INTEGER');
    converted = converted.replace(/VARCHAR\((\d+)\)/gi, 'TEXT');
    converted = converted.replace(/TEXT\(\d+\)/gi, 'TEXT');
    converted = converted.replace(/LONGTEXT/gi, 'TEXT');
    converted = converted.replace(/DATETIME/gi, 'DATETIME');
    converted = converted.replace(/TIMESTAMP/gi, 'DATETIME');
    
    // 替换ENGINE和CHARSET
    converted = converted.replace(/ENGINE=\w+/gi, '');
    converted = converted.replace(/DEFAULT CHARSET=\w+/gi, '');
    converted = converted.replace(/COLLATE=\w+/gi, '');
    
    // 替换ON UPDATE CURRENT_TIMESTAMP
    converted = converted.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');
    
    // 替换DEFAULT CURRENT_TIMESTAMP
    converted = converted.replace(/DEFAULT CURRENT_TIMESTAMP/gi, "DEFAULT (datetime('now'))");
    
    // 清理多余的逗号和空格
    converted = converted.replace(/,\s*\)/g, ')');
    converted = converted.replace(/\s+/g, ' ');
    
    return converted.trim();
  }

  // 开始事务
  async beginTransaction() {
    return this.query('BEGIN TRANSACTION');
  }

  // 提交事务
  async commit() {
    return this.query('COMMIT');
  }

  // 回滚事务
  async rollback() {
    return this.query('ROLLBACK');
  }

  // 关闭连接
  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('关闭数据库连接失败:', err.message);
          } else {
            console.log('✅ 数据库连接已关闭');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // 测试连接
  async testConnection() {
    try {
      const result = await this.query('SELECT 1 as test');
      return result.length > 0;
    } catch (error) {
      console.error('数据库连接测试失败:', error.message);
      return false;
    }
  }
}

// 创建数据库实例
const db = new Database();

module.exports = db;