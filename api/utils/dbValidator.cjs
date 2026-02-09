const { db } = require('../lib/database.cjs');

/**
 * 数据库字段验证工具
 * 用于防止SQL查询中使用不存在的字段名
 */
class DatabaseValidator {
  constructor() {
    this.tableSchemas = new Map();
    this.initialized = false;
  }

  /**
   * 初始化数据库表结构缓存
   */
  async initialize() {
    try {
      // 获取数据库中实际存在的表
      const [tableRows] = await db.query('SHOW TABLES');
      const existingTables = tableRows.map(row => Object.values(row)[0]);
      
      // 只验证我们关心的且实际存在的表
      const tablesToValidate = ['users', 'projects', 'tasks', 'project_members', 'files', 'notifications'];
      const tables = tablesToValidate.filter(table => existingTables.includes(table));
      
      for (const tableName of tables) {
        const [columns] = await db.query(`DESCRIBE ${tableName}`);
        const columnNames = columns.map(col => col.Field);
        this.tableSchemas.set(tableName, columnNames);
        console.log(`已缓存表 ${tableName} 的字段:`, columnNames);
      }
      
      this.initialized = true;
      console.log('数据库字段验证器初始化完成');
    } catch (error) {
      console.error('数据库字段验证器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证表中是否存在指定字段
   * @param {string} tableName - 表名
   * @param {string} columnName - 字段名
   * @returns {boolean} - 字段是否存在
   */
  validateColumn(tableName, columnName) {
    if (!this.initialized) {
      console.warn('数据库字段验证器未初始化，跳过验证');
      return true;
    }

    const columns = this.tableSchemas.get(tableName);
    if (!columns) {
      console.warn(`未找到表 ${tableName} 的字段信息`);
      return true;
    }

    const exists = columns.includes(columnName);
    if (!exists) {
      console.error(`字段验证失败: 表 ${tableName} 中不存在字段 ${columnName}`);
      console.error(`可用字段: ${columns.join(', ')}`);
    }

    return exists;
  }

  /**
   * 验证SQL查询中的字段名
   * @param {string} tableName - 主表名
   * @param {string} sql - SQL查询语句
   * @returns {boolean} - 验证是否通过
   */
  validateSqlColumns(tableName, sql) {
    if (!this.initialized) {
      return true;
    }

    // 简单的字段名提取（可以根据需要扩展）
    const columnPattern = /\b(\w+)\.(\w+)\b/g;
    let match;
    let isValid = true;

    while ((match = columnPattern.exec(sql)) !== null) {
      const [, tableAlias, columnName] = match;
      
      // 根据表别名映射到实际表名
      let actualTableName = tableName;
      if (tableAlias === 'p' && tableName === 'projects') {
        actualTableName = 'projects';
      } else if (tableAlias === 'u' && tableName === 'projects') {
        actualTableName = 'users';
      } else if (tableAlias === 't' && tableName === 'projects') {
        actualTableName = 'tasks';
      }

      if (!this.validateColumn(actualTableName, columnName)) {
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * 获取表的所有字段
   * @param {string} tableName - 表名
   * @returns {string[]} - 字段名数组
   */
  getTableColumns(tableName) {
    return this.tableSchemas.get(tableName) || [];
  }

  /**
   * 刷新表结构缓存
   */
  async refreshSchema() {
    this.tableSchemas.clear();
    this.initialized = false;
    await this.initialize();
  }
}

// 创建全局实例
const dbValidator = new DatabaseValidator();

module.exports = {
  DatabaseValidator,
  dbValidator
};