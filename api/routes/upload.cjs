const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { validateFileUpload } = require('../middleware/validation.cjs');
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
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    const userId = 1; // 单用户系统，固定用户ID为1
    const file = req.file;
    const { project_id, task_id, category = 'other', description } = req.body;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }
    
    // 上传文件到OSS
    const uploadResult = await OssService.uploadFile(file, {
      userId,
      projectId: project_id ? parseInt(project_id) : null,
      category
    });
    
    // 保存文件记录到数据库
    const fileService = new FileService();
    const fileRecord = await fileService.createFileRecord({
      filename: file.originalname,
      file_path: uploadResult.url,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: userId,
      project_id: project_id ? parseInt(project_id) : null,
      task_id: task_id ? parseInt(task_id) : null,
      category,
      description
    });
    
    res.json({
      success: true,
      data: {
        file_id: fileRecord.id,
        filename: fileRecord.filename,
        url: fileRecord.file_path,
        size: fileRecord.file_size,
        type: fileRecord.mime_type,
        category: fileRecord.category,
        uploaded_at: fileRecord.created_at
      },
      message: '文件上传成功'
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '文件上传失败'
    });
  }
});

/**
 * @route POST /api/upload/multiple
 * @desc 多文件上传
 * @access Private
 */
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    const userId = 1; // 单用户系统，固定用户ID为1
    const files = req.files;
    const { project_id, task_id, category = 'other', description } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }
    
    const uploadResults = [];
    const fileService = new FileService();
    
    for (const file of files) {
      try {
        // 上传文件到OSS
        const uploadResult = await OssService.uploadFile(file, {
          userId,
          projectId: project_id ? parseInt(project_id) : null,
          category
        });
        
        // 保存文件记录到数据库
        const fileRecord = await fileService.createFileRecord({
          filename: file.originalname,
          file_path: uploadResult.url,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_by: userId,
          project_id: project_id ? parseInt(project_id) : null,
          task_id: task_id ? parseInt(task_id) : null,
          category,
          description
        });
        
        uploadResults.push({
          file_id: fileRecord.id,
          filename: fileRecord.filename,
          url: fileRecord.file_path,
          size: fileRecord.file_size,
          type: fileRecord.mime_type,
          category: fileRecord.category,
          uploaded_at: fileRecord.created_at
        });
      } catch (error) {
        console.error(`文件 ${file.originalname} 上传失败:`, error);
        uploadResults.push({
          filename: file.originalname,
          error: error.message || '上传失败'
        });
      }
    }
    
    res.json({
      success: true,
      data: uploadResults,
      message: `成功上传 ${uploadResults.filter(r => !r.error).length} 个文件`
    });
  } catch (error) {
    console.error('批量文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '批量文件上传失败'
    });
  }
});

/**
 * @route GET /api/upload/files
 * @desc 获取文件列表
 * @access Private
 */
router.get('/files', async (req, res) => {
  try {
    const userId = 1; // 单用户系统，固定用户ID为1
    const { project_id, task_id, category, page = 1, limit = 20 } = req.query;
    
    const fileService = new FileService();
    const files = await fileService.getFiles({
      userId,
      projectId: project_id ? parseInt(project_id) : null,
      taskId: task_id ? parseInt(task_id) : null,
      category,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取文件列表失败'
    });
  }
});

/**
 * @route DELETE /api/upload/files/:id
 * @desc 删除文件
 * @access Private
 */
router.delete('/files/:id', async (req, res) => {
  try {
    const userId = 1; // 单用户系统，固定用户ID为1
    const fileId = parseInt(req.params.id);
    
    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: '无效的文件ID'
      });
    }
    
    const fileService = new FileService();
    
    // 获取文件信息
    const file = await fileService.getFileById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }
    
    // 删除OSS文件
    try {
      await OssService.deleteFile(file.file_path);
    } catch (error) {
      console.error('删除OSS文件失败:', error);
      // 继续删除数据库记录，即使OSS删除失败
    }
    
    // 删除数据库记录
    await fileService.deleteFile(fileId, userId);
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除文件失败'
    });
  }
});

/**
 * @route GET /api/upload/files/:id/download
 * @desc 下载文件
 * @access Private
 */
router.get('/files/:id/download', async (req, res) => {
  try {
    const userId = 1; // 单用户系统，固定用户ID为1
    const fileId = parseInt(req.params.id);
    
    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        message: '无效的文件ID'
      });
    }
    
    const fileService = new FileService();
    
    // 获取文件信息
    const file = await fileService.getFileById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }
    
    // 生成下载链接
    const downloadUrl = await OssService.getDownloadUrl(file.file_path);
    
    // 记录下载日志
    await fileService.logDownload(fileId, userId);
    
    res.json({
      success: true,
      data: {
        download_url: downloadUrl,
        filename: file.filename,
        size: file.file_size
      }
    });
  } catch (error) {
    console.error('获取下载链接失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取下载链接失败'
    });
  }
});

module.exports = router;