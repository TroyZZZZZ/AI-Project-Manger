const express = require('express');
const router = express.Router();

// API文档首页
router.get('/', (req, res) => {
  const apiDocs = {
    title: '个人项目管理系统 API 文档',
    version: '1.0.0',
    description: '基于阿里云服务的项目管理系统后端API接口文档',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      // 用户认证相关
      authentication: {
        title: '用户认证',
        endpoints: {
          'POST /users/register': {
            description: '用户注册',
            body: {
              username: 'string (required)',
              email: 'string (required)',
              password: 'string (required, min 6 chars)'
            },
            response: {
              success: 'boolean',
              message: 'string',
              data: {
                user: 'object',
                tokens: {
                  access_token: 'string',
                  refresh_token: 'string'
                }
              }
            }
          },
          'POST /users/login': {
            description: '用户登录',
            body: {
              email: 'string (required)',
              password: 'string (required)'
            },
            response: {
              success: 'boolean',
              message: 'string',
              data: {
                user: 'object',
                tokens: {
                  access_token: 'string',
                  refresh_token: 'string'
                }
              }
            }
          },
          'POST /users/refresh': {
            description: '刷新访问令牌',
            body: {
              refresh_token: 'string (required)'
            },
            response: {
              success: 'boolean',
              data: {
                access_token: 'string',
                refresh_token: 'string'
              }
            }
          },
          'POST /users/logout': {
            description: '用户登出',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            response: {
              success: 'boolean',
              message: 'string'
            }
          }
        }
      },
      
      // 用户管理
      users: {
        title: '用户管理',
        endpoints: {
          'GET /users/profile': {
            description: '获取当前用户信息',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            response: {
              success: 'boolean',
              data: {
                user: 'object'
              }
            }
          },
          'PUT /users/profile': {
            description: '更新用户信息',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            body: {
              username: 'string (optional)',
              email: 'string (optional)',
              avatar_url: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                user: 'object'
              }
            }
          },
          'PUT /users/password': {
            description: '修改密码',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            body: {
              current_password: 'string (required)',
              new_password: 'string (required, min 6 chars)'
            },
            response: {
              success: 'boolean',
              message: 'string'
            }
          }
        }
      },
      
      // 项目管理
      projects: {
        title: '项目管理',
        endpoints: {
          'GET /projects': {
            description: '获取项目列表',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            query: {
              page: 'number (default: 1)',
              limit: 'number (default: 10)',
              status: 'string (optional)',
              search: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                projects: 'array',
                total: 'number'
              }
            }
          },
          'POST /projects': {
            description: '创建项目',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            body: {
              name: 'string (required)',
              description: 'string (optional)',
              status: 'string (default: active)',
              start_date: 'date (optional)',
              end_date: 'date (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                project: 'object'
              }
            }
          },
          'GET /projects/:id': {
            description: '获取项目详情',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            params: {
              id: 'number (required)'
            },
            response: {
              success: 'boolean',
              data: {
                project: 'object'
              }
            }
          },
          'PUT /projects/:id': {
            description: '更新项目',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            params: {
              id: 'number (required)'
            },
            body: {
              name: 'string (optional)',
              description: 'string (optional)',
              status: 'string (optional)',
              start_date: 'date (optional)',
              end_date: 'date (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                project: 'object'
              }
            }
          },
          'DELETE /projects/:id': {
            description: '删除项目',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            params: {
              id: 'number (required)'
            },
            response: {
              success: 'boolean',
              message: 'string'
            }
          }
        }
      },
      
      // 任务管理
      tasks: {
        title: '任务管理',
        endpoints: {
          'GET /tasks': {
            description: '获取任务列表',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            query: {
              page: 'number (default: 1)',
              limit: 'number (default: 10)',
              project_id: 'number (optional)',
              status: 'string (optional)',
              priority: 'string (optional)',
              assigned_to: 'number (optional)',
              search: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                tasks: 'array',
                total: 'number'
              }
            }
          },
          'POST /tasks': {
            description: '创建任务',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            body: {
              title: 'string (required)',
              description: 'string (optional)',
              project_id: 'number (required)',
              assigned_to: 'number (optional)',
              status: 'string (default: todo)',
              priority: 'string (default: medium)',
              due_date: 'date (optional)',
              estimated_hours: 'number (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                task: 'object'
              }
            }
          },
          'GET /tasks/:id': {
            description: '获取任务详情',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            params: {
              id: 'number (required)'
            },
            response: {
              success: 'boolean',
              data: {
                task: 'object'
              }
            }
          },
          'PUT /tasks/:id': {
            description: '更新任务',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            params: {
              id: 'number (required)'
            },
            body: {
              title: 'string (optional)',
              description: 'string (optional)',
              assigned_to: 'number (optional)',
              status: 'string (optional)',
              priority: 'string (optional)',
              due_date: 'date (optional)',
              estimated_hours: 'number (optional)',
              actual_hours: 'number (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                task: 'object'
              }
            }
          },
          'DELETE /tasks/:id': {
            description: '删除任务',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            params: {
              id: 'number (required)'
            },
            response: {
              success: 'boolean',
              message: 'string'
            }
          }
        }
      },
      
      // 文件上传
      upload: {
        title: '文件上传',
        endpoints: {
          'POST /upload/file': {
            description: '上传单个文件',
            headers: {
              Authorization: 'Bearer <access_token>',
              'Content-Type': 'multipart/form-data'
            },
            body: {
              file: 'file (required)',
              project_id: 'number (optional)',
              task_id: 'number (optional)',
              description: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                file: {
                  id: 'number',
                  filename: 'string',
                  original_name: 'string',
                  file_size: 'number',
                  file_type: 'string',
                  file_url: 'string'
                }
              }
            }
          },
          'POST /upload/multiple': {
            description: '上传多个文件',
            headers: {
              Authorization: 'Bearer <access_token>',
              'Content-Type': 'multipart/form-data'
            },
            body: {
              files: 'file[] (required)',
              project_id: 'number (optional)',
              task_id: 'number (optional)',
              description: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                files: 'array',
                uploaded_count: 'number',
                failed_count: 'number'
              }
            }
          },
          'GET /upload/files': {
            description: '获取文件列表',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            query: {
              page: 'number (default: 1)',
              limit: 'number (default: 10)',
              project_id: 'number (optional)',
              task_id: 'number (optional)',
              file_type: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                files: 'array',
                total: 'number'
              }
            }
          },
          'DELETE /upload/files/:id': {
            description: '删除文件',
            headers: {
              Authorization: 'Bearer <access_token>'
            },
            params: {
              id: 'number (required)'
            },
            response: {
              success: 'boolean',
              message: 'string'
            }
          }
        }
      }
    },
    
    // 状态码说明
    statusCodes: {
      200: 'OK - 请求成功',
      201: 'Created - 资源创建成功',
      400: 'Bad Request - 请求参数错误',
      401: 'Unauthorized - 未授权或token无效',
      403: 'Forbidden - 权限不足',
      404: 'Not Found - 资源不存在',
      409: 'Conflict - 资源冲突',
      422: 'Unprocessable Entity - 数据验证失败',
      429: 'Too Many Requests - 请求过于频繁',
      500: 'Internal Server Error - 服务器内部错误'
    },
    
    // 通用响应格式
    responseFormat: {
      success: {
        success: true,
        message: 'string (optional)',
        data: 'object | array'
      },
      error: {
        success: false,
        message: 'string',
        error: 'string (optional)',
        details: 'object (optional)'
      }
    },
    
    // 认证说明
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <access_token>',
      tokenExpiry: {
        access_token: '15 minutes',
        refresh_token: '7 days'
      },
      note: '大部分API需要在请求头中包含有效的访问令牌'
    }
  };
  
  res.json(apiDocs);
});

// 获取API状态
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      api_version: '1.0.0',
      server_time: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version
    }
  });
});

module.exports = router;