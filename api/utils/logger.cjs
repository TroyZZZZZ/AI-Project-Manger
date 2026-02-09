const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
  }

  // 格式化日志消息
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    
    return JSON.stringify(logEntry);
  }

  // 写入日志文件
  writeToFile(level, message) {
    const filename = `${new Date().toISOString().split('T')[0]}.log`;
    const filepath = path.join(logDir, filename);
    
    fs.appendFileSync(filepath, message + '\n');
  }

  // 检查是否应该记录该级别的日志
  shouldLog(level) {
    const currentLevel = LOG_LEVELS[this.logLevel] || LOG_LEVELS.INFO;
    const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    
    return messageLevel <= currentLevel;
  }

  // 错误日志
  error(message, meta = {}) {
    if (!this.shouldLog('ERROR')) return;
    
    const formattedMessage = this.formatMessage('ERROR', message, meta);
    console.error(formattedMessage);
    this.writeToFile('ERROR', formattedMessage);
  }

  // 警告日志
  warn(message, meta = {}) {
    if (!this.shouldLog('WARN')) return;
    
    const formattedMessage = this.formatMessage('WARN', message, meta);
    console.warn(formattedMessage);
    this.writeToFile('WARN', formattedMessage);
  }

  // 信息日志
  info(message, meta = {}) {
    if (!this.shouldLog('INFO')) return;
    
    const formattedMessage = this.formatMessage('INFO', message, meta);
    console.log(formattedMessage);
    this.writeToFile('INFO', formattedMessage);
  }

  // 调试日志
  debug(message, meta = {}) {
    if (!this.shouldLog('DEBUG')) return;
    
    const formattedMessage = this.formatMessage('DEBUG', message, meta);
    console.log(formattedMessage);
    this.writeToFile('DEBUG', formattedMessage);
  }

  // API请求日志
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || null
    };

    if (res.statusCode >= 400) {
      this.error('API请求失败', logData);
    } else {
      this.info('API请求', logData);
    }
  }

  // 数据库操作日志
  logDatabase(operation, table, data = {}) {
    this.debug('数据库操作', {
      operation,
      table,
      ...data
    });
  }

  // 清理旧日志文件（保留30天）
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(logDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      files.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          this.info(`已删除旧日志文件: ${file}`);
        }
      });
    } catch (error) {
      this.error('清理旧日志文件失败', { error: error.message });
    }
  }
}

// 创建全局日志实例
const logger = new Logger();

// 定时清理旧日志（每天执行一次）
setInterval(() => {
  logger.cleanOldLogs();
}, 24 * 60 * 60 * 1000);

module.exports = logger;