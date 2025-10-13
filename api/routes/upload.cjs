const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth.cjs');
const { validateId } = require('../middleware/validation.cjs');
const { OssService } = require('../services/oss.cjs');
const { FileService } = require('../services/fileService.cjs');

const router = express.Router();

// 配置 multer 使用内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // 最多10个文件
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      // 图片
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // 文档
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // 压缩文件
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      // 其他
      'application/json',
      'text/xml',
      'application/xml'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  }
});

/**
 * @route POST /api/upload/single
 * @desc 单文件上传
 * @access Private
 */
router.post('/single', authenticate, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    const { project_id, task_id, category = 'other', description } = req.body;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }
    
    // 检查项目访问权限（如果指定了项目ID）
    if (project_id) {
      const hasAccess = await FileService.checkProjectAccess(userId, parseInt(project_id));
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: '没有权限访问该项目'
        });
      }
    }
    
    // 上传文件到OSS
    const uploadResult = await OssService.uploadFile(file, {
      userId,
      projectId: project_id ? parseInt(project_id) : null,
      category
    });
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.message || '文件上传失败'
      });
    }
    
    // 保存文件信息到数据库
    const fileData = {
      filename: file.originalname,
      file_path: uploadResult.url,
      file_size: file.size,
      mime_type: file.mimetype,
      uploader_id: userId,
      project_id: project_id ? parseInt(project_id) : null,
      task_id: task_id ? parseInt(task_id) : null,
      category,
      description: description || null
    };
    
    const saveResult = await FileService.saveFileInfo(fileData);
    
    if (saveResult.success) {
      res.status(201).json({
        success: true,
        message: '文件上传成功',
        data: {
          id: saveResult.data.id,
          filename: saveResult.data.filename,
          url: uploadResult.url,
          size: file.size,
          type: file.mimetype,
          category,
          uploaded_at: saveResult.data.created_at
        }
      });
    } else {
      // 如果数据库保存失败，尝试删除已上传的文件
      await OssService.deleteFile(uploadResult.key);
      
      res.status(500).json({
        success: false,
        message: '文件信息保存失败'
      });
    }
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

/**
 * @route POST /api/upload/multiple
 * @desc 多文件上传
 * @access Private
 */
router.post('/multiple', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;
    const { project_id, task_id, category = 'other', description } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }
    
    // 检查项目访问权限（如果指定了项目ID）
    if (project_id) {
      const hasAccess = await FileService.checkProjectAccess(userId, parseInt(project_id));
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: '没有权限访问该项目'
        });
      }
    }
    
    const uploadResults = [];
    const failedUploads = [];
    
    // 批量上传文件
    for (const file of files) {
      try {
        // 上传文件到OSS
        const uploadResult = await OssService.uploadFile(file, {
          userId,
          projectId: project_id ? parseInt(project_id) : null,
          category
        });
        
        if (uploadResult.success) {
          // 保存文件信息到数据库
          const fileData = {
            filename: file.originalname,
            file_path: uploadResult.url,
            file_size: file.size,
            mime_type: file.mimetype,
            uploader_id: userId,
            project_id: project_id ? parseInt(project_id) : null,
            task_id: task_id ? parseInt(task_id) : null,
            category,
            description: description || null
          };
          
          const saveResult = await FileService.saveFileInfo(fileData);
          
          if (saveResult.success) {
            uploadResults.push({
              id: saveResult.data.id,
              filename: saveResult.data.filename,
              url: uploadResult.url,
              size: file.size,
              type: file.mimetype,
              category,
              uploaded_at: saveResult.data.created_at
            });
          } else {
            // 如果数据库保存失败，删除已上传的文件
            await OssService.deleteFile(uploadResult.key);
            failedUploads.push({
              filename: file.originalname,
              error: '文件信息保存失败'
            });
          }
        } else {
          failedUploads.push({
            filename: file.originalname,
            error: uploadResult.message || '文件上传失败'
          });
        }
      } catch (error) {
        failedUploads.push({
          filename: file.originalname,
          error: error.message || '上传过程中发生错误'
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `成功上传 ${uploadResults.length} 个文件${failedUploads.length > 0 ? `，${failedUploads.length} 个文件上传失败` : ''}`,
      data: {
        uploaded: uploadResults,
        failed: failedUploads,
        total: files.length,
        success_count: uploadResults.length,
        failed_count: failedUploads.length
      }
    });
  } catch (error) {
    console.error('批量文件上传错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * @route GET /api/upload/files
 * @desc 获取文件列表
 * @access Private
 */
router.get('/files', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { project_id, task_id, category, page = 1, limit = 20 } = req.query;
    
    const result = await FileService.getFileList({
      userId,
      userRole,
      projectId: project_id ? parseInt(project_id) : null,
      taskId: task_id ? parseInt(task_id) : null,
      category,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      res.status(result.code || 400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;