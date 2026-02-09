const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

// API文档首页
router.get('/', (req, res) => {
  const apiDocs = {
    title: '个人项目管理系统 API 文档',
    version: '1.0.0',
    description: '基于阿里云服务的项目管理系统后端API接口文档',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      // 项目管理相关
      projects: {
        title: '项目管理',
        endpoints: {
          'GET /projects': {
            description: '获取项目列表',
            query: {
              page: 'number (optional, default: 1)',
              limit: 'number (optional, default: 10)',
              status: 'string (optional)',
              search: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: {
                projects: 'array',
                pagination: 'object'
              }
            }
          },
          'POST /projects': {
            description: '创建新项目',
            body: {
              name: 'string (required)',
              description: 'string (optional)',
              start_date: 'date (optional)',
              end_date: 'date (optional)',
              status: 'string (optional, default: active)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          },
          'GET /projects/:id': {
            description: '获取项目详情',
            params: {
              id: 'number (required)'
            },
            response: {
              success: 'boolean',
              data: 'object'
            }
          },
          'PUT /projects/:id': {
            description: '更新项目',
            params: {
              id: 'number (required)'
            },
            body: {
              name: 'string (optional)',
              description: 'string (optional)',
              start_date: 'date (optional)',
              end_date: 'date (optional)',
              status: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          },
          'DELETE /projects/:id': {
            description: '删除项目',
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
      
      // 任务管理相关
      tasks: {
        title: '任务管理',
        endpoints: {
          'GET /tasks': {
            description: '获取任务列表',
            query: {
              project_id: 'number (optional)',
              status: 'string (optional)',
              priority: 'string (optional)',
              page: 'number (optional, default: 1)',
              limit: 'number (optional, default: 10)'
            },
            response: {
              success: 'boolean',
              data: {
                tasks: 'array',
                pagination: 'object'
              }
            }
          },
          'POST /tasks': {
            description: '创建新任务',
            body: {
              title: 'string (required)',
              description: 'string (optional)',
              project_id: 'number (required)',
              priority: 'string (optional, default: medium)',
              status: 'string (optional, default: pending)',
              due_date: 'date (optional)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          },
          'GET /tasks/:id': {
            description: '获取任务详情',
            params: {
              id: 'number (required)'
            },
            response: {
              success: 'boolean',
              data: 'object'
            }
          },
          'PUT /tasks/:id': {
            description: '更新任务',
            params: {
              id: 'number (required)'
            },
            body: {
              title: 'string (optional)',
              description: 'string (optional)',
              priority: 'string (optional)',
              status: 'string (optional)',
              due_date: 'date (optional)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          },
          'DELETE /tasks/:id': {
            description: '删除任务',
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

      // 利益相关者管理
      stakeholders: {
        title: '利益相关者管理',
        endpoints: {
          'GET /:projectId/stakeholders': {
            description: '获取项目利益相关者列表',
            params: {
              projectId: 'number (required)'
            },
            response: {
              success: 'boolean',
              data: 'array'
            }
          },
          'POST /:projectId/stakeholders': {
            description: '添加利益相关者',
            params: {
              projectId: 'number (required)'
            },
            body: {
              name: 'string (required)',
              role: 'string (required)',
              contact_info: 'string (optional)',
              influence_level: 'string (optional)',
              interest_level: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          }
        }
      },

      // 子项目管理
      subprojects: {
        title: '子项目管理',
        endpoints: {
          'GET /:projectId/subprojects': {
            description: '获取子项目列表',
            params: {
              projectId: 'number (required)'
            },
            response: {
              success: 'boolean',
              data: 'array'
            }
          },
          'POST /:projectId/subprojects': {
            description: '创建子项目',
            params: {
              projectId: 'number (required)'
            },
            body: {
              name: 'string (required)',
              description: 'string (optional)',
              start_date: 'date (optional)',
              end_date: 'date (optional)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          }
        }
      },

      // 故事线管理
      storylines: {
        title: '故事线管理',
        endpoints: {
          'GET /:projectId/storylines': {
            description: '获取项目故事线列表',
            params: {
              projectId: 'number (required)'
            },
            query: {
              page: 'number (optional, default: 1)',
              limit: 'number (optional, default: 20)',
              sortBy: 'string (optional, default: event_time)',
              sortOrder: 'string (optional, default: DESC)'
            },
            response: {
              success: 'boolean',
              data: 'object'
            }
          },
          'POST /:projectId/storylines': {
            description: '创建故事线',
            params: {
              projectId: 'number (required)'
            },
            body: {
              title: 'string (required)',
              description: 'string (optional)',
              event_time: 'datetime (required)',
              event_type: 'string (required)',
              participants: 'array (optional)',
              location: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          }
        }
      },

      // 文件上传
      upload: {
        title: '文件上传',
        endpoints: {
          'POST /upload/single': {
            description: '单文件上传',
            body: {
              file: 'file (required)',
              project_id: 'number (optional)',
              task_id: 'number (optional)',
              category: 'string (optional, default: other)',
              description: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: 'object',
              message: 'string'
            }
          },
          'POST /upload/multiple': {
            description: '多文件上传',
            body: {
              files: 'files (required)',
              project_id: 'number (optional)',
              task_id: 'number (optional)',
              category: 'string (optional, default: other)',
              description: 'string (optional)'
            },
            response: {
              success: 'boolean',
              data: 'array',
              message: 'string'
            }
          },
          'GET /upload/files': {
            description: '获取文件列表',
            query: {
              project_id: 'number (optional)',
              task_id: 'number (optional)',
              category: 'string (optional)',
              page: 'number (optional, default: 1)',
              limit: 'number (optional, default: 20)'
            },
            response: {
              success: 'boolean',
              data: 'object'
            }
          },
          'DELETE /upload/files/:id': {
            description: '删除文件',
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
    
    // 通用响应格式
    commonResponses: {
      success: {
        success: true,
        data: 'object|array',
        message: 'string (optional)'
      },
      error: {
        success: false,
        message: 'string',
        error: 'string (optional)'
      },
      validation: {
        success: false,
        message: 'string',
        errors: 'array'
      }
    },
    
    // 状态码说明
    statusCodes: {
      200: 'OK - 请求成功',
      201: 'Created - 资源创建成功',
      400: 'Bad Request - 请求参数错误',
      404: 'Not Found - 资源不存在',
      500: 'Internal Server Error - 服务器内部错误'
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
