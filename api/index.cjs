#!/usr/bin/env node

/**
 * 项目管理系统后端服务入口文件
 * 基于Express.js和阿里云服务
 */

require('dotenv').config();
const app = require('./app.cjs');
const { db } = require('./lib/database.cjs');

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    console.log('🔍 正在测试数据库连接...');
    await db.testConnection();
    console.log('✅ 数据库连接成功');
    
    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      console.log('🚀 项目管理系统后端服务已启动');
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🌍 运行环境: ${NODE_ENV}`);
      console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
      
      if (NODE_ENV === 'development') {
        console.log('\n📋 可用的API端点:');
        console.log('  - GET  /health          - 健康检查');
        console.log('  - POST /api/users/register - 用户注册');
        console.log('  - POST /api/users/login    - 用户登录');
        console.log('  - GET  /api/projects       - 获取项目列表');
        console.log('  - GET  /api/tasks          - 获取任务列表');
        console.log('  - POST /api/upload         - 文件上传');
        console.log('  - GET  /api/docs           - API文档');
        console.log('\n🔧 前端开发服务器: http://localhost:5173');
      }
    });
    
    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
      console.log(`\n📡 收到 ${signal} 信号，开始优雅关闭...`);
      
      // 停止接受新连接
      server.close(async () => {
        console.log('🔌 HTTP服务器已关闭');
        
        try {
          // 关闭数据库连接池
          await db.closePool();
          console.log('🗄️  数据库连接池已关闭');
          
          console.log('✅ 服务器已优雅关闭');
          process.exit(0);
        } catch (error) {
          console.error('❌ 关闭数据库连接时出错:', error);
          process.exit(1);
        }
      });
      
      // 强制关闭超时
      setTimeout(() => {
        console.error('⚠️  强制关闭服务器（超时）');
        process.exit(1);
      }, 10000);
    };
    
    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('❌ 未捕获的异常:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ 未处理的Promise拒绝:', reason);
      console.error('Promise:', promise);
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 可能的解决方案:');
      console.error('  1. 检查数据库服务是否正在运行');
      console.error('  2. 验证数据库连接配置是否正确');
      console.error('  3. 确认网络连接是否正常');
    } else if (error.code === 'EADDRINUSE') {
      console.error(`\n💡 端口 ${PORT} 已被占用，请尝试:`);
      console.error('  1. 更改 PORT 环境变量');
      console.error('  2. 或停止占用该端口的其他服务');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 数据库访问被拒绝:');
      console.error('  1. 检查数据库用户名和密码');
      console.error('  2. 确认数据库用户有足够的权限');
      console.error('  3. 验证数据库主机地址是否正确');
    }
    
    process.exit(1);
  }
};

// 启动应用
startServer();

// 导出app供测试使用
module.exports = app;