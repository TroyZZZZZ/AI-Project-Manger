const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { db } = require('./lib/database.cjs');
const { AuthService } = require('./services/authService.cjs');

// 导入路由
const authRouter = require('./routes/auth.cjs');
const usersRouter = require('./routes/users.cjs');
const projectsRouter = require('./routes/projects.cjs');
const tasksRouter = require('./routes/tasks.cjs');
const uploadRouter = require('./routes/upload.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// CORS配置
app.use(cors({
  origin: function (origin, callback) {
    // 允许的域名列表
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    // 开发环境允许所有来源
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // 生产环境检查来源
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允许的CORS来源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 压缩中间件
app.use(compression());

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每个IP 15分钟内最多1000个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 登录接口特殊限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次登录尝试
  message: {
    success: false,
    message: '登录尝试过于频繁，请15分钟后再试'
  },
  skipSuccessfulRequests: true
});

app.use('/api/', limiter);
app.use('/api/users/login', loginLimiter);

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, data);
  };
  
  next();
});

// 健康检查接口
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await db.testConnection();
    
    res.json({
      success: true,
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '服务异常',
      error: error.message
    });
  }
});

// API路由
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/upload', uploadRouter);

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '项目管理系统 API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// API文档路由（简单版本）
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API文档',
    endpoints: {
      users: {
        'POST /api/users/register': '用户注册',
        'POST /api/users/login': '用户登录',
        'POST /api/users/logout': '用户登出',
        'POST /api/users/refresh-token': '刷新token',
        'GET /api/users/me': '获取当前用户信息',
        'PUT /api/users/me': '更新当前用户信息',
        'PUT /api/users/me/password': '修改密码',
        'POST /api/users/forgot-password': '请求密码重置',
        'POST /api/users/reset-password': '重置密码',
        'GET /api/users': '获取用户列表（管理员）',
        'GET /api/users/:id': '获取指定用户信息（管理员）',
        'PUT /api/users/:id': '更新用户信息（管理员）',
        'PUT /api/users/:id/status': '更新用户状态（管理员）',
        'PUT /api/users/:id/role': '更新用户角色（管理员）'
      },
      projects: {
        'GET /api/projects': '获取项目列表',
        'POST /api/projects': '创建项目',
        'GET /api/projects/:id': '获取项目详情',
        'PUT /api/projects/:id': '更新项目',
        'DELETE /api/projects/:id': '删除项目',
        'GET /api/projects/:id/members': '获取项目成员',
        'POST /api/projects/:id/members': '添加项目成员',
        'PUT /api/projects/:id/members/:userId': '更新成员角色',
        'DELETE /api/projects/:id/members/:userId': '移除项目成员',
        'GET /api/projects/:id/stats': '获取项目统计'
      },
      tasks: {
        'GET /api/tasks': '获取任务列表',
        'POST /api/tasks': '创建任务',
        'GET /api/tasks/:id': '获取任务详情',
        'PUT /api/tasks/:id': '更新任务',
        'DELETE /api/tasks/:id': '删除任务',
        'PUT /api/tasks/:id/status': '更新任务状态',
        'PUT /api/tasks/:id/hours': '更新任务工时',
        'GET /api/tasks/:id/comments': '获取任务评论',
        'POST /api/tasks/:id/comments': '添加任务评论',
        'GET /api/tasks/:id/history': '获取任务历史',
        'POST /api/tasks/batch-update': '批量更新任务'
      },
      upload: {
        'POST /api/upload/single': '单文件上传',
        'POST /api/upload/multiple': '多文件上传',
        'GET /api/upload/files': '获取文件列表',
        'DELETE /api/upload/files/:id': '删除文件',
        'GET /api/upload/download/:id': '下载文件',
        'POST /api/upload/avatar': '上传头像'
      }
    }
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  console.error('全局错误:', error);
  
  // CORS错误
  if (error.message === '不允许的CORS来源') {
    return res.status(403).json({
      success: false,
      message: '跨域请求被拒绝'
    });
  }
  
  // JSON解析错误
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: '请求数据格式错误'
    });
  }
  
  // 数据库错误
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: '数据已存在'
    });
  }
  
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: '关联数据不存在'
    });
  }
  
  // 默认错误响应
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 优雅关闭处理
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，开始优雅关闭...');
  
  try {
    // 关闭数据库连接
    await db.closePool();
    console.log('数据库连接已关闭');
    
    process.exit(0);
  } catch (error) {
    console.error('优雅关闭失败:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，开始优雅关闭...');
  
  try {
    // 关闭数据库连接
    await db.closePool();
    console.log('数据库连接已关闭');
    
    process.exit(0);
  } catch (error) {
    console.error('优雅关闭失败:', error);
    process.exit(1);
  }
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    await db.testConnection();
    console.log('数据库连接成功');
    
    // 清理过期token（启动时执行一次）
    await AuthService.cleanupExpiredTokens();
    console.log('过期token清理完成');
    
    // 启动定时任务清理过期token（每小时执行一次）
    setInterval(async () => {
      try {
        await AuthService.cleanupExpiredTokens();
        console.log('定时清理过期token完成');
      } catch (error) {
        console.error('定时清理过期token失败:', error);
      }
    }, 60 * 60 * 1000); // 1小时
    
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
      console.log(`API文档: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动应用
startServer();

module.exports = app;