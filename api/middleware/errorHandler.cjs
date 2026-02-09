const fs = require('fs');
const path = require('path');

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('全局错误处理:', err);

  // 记录错误到日志文件
  const logDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, 'global-errors.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] 全局错误 - 路径: ${req.path}, 方法: ${req.method}, 用户ID: ${req.user?.id || 'N/A'}, 错误: ${err.message}\n堆栈: ${err.stack}\n\n`;

  fs.appendFileSync(logFile, logEntry);

  // 数据库连接错误
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      message: '数据库连接失败，请稍后重试'
    });
  }

  // MySQL错误
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      success: false,
      message: '数据库操作失败'
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '访问令牌已过期'
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // 默认错误响应
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
};

// 404错误处理
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `路径 ${req.path} 不存在`
  });
};

// 数据库连接状态检查中间件
const checkDatabaseConnection = async (req, res, next) => {
  try {
    const { Database } = require('../lib/database.cjs');
    const db = Database.getInstance();
    
    const connectionStatus = await db.checkConnection();
    
    if (!connectionStatus.connected) {
      return res.status(503).json({
        success: false,
        message: '数据库连接不可用',
        details: connectionStatus.message
      });
    }
    
    next();
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    res.status(503).json({
      success: false,
      message: '数据库连接检查失败'
    });
  }
};

module.exports = {
  errorHandler,
  notFoundHandler,
  checkDatabaseConnection
};