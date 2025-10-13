const OSS = require('ali-oss');
const path = require('path');
const crypto = require('crypto');

class OssService {
  constructor() {
    // 检查OSS配置是否完整
    const hasOssConfig = process.env.ALICLOUD_ACCESS_KEY_ID && 
                        process.env.ALICLOUD_ACCESS_KEY_SECRET && 
                        process.env.ALICLOUD_OSS_BUCKET;
    
    if (hasOssConfig) {
      this.client = new OSS({
        region: process.env.ALICLOUD_OSS_REGION || 'oss-cn-hangzhou',
        accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET,
        bucket: process.env.ALICLOUD_OSS_BUCKET
      });
      this.enabled = true;
    } else {
      console.warn('阿里云OSS配置不完整，文件上传功能将被禁用');
      this.client = null;
      this.enabled = false;
    }
  }

  // 生成唯一文件名
  generateFileName(originalName, userId, category) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const baseName = path.basename(originalName, ext);
    
    return `${category}/${userId}/${timestamp}-${random}-${baseName}${ext}`;
  }

  // 上传文件
  async uploadFile(file, options = {}) {
    try {
      if (!this.enabled) {
        return {
          success: false,
          message: '阿里云OSS未配置，文件上传功能不可用'
        };
      }
      
      const { userId, projectId, category = 'other' } = options;
      
      if (!file || !file.buffer) {
        return {
          success: false,
          message: '文件数据无效'
        };
      }

      // 生成文件名
      const fileName = this.generateFileName(file.originalname, userId, category);
      
      // 上传到OSS
      const result = await this.client.put(fileName, file.buffer, {
        headers: {
          'Content-Type': file.mimetype,
          'Cache-Control': 'public, max-age=31536000'
        }
      });

      return {
        success: true,
        url: result.url,
        key: fileName,
        name: result.name
      };
    } catch (error) {
      console.error('OSS上传文件错误:', error);
      return {
        success: false,
        message: '文件上传失败: ' + error.message
      };
    }
  }

  // 上传多个文件
  async uploadMultipleFiles(files, options = {}) {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, options));
      const results = await Promise.all(uploadPromises);
      
      const successResults = results.filter(result => result.success);
      const failedResults = results.filter(result => !result.success);
      
      return {
        success: failedResults.length === 0,
        successCount: successResults.length,
        failedCount: failedResults.length,
        results: successResults,
        errors: failedResults
      };
    } catch (error) {
      console.error('OSS批量上传文件错误:', error);
      return {
        success: false,
        message: '批量上传失败: ' + error.message
      };
    }
  }

  // 删除文件
  async deleteFile(fileName) {
    try {
      await this.client.delete(fileName);
      return {
        success: true,
        message: '文件删除成功'
      };
    } catch (error) {
      console.error('OSS删除文件错误:', error);
      return {
        success: false,
        message: '文件删除失败: ' + error.message
      };
    }
  }

  // 批量删除文件
  async deleteMultipleFiles(fileNames) {
    try {
      const result = await this.client.deleteMulti(fileNames);
      return {
        success: true,
        deleted: result.deleted,
        message: '批量删除成功'
      };
    } catch (error) {
      console.error('OSS批量删除文件错误:', error);
      return {
        success: false,
        message: '批量删除失败: ' + error.message
      };
    }
  }

  // 获取文件信息
  async getFileInfo(fileName) {
    try {
      const result = await this.client.head(fileName);
      return {
        success: true,
        data: {
          size: result.res.headers['content-length'],
          type: result.res.headers['content-type'],
          lastModified: result.res.headers['last-modified'],
          etag: result.res.headers.etag
        }
      };
    } catch (error) {
      console.error('OSS获取文件信息错误:', error);
      return {
        success: false,
        message: '获取文件信息失败: ' + error.message
      };
    }
  }

  // 生成签名URL（用于临时访问私有文件）
  async generateSignedUrl(fileName, expires = 3600) {
    try {
      const url = this.client.signatureUrl(fileName, {
        expires: expires
      });
      
      return {
        success: true,
        url: url
      };
    } catch (error) {
      console.error('OSS生成签名URL错误:', error);
      return {
        success: false,
        message: '生成签名URL失败: ' + error.message
      };
    }
  }

  // 检查文件是否存在
  async fileExists(fileName) {
    try {
      await this.client.head(fileName);
      return true;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  // 复制文件
  async copyFile(sourceFileName, targetFileName) {
    try {
      await this.client.copy(targetFileName, sourceFileName);
      return {
        success: true,
        message: '文件复制成功'
      };
    } catch (error) {
      console.error('OSS复制文件错误:', error);
      return {
        success: false,
        message: '文件复制失败: ' + error.message
      };
    }
  }

  // 获取存储桶信息
  async getBucketInfo() {
    try {
      const result = await this.client.getBucketInfo(this.bucketName);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('获取存储桶信息错误:', error);
      return {
        success: false,
        message: '获取存储桶信息失败'
      };
    }
  }

  // 根据URL删除文件
  async deleteFileByUrl(fileUrl) {
    try {
      // 从URL中提取文件key
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // 去掉开头的'/'
      
      return await this.deleteFile(key);
    } catch (error) {
      console.error('根据URL删除文件错误:', error);
      return {
        success: false,
        message: '根据URL删除文件失败'
      };
    }
  }
}

// 创建单例实例
const ossService = new OssService();

module.exports = { OssService: ossService };