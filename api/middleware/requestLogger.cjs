const logger = require('../utils/logger.cjs');

// 请求日志中间件
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求开始
  logger.info('API请求开始', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });

  // 监听响应结束事件
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });

  next();
};

module.exports = requestLogger;