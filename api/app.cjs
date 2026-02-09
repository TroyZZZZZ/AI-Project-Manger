const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { db } = require('./lib/database.cjs');

// 导入路由
const projectsRouter = require('./routes/projects.cjs');
const tasksRouter = require('./routes/tasks.cjs');
const uploadRouter = require('./routes/upload.cjs');
const storiesRouter = require('./routes/stories.cjs');
const storyFollowUpRouter = require('./routes/storyFollowUp.cjs');
const efficiencyRouter = require('./routes/efficiency.cjs');

const app = express();
const PORT = process.env.PORT || 3001;
const SKIP_DB_ON_START = process.env.SKIP_DB_ON_START === 'true';

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

// 登录接口特殊限制已移除 - 允许无限制登录

app.use('/api/', limiter);

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
    // 检查数据库连接（开发模式可跳过）
    if (!SKIP_DB_ON_START) {
      await db.testConnection();
    }
    
    res.json({
      success: true,
      message: '服务运行正常',
      db_check_skipped: SKIP_DB_ON_START,
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
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/upload', uploadRouter);
app.use('/api', storyFollowUpRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/efficiency', efficiencyRouter);

// 新增路由
const subprojectsRouter = require('./routes/subprojects.cjs');
const storylinesRouter = require('./routes/storylines.cjs');
const stakeholdersRouter = require('./routes/stakeholders.cjs');
const stakeholdersGlobalRouter = require('./routes/stakeholdersGlobal.cjs');
const identityTypesRouter = require('./routes/identityTypes.cjs');
const storylineFollowUpRouter = require('./routes/storylineFollowUp.cjs');

app.use('/api/projects', subprojectsRouter);
app.use('/api/projects', storylinesRouter);
app.use('/api/projects', storylineFollowUpRouter);
app.use('/api/projects', stakeholdersRouter);
app.use('/api', stakeholdersGlobalRouter);
app.use('/api', identityTypesRouter);

// 错误处理中间件
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.cjs');

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

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
      projects: {
        'GET /api/projects': '获取项目列表',
        'POST /api/projects': '创建项目',
        'GET /api/projects/:id': '获取项目详情',
        'PUT /api/projects/:id': '更新项目',
        'DELETE /api/projects/:id': '删除项目',
        'GET /api/projects/:id/stats': '获取项目统计'
      },
      tasks: {
        'GET /api/tasks': '获取任务列表',
        'POST /api/tasks': '创建任务',
        'GET /api/tasks/:id': '获取任务详情',
        'PUT /api/tasks/:id': '更新任务',
        'DELETE /api/tasks/:id': '删除任务',
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

// 全局错误处理中间件已在上面导入和使用

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

// 启动服务器（仅当直接运行 app.cjs 时）
if (require.main === module) {
  (async () => {
    try {
      if (!SKIP_DB_ON_START) {
        await db.testConnection();
        console.log('数据库连接成功');
        await db.ensureStakeholderGlobalUniqueName();
      } else {
        console.log('跳过数据库连接测试（开发模式）');
      }
      app.listen(PORT, () => {
        console.log(`服务器运行在端口 ${PORT}`);
        console.log(`健康检查: http://localhost:${PORT}/health`);
        console.log(`API文档: http://localhost:${PORT}/api/docs`);
      });
    } catch (error) {
      console.error('服务器启动失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = app;
